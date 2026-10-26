import Dexie, { Table } from 'dexie';
import {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  WorkoutSet,
  BodyMetric,
  BackupPayload,
  WeightUnit,
} from '../types/fitness';
import {
  INITIAL_EXERCISES,
  INITIAL_ROUTINES,
  INITIAL_SESSIONS,
  INITIAL_SETS,
  INITIAL_BODY_METRICS,
} from './seedData';
import { convertWeight, estimate1RMKg } from '../utils/fitnessUtils';

export class FitnessDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  routines!: Table<Routine, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  workoutSets!: Table<WorkoutSet, string>;
  bodyMetrics!: Table<BodyMetric, string>;

  constructor() {
    super('FitnessTrackerDB');
    this.version(1).stores({
      exercises: 'id, name, primaryMuscle, equipment, isCustom',
      routines: 'id, name, splitType, dayOfWeek, isBuiltin',
      workoutSessions: 'id, routineId, startTime, isFinished',
      workoutSets: 'id, sessionId, exerciseId, isCompleted, isPR',
      bodyMetrics: 'id, date',
    });
  }
}

export const db = new FitnessDatabase();

const SEED_VERSION_KEY = 'fitness_tracker_seed_v2_real_logs';
let seedPromise: Promise<void> | null = null;

/**
 * 初始化预置动作库、专属分化模板及 35 场真实训练日志（支持从旧版 Demo 数据平滑升级）
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const isV2Seeded =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(SEED_VERSION_KEY) === 'true';
    const count = await db.exercises.count();

    if (count === 0 || !isV2Seeded) {
      await db.transaction(
        'rw',
        [db.exercises, db.routines, db.workoutSessions, db.workoutSets, db.bodyMetrics],
        async () => {
          // 清理旧版虚拟 Demo 会话与内置旧模板
          const oldDemoSessionIds = ['session_demo_1', 'session_demo_2', 'session_demo_3', 'session_demo_4'];
          await db.workoutSessions.bulkDelete(oldDemoSessionIds);
          await db.workoutSets.where('sessionId').anyOf(oldDemoSessionIds).delete();

          const oldBuiltinRoutineIds = [
            'routine_ppl_push',
            'routine_ppl_pull',
            'routine_ppl_legs',
            'routine_ul_upper',
            'routine_ul_lower',
            'routine_fullbody',
          ];
          await db.routines.bulkDelete(oldBuiltinRoutineIds);

          // 写入最新真实动作库、5 套专属分化计划、35 场真实训练记录
          await db.exercises.bulkPut(INITIAL_EXERCISES);
          await db.routines.bulkPut(INITIAL_ROUTINES);
          await db.workoutSessions.bulkPut(INITIAL_SESSIONS);
          await db.workoutSets.bulkPut(INITIAL_SETS);

          const bmCount = await db.bodyMetrics.count();
          if (bmCount === 0) {
            await db.bodyMetrics.bulkPut(INITIAL_BODY_METRICS);
          }
        }
      );

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SEED_VERSION_KEY, 'true');
      }
    }
  })();
  return seedPromise;
}

/**
 * 校验某动作的新完成组是否打破历史最高估算 1RM (PR 判定)
 */
export async function checkProgressiveOverloadPR(
  exerciseId: string,
  weight: number,
  reps: number,
  unit: WeightUnit,
  excludeSetId?: string
): Promise<boolean> {
  if (weight <= 0 || reps <= 0) return false;
  const current1RMKg = estimate1RMKg(weight, reps, unit);
  const historicalSets = await db.workoutSets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.isCompleted && !s.isSkipped && s.id !== excludeSetId)
    .toArray();

  if (historicalSets.length === 0) {
    return true;
  }

  let maxHistorical1RMKg = 0;
  for (const s of historicalSets) {
    const est = estimate1RMKg(s.weight, s.reps, s.unit);
    if (est > maxHistorical1RMKg) {
      maxHistorical1RMKg = est;
    }
  }
  return current1RMKg > maxHistorical1RMKg + 0.05;
}

/**
 * 查询某个动作上一次已完成训练会话中的组数据及动作便签
 */
