import Dexie, { Table } from 'dexie';
import {
  Exercise,
  Routine,
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
import { estimate1RMKg } from '../utils/fitnessUtils';

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

let seedPromise: Promise<void> | null = null;

/**
 * 初始化预置动作库、经典分化模板及初始演示记录
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const count = await db.exercises.count();
    if (count === 0) {
      await db.transaction(
        'rw',
        [db.exercises, db.routines, db.workoutSessions, db.workoutSets, db.bodyMetrics],
        async () => {
          await db.exercises.bulkPut(INITIAL_EXERCISES);
          await db.routines.bulkPut(INITIAL_ROUTINES);
          await db.workoutSessions.bulkPut(INITIAL_SESSIONS);
          await db.workoutSets.bulkPut(INITIAL_SETS);
          await db.bodyMetrics.bulkPut(INITIAL_BODY_METRICS);
        }
      );
    } else {
      // 确保所有 32 个预置动作都存在（不覆盖用户已修改的 defaultUnit）
      const existingIds = new Set(await db.exercises.toCollection().primaryKeys());
      const missingExercises = INITIAL_EXERCISES.filter((ex) => !existingIds.has(ex.id));
      if (missingExercises.length > 0) {
        await db.exercises.bulkPut(missingExercises);
      }
      const routineCount = await db.routines.count();
      if (routineCount === 0) {
        await db.routines.bulkPut(INITIAL_ROUTINES);
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

  // 找到最近一次已完成会话
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
 * 导入恢复 JSON 备份数据（支持 merge 合并或 replace 全量覆盖）
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
 * 重置为出厂预置数据（带二次确认保护）
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
}