export async function getLastPerformanceForExercise(
  exerciseId: string,
  currentSessionId: string
): Promise<{ sets: WorkoutSet[]; lastNote?: string }> {
  const allSets = await db.workoutSets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.sessionId !== currentSessionId && s.isCompleted && !s.isSkipped)
    .toArray();

  if (allSets.length === 0) return { sets: [] };

  const sessionIds = Array.from(new Set(allSets.map((s) => s.sessionId)));
  const sessions = await db.workoutSessions.bulkGet(sessionIds);
  const validSessions = sessions
    .filter((s): s is WorkoutSession => Boolean(s && s.isFinished))
    .sort((a, b) => b.startTime - a.startTime);

  if (validSessions.length === 0) return { sets: [] };

  const latestSession = validSessions[0];
  const latestSets = allSets
    .filter((s) => s.sessionId === latestSession.id)
    .sort((a, b) => a.setOrder - b.setOrder);

  return {
    sets: latestSets,
    lastNote: latestSession.exerciseNotes?.[exerciseId],
  };
}

/**
 * 按指定计划模板启动新训练会话（自动继承各动作上次每组的真实重量）
 */
export async function startWorkoutFromRoutine(routine: Routine): Promise<string> {
  // 先清理任何未完成的旧会话
  const activeSessions = await db.workoutSessions.filter((s) => !s.isFinished).toArray();
  for (const old of activeSessions) {
    await db.workoutSets.where('sessionId').equals(old.id).delete();
    await db.workoutSessions.delete(old.id);
  }

  const allExercises = await db.exercises.toArray();
  const exerciseMap = new Map<string, Exercise>();
  allExercises.forEach((e) => exerciseMap.set(e.id, e));

  const sessionId = `ws_${Date.now()}`;
  const exerciseOrder = routine.exercises.map((item) => item.exerciseId);
  const newSets: WorkoutSet[] = [];

  for (const item of routine.exercises) {
    const ex = exerciseMap.get(item.exerciseId);
    const unit: WeightUnit = ex?.defaultUnit || item.targetUnit || 'lb';
    const lastPerf = await getLastPerformanceForExercise(item.exerciseId, sessionId);

    for (let i = 1; i <= item.targetSets; i++) {
      const prevSet =
        lastPerf.sets[i - 1] || lastPerf.sets[lastPerf.sets.length - 1];
      const defaultWeight = prevSet
        ? convertWeight(prevSet.weight, prevSet.unit, unit)
        : ex?.equipment === 'bodyweight' || ex?.equipment === 'band'
        ? 0
        : unit === 'lb'
        ? 25
        : 20;
      const defaultReps = item.targetReps || (prevSet ? prevSet.reps : 12);

      newSets.push({
        id: `set_${sessionId}_${item.exerciseId}_${i}_${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        sessionId,
        exerciseId: item.exerciseId,
        setOrder: i,
        setType: prevSet?.setType === 'warmup' && i <= 2 ? 'warmup' : 'normal',
        weight: defaultWeight,
        unit,
        reps: defaultReps,
        isCompleted: false,
      });
    }
  }

  const newSession: WorkoutSession = {
    id: sessionId,
    name: routine.name,
    routineId: routine.id,
    startTime: Date.now(),
    durationSeconds: 0,
    totalVolumeKg: 0,
    exerciseOrder,
    isFinished: false,
    createdAt: Date.now(),
  };

  await db.transaction('rw', [db.workoutSessions, db.workoutSets], async () => {
    await db.workoutSessions.put(newSession);
    if (newSets.length > 0) await db.workoutSets.bulkPut(newSets);
  });

  return sessionId;
}

/**
 * 检测本次训练会话的动作列表或各动作组数是否与原关联计划模板存在差异
 */
export function hasRoutineDiff(
  session: WorkoutSession,
  sets: WorkoutSet[],
  routine?: Routine
): boolean {
  if (!routine) return false;
  if (session.exerciseOrder.length !== routine.exercises.length) return true;

  for (let i = 0; i < session.exerciseOrder.length; i++) {
    const exId = session.exerciseOrder[i];
    const rEx = routine.exercises[i];
    if (!rEx || rEx.exerciseId !== exId) return true;

    const exSets = sets.filter((s) => s.exerciseId === exId && !s.isSkipped);
    const completedSets = exSets.filter((s) => s.isCompleted);
    const effectiveCount = completedSets.length > 0 ? completedSets.length : exSets.length;
    if (effectiveCount > 0 && effectiveCount !== rEx.targetSets) return true;
  }

  return false;
}

/**
 * 将本次训练会话的动作顺序与组数同步回原计划模板
 */
export async function syncSessionToRoutine(
  session: WorkoutSession,
  sets: WorkoutSet[],
  routine: Routine
): Promise<void> {
  const existingMap = new Map<string, RoutineExercise>();
  routine.exercises.forEach((item) => existingMap.set(item.exerciseId, item));

  const nextExercises: RoutineExercise[] = [];
  for (const exId of session.exerciseOrder) {
    const exSets = sets
      .filter((s) => s.exerciseId === exId && !s.isSkipped)
      .sort((a, b) => a.setOrder - b.setOrder);
    const completedSets = exSets.filter((s) => s.isCompleted);
    const activeSets = completedSets.length > 0 ? completedSets : exSets;
    if (activeSets.length === 0) continue;

    const prev = existingMap.get(exId);
    const refSet = activeSets[activeSets.length - 1];

    nextExercises.push({
      exerciseId: exId,
      targetSets: activeSets.length,
      targetReps: refSet.reps || prev?.targetReps || 12,
      targetUnit: refSet.unit || prev?.targetUnit || 'lb',
      restSeconds: prev?.restSeconds || 90,
      notes: session.exerciseNotes?.[exId] || prev?.notes,
    });
  }

  if (nextExercises.length > 0) {
    await db.routines.update(routine.id, { exercises: nextExercises });
  }
}

/**
 * 导出全量 JSON 备份快照
 */
export async function exportFullBackupJson(): Promise<BackupPayload> {
  const [exercises, routines, workoutSessions, workoutSets, bodyMetrics] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.workoutSessions.toArray(),
    db.workoutSets.toArray(),
    db.bodyMetrics.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: Date.now(),
    appName: 'FitnessTracker',
    data: {
      exercises,
      routines,
      workoutSessions,
      workoutSets,
      bodyMetrics,
    },
  };
}

/**
 * 导入恢复 JSON 备份数据
 */
export async function importBackupJson(
  payload: BackupPayload,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ importedExercises: number; importedSessions: number; importedMetrics: number }> {
  if (!payload || payload.appName !== 'FitnessTracker' || !payload.data) {
    throw new Error('无效的备份文件格式：缺少 FitnessTracker 标识或数据体');
  }

  const { exercises = [], routines = [], workoutSessions = [], workoutSets = [], bodyMetrics = [] } = payload.data;

  await db.transaction(
    'rw',
    [db.exercises, db.routines, db.workoutSessions, db.workoutSets, db.bodyMetrics],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.exercises.clear(),
          db.routines.clear(),
          db.workoutSessions.clear(),
          db.workoutSets.clear(),
          db.bodyMetrics.clear(),
        ]);
      }
      if (exercises.length > 0) await db.exercises.bulkPut(exercises);
      if (routines.length > 0) await db.routines.bulkPut(routines);
      if (workoutSessions.length > 0) await db.workoutSessions.bulkPut(workoutSessions);
      if (workoutSets.length > 0) await db.workoutSets.bulkPut(workoutSets);
      if (bodyMetrics.length > 0) await db.bodyMetrics.bulkPut(bodyMetrics);
    }
  );

  return {
    importedExercises: exercises.length,
    importedSessions: workoutSessions.length,
    importedMetrics: bodyMetrics.length,
  };
}

/**
 * 重置为出厂预置数据（恢复 35 场真实训练日志与 5 套专属计划）
 */
export async function resetToFactoryDefaults(): Promise<void> {
  await db.transaction(
    'rw',
    [db.exercises, db.routines, db.workoutSessions, db.workoutSets, db.bodyMetrics],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.routines.clear(),
        db.workoutSessions.clear(),
        db.workoutSets.clear(),
        db.bodyMetrics.clear(),
      ]);
      await db.exercises.bulkPut(INITIAL_EXERCISES);
      await db.routines.bulkPut(INITIAL_ROUTINES);
      await db.workoutSessions.bulkPut(INITIAL_SESSIONS);
      await db.workoutSets.bulkPut(INITIAL_SETS);
      await db.bodyMetrics.bulkPut(INITIAL_BODY_METRICS);
    }
  );
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SEED_VERSION_KEY, 'true');
  }
}
