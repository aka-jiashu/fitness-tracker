import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Play,
  Plus,
  Check,
  Trash2,
  Trophy,
  Dumbbell,
  Clock,
  Flame,
  Sun,
  Slash,
  StickyNote,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  X,
  RotateCcw,
  Layers,
} from 'lucide-react';
import {
  db,
  checkProgressiveOverloadPR,
  getLastPerformanceForExercise,
} from '../db/database';
import {
  Exercise,
  Routine,
  WorkoutSession,
  WorkoutSet,
  WeightUnit,
  SetType,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
  SET_TYPE_META,
} from '../types/fitness';
import {
  calculateSessionVolumeKg,
  convertWeight,
  formatDuration,
  estimate1RM,
} from '../utils/fitnessUtils';
import {
  requestKeepScreenOn,
  releaseKeepScreenOn,
  playSetCheckSound,
  triggerCelebrationConfetti,
} from '../utils/deviceHardware';

interface ActiveWorkoutTabProps {
  onStartRestTimer: (seconds: number, exerciseName: string) => void;
  onNavigateToRoutines: () => void;
}

const SET_TYPES_ORDER: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

export const ActiveWorkoutTab: React.FC<ActiveWorkoutTabProps> = ({
  onStartRestTimer,
  onNavigateToRoutines,
}) => {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const routines = useLiveQuery(() => db.routines.toArray(), []) || [];
  const activeSessions = useLiveQuery(
    () => db.workoutSessions.filter((s) => !s.isFinished).toArray(),
    []
  );
  const recentSessions = useLiveQuery(
    () =>
      db.workoutSessions
        .filter((s) => s.isFinished)
        .reverse()
        .sortBy('startTime'),
    []
  );

  const activeSession: WorkoutSession | undefined = activeSessions?.[0];

  const activeSets = useLiveQuery(
    () =>
      activeSession
        ? db.workoutSets.where('sessionId').equals(activeSession.id).toArray()
        : Promise.resolve([] as WorkoutSet[]),
    [activeSession?.id]
  ) || [];

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    exercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [exercises]);

  // Live timer for active session
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [activeSetForStepper, setActiveSetForStepper] = useState<string | null>(null);
  const [ipadViewMode, setIpadViewMode] = useState<'split' | 'stream'>('split');

  // Modals
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [sessionFeelingInput, setSessionFeelingInput] = useState('');
  const [searchExerciseQuery, setSearchExerciseQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string>('all');

  // Last session performance cache per exerciseId
  const [lastPerfMap, setLastPerfMap] = useState<
    Record<string, { sets: WorkoutSet[]; lastNote?: string }>
  >({});

  // Sync elapsed clock and WakeLock when activeSession is running
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      releaseKeepScreenOn();
      setWakeLockActive(false);
      return;
    }

    setSessionFeelingInput(activeSession.feelingNotes || '');
    if (
      activeSession.exerciseOrder.length > 0 &&
      (!selectedExerciseId || !activeSession.exerciseOrder.includes(selectedExerciseId))
    ) {
      setSelectedExerciseId(activeSession.exerciseOrder[0]);
    }

    // Activate Screen WakeLock
    requestKeepScreenOn().then((ok) => setWakeLockActive(ok));

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - activeSession.startTime) / 1000));
      setElapsedSeconds(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.id, activeSession?.startTime]);

  // Load last performance for exercises in current session
  useEffect(() => {
    if (!activeSession) return;
    let mounted = true;
    (async () => {
      const nextMap: Record<string, { sets: WorkoutSet[]; lastNote?: string }> = {};
      for (const exId of activeSession.exerciseOrder) {
        nextMap[exId] = await getLastPerformanceForExercise(exId, activeSession.id);
      }
      if (mounted) setLastPerfMap(nextMap);
    })();
    return () => {
      mounted = false;
    };
  }, [activeSession?.id, activeSession?.exerciseOrder.join(',')]);

  // Calculate live session total volume
  const liveVolumeKg = useMemo(() => calculateSessionVolumeKg(activeSets), [activeSets]);
  const completedSetsCount = useMemo(
    () => activeSets.filter((s) => s.isCompleted && !s.isSkipped).length,
    [activeSets]
  );
  const prSetsInSession = useMemo(
    () => activeSets.filter((s) => s.isCompleted && s.isPR),
    [activeSets]
  );

  // Start workout from a Routine or Free Empty Workout
  const handleStartWorkout = async (routine?: Routine) => {
    const sessionId = `session_${Date.now()}`;
    const now = Date.now();

    if (!routine) {
      // Free workout: pre-populate with 1st popular exercise or empty
      const defaultEx = exercises[0];
      const exOrder = defaultEx ? [defaultEx.id] : [];
      const newSession: WorkoutSession = {
        id: sessionId,
        name: '自由力量训练',
        startTime: now,
        durationSeconds: 0,
        totalVolumeKg: 0,
        feelingNotes: '',
        exerciseNotes: {},
        exerciseOrder: exOrder,
        isFinished: false,
        createdAt: now,
      };
      await db.workoutSessions.put(newSession);
      if (defaultEx) {
        const lastPerf = await getLastPerformanceForExercise(defaultEx.id, sessionId);
        const defaultWeight = lastPerf.sets[0]?.weight ?? (defaultEx.defaultUnit === 'lb' ? 30 : 20);
        const initialSets: WorkoutSet[] = [1, 2, 3].map((order) => ({
          id: `set_${sessionId}_${defaultEx.id}_${order}_${Math.random().toString(36).slice(2, 6)}`,
          sessionId,
          exerciseId: defaultEx.id,
          setOrder: order,
          setType: order === 1 ? 'warmup' : 'normal',
          weight: lastPerf.sets[order - 1]?.weight ?? defaultWeight,
          unit: defaultEx.defaultUnit,
          reps: lastPerf.sets[order - 1]?.reps ?? 12,
          isCompleted: false,
          isSkipped: false,
        }));
        await db.workoutSets.bulkPut(initialSets);
        setSelectedExerciseId(defaultEx.id);
      }
      return;
    }

    const exOrder = routine.exercises.map((re) => re.exerciseId);
    const newSession: WorkoutSession = {
      id: sessionId,
      name: routine.name,
      routineId: routine.id,
      startTime: now,
      durationSeconds: 0,
      totalVolumeKg: 0,
      feelingNotes: '',
      exerciseNotes: {},
      exerciseOrder: exOrder,
      isFinished: false,
      createdAt: now,
    };

    const setsToInsert: WorkoutSet[] = [];
    for (const re of routine.exercises) {
      const ex = exerciseMap.get(re.exerciseId);
      const preferredUnit = ex?.defaultUnit || re.targetUnit;
      const lastPerf = await getLastPerformanceForExercise(re.exerciseId, sessionId);

      for (let i = 1; i <= re.targetSets; i++) {
        const prevSet = lastPerf.sets[i - 1] || lastPerf.sets[lastPerf.sets.length - 1];
        let initialWeight = prevSet ? prevSet.weight : preferredUnit === 'lb' ? 35 : 30;
        if (prevSet && prevSet.unit !== preferredUnit) {
          initialWeight = convertWeight(prevSet.weight, prevSet.unit, preferredUnit);
        }
        if (ex?.equipment === 'bodyweight') {
          initialWeight = 0;
        }
        setsToInsert.push({
          id: `set_${sessionId}_${re.exerciseId}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          sessionId,
          exerciseId: re.exerciseId,
          setOrder: i,
          setType: i === 1 && re.targetSets >= 4 ? 'warmup' : 'normal',
          weight: initialWeight,
          unit: preferredUnit,
          reps: prevSet?.reps ?? re.targetReps,
          isCompleted: false,
          isSkipped: false,
        });
      }
    }

    await db.transaction('rw', [db.workoutSessions, db.workoutSets], async () => {
      await db.workoutSessions.put(newSession);
      await db.workoutSets.bulkPut(setsToInsert);
    });
    if (exOrder.length > 0) {
      setSelectedExerciseId(exOrder[0]);
    }
  };

  // Toggle unit (kg <-> lb) for an exercise and persist defaultUnit
  const handleToggleExerciseUnit = async (exercise: Exercise) => {
    if (!activeSession) return;
    const nextUnit: WeightUnit = exercise.defaultUnit === 'kg' ? 'lb' : 'kg';
    await db.exercises.update(exercise.id, { defaultUnit: nextUnit });

    // Convert uncompleted sets in current session to the new unit
    const exSets = activeSets.filter((s) => s.exerciseId === exercise.id);
    await Promise.all(
      exSets.map((s) => {
        const converted = convertWeight(s.weight, s.unit, nextUnit);
        return db.workoutSets.update(s.id, {
          unit: nextUnit,
          weight: converted,
        });
      })
    );
  };

  // Cycle SetType (normal -> warmup -> drop -> failure)
  const handleCycleSetType = async (set: WorkoutSet) => {
    const idx = SET_TYPES_ORDER.indexOf(set.setType);
    const nextType = SET_TYPES_ORDER[(idx + 1) % SET_TYPES_ORDER.length];
    await db.workoutSets.update(set.id, { setType: nextType });
  };

  // Update weight or reps
  const handleUpdateSetField = async (
    set: WorkoutSet,
    field: 'weight' | 'reps',
    value: number
  ) => {
    const safeVal = field === 'weight' ? Math.max(0, Math.round(value * 10) / 10) : Math.max(0, Math.round(value));
    await db.workoutSets.update(set.id, { [field]: safeVal });
  };

  // Toggle complete checkbox on a set
  const handleToggleSetComplete = async (set: WorkoutSet, exercise: Exercise) => {
    const nextCompleted = !set.isCompleted;
    let isPR = false;

    if (nextCompleted) {
      isPR = await checkProgressiveOverloadPR(
        exercise.id,
        set.weight,
        set.reps,
        set.unit,
        set.id
      );
      playSetCheckSound();
      if (isPR) {
        triggerCelebrationConfetti(false);
      }
      // Find recommended rest time from routine or default 90s
      let restSec = 90;
      if (activeSession?.routineId) {
        const r = routines.find((rt) => rt.id === activeSession.routineId);
        const re = r?.exercises.find((item) => item.exerciseId === exercise.id);
        if (re?.restSeconds) restSec = re.restSeconds;
      }
      onStartRestTimer(restSec, exercise.name);
    }

    await db.workoutSets.update(set.id, {
      isCompleted: nextCompleted,
      isSkipped: false,
      isPR: nextCompleted ? isPR : false,
      completedAt: nextCompleted ? Date.now() : undefined,
    });
  };

  // Toggle Skip ("划掉跳过")
  const handleToggleSetSkip = async (set: WorkoutSet) => {
    const nextSkipped = !set.isSkipped;
    await db.workoutSets.update(set.id, {
      isSkipped: nextSkipped,
      isCompleted: false,
      isPR: false,
    });
  };

  // Add a set to an exercise
  const handleAddSet = async (exercise: Exercise) => {
    if (!activeSession) return;
    const exSets = activeSets
      .filter((s) => s.exerciseId === exercise.id)
      .sort((a, b) => a.setOrder - b.setOrder);
    const lastSet = exSets[exSets.length - 1];
    const nextOrder = exSets.length + 1;

    const newSet: WorkoutSet = {
      id: `set_${activeSession.id}_${exercise.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      sessionId: activeSession.id,
      exerciseId: exercise.id,
      setOrder: nextOrder,
      setType: 'normal',
      weight: lastSet ? lastSet.weight : exercise.defaultUnit === 'lb' ? 35 : 25,
      unit: lastSet ? lastSet.unit : exercise.defaultUnit,
      reps: lastSet ? lastSet.reps : 10,
      isCompleted: false,
      isSkipped: false,
    };
    await db.workoutSets.put(newSet);
    setActiveSetForStepper(newSet.id);
  };

  // Delete a set
  const handleDeleteSet = async (set: WorkoutSet) => {
    await db.workoutSets.delete(set.id);
    // Re-number remaining sets for this exercise
    const remaining = activeSets
      .filter((s) => s.exerciseId === set.exerciseId && s.id !== set.id)
      .sort((a, b) => a.setOrder - b.setOrder);
    await Promise.all(
      remaining.map((s, idx) => db.workoutSets.update(s.id, { setOrder: idx + 1 }))
    );
  };

  // Save per-exercise quick feeling note
  const handleSaveExerciseNote = async (exerciseId: string, note: string) => {
    if (!activeSession) return;
    const nextNotes = { ...(activeSession.exerciseNotes || {}), [exerciseId]: note };
    await db.workoutSessions.update(activeSession.id, { exerciseNotes: nextNotes });
  };

  // Add another exercise to active session
  const handleAddExerciseToSession = async (exercise: Exercise) => {
    if (!activeSession) return;
    if (!activeSession.exerciseOrder.includes(exercise.id)) {
      const nextOrder = [...activeSession.exerciseOrder, exercise.id];
      await db.workoutSessions.update(activeSession.id, { exerciseOrder: nextOrder });

      const lastPerf = await getLastPerformanceForExercise(exercise.id, activeSession.id);
      const defaultW = lastPerf.sets[0]?.weight ?? (exercise.defaultUnit === 'lb' ? 30 : 20);
      const sets: WorkoutSet[] = [1, 2, 3].map((order) => ({
        id: `set_${activeSession.id}_${exercise.id}_${order}_${Math.random().toString(36).slice(2, 6)}`,
        sessionId: activeSession.id,
        exerciseId: exercise.id,
        setOrder: order,
        setType: 'normal',
        weight: lastPerf.sets[order - 1]?.weight ?? defaultW,
        unit: exercise.defaultUnit,
        reps: lastPerf.sets[order - 1]?.reps ?? 12,
        isCompleted: false,
        isSkipped: false,
      }));
      await db.workoutSets.bulkPut(sets);
    }
    setSelectedExerciseId(exercise.id);
    setShowAddExerciseModal(false);
  };

  // Finish & Save Workout Session
  const handleConfirmFinishWorkout = async () => {
    if (!activeSession) return;
    const endTime = Date.now();
    const durationSeconds = Math.max(
      60,
      Math.floor((endTime - activeSession.startTime) / 1000)
    );
    const totalVolumeKg = calculateSessionVolumeKg(activeSets);

    await db.workoutSessions.update(activeSession.id, {
      endTime,
      durationSeconds,
      totalVolumeKg,
      feelingNotes: sessionFeelingInput.trim() || '按计划高效完成训练！',
      isFinished: true,
    });

    releaseKeepScreenOn();
    setWakeLockActive(false);
    setShowFinishModal(false);
    triggerCelebrationConfetti(true);
  };

  // Cancel / Discard active workout (with secondary confirmation)
  const handleDiscardWorkout = async () => {
    if (!activeSession) return;
    await db.transaction('rw', [db.workoutSessions, db.workoutSets], async () => {
      await db.workoutSets.where('sessionId').equals(activeSession.id).delete();
      await db.workoutSessions.delete(activeSession.id);
    });
    releaseKeepScreenOn();
    setWakeLockActive(false);
    setShowCancelConfirm(false);
  };

  // Render single Exercise Card
  const renderExerciseCard = (exerciseId: string, index: number) => {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise || !activeSession) return null;

    const exSets = activeSets
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.setOrder - b.setOrder);
    const lastPerf = lastPerfMap[exerciseId];
    const currentNote = activeSession.exerciseNotes?.[exerciseId] ?? '';
    const completedCount = exSets.filter((s) => s.isCompleted).length;

    return (
      <div
        key={exercise.id}
        className="rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl overflow-hidden transition-all"
      >
        {/* Card Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base md:text-lg font-bold text-white truncate">
                  {exercise.name}
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {MUSCLE_LABELS[exercise.primaryMuscle]}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300">
                  {EQUIPMENT_LABELS[exercise.equipment]}
                </span>
              </div>
              {lastPerf?.lastNote && (
                <p className="text-xs text-cyan-400/90 mt-0.5 truncate">
                  上次心得: “{lastPerf.lastNote}”
                </p>
              )}
            </div>
          </div>

          {/* Unit one-click switcher (kg / lb) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleExerciseUnit(exercise)}
              className="touch-target px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              title="点击切换该动作默认单位 (自动记忆)"
            >
              <span
                className={
                  exercise.defaultUnit === 'lb' ? 'text-cyan-400 font-extrabold' : 'text-slate-400'
                }
              >
                LB
              </span>
              <span className="text-slate-600">/</span>
              <span
                className={
                  exercise.defaultUnit === 'kg'
                    ? 'text-emerald-400 font-extrabold'
                    : 'text-slate-400'
                }
              >
                KG
              </span>
            </button>
            <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg">
              {completedCount}/{exSets.length} 组
            </span>
          </div>
        </div>

        {/* Sets Table */}
        <div className="p-3 md:p-4 space-y-2.5">
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
            <div className="col-span-2">组序/类型</div>
            <div className="col-span-3">上次成绩</div>
            <div className="col-span-3 text-center">重量 ({exercise.defaultUnit})</div>
            <div className="col-span-2 text-center">次数</div>
            <div className="col-span-2 text-right">完成/操作</div>
          </div>

          {exSets.map((set, idx) => {
            const typeMeta = SET_TYPE_META[set.setType];
            const prevSet = lastPerf?.sets[idx] || lastPerf?.sets[lastPerf.sets.length - 1];
            const isStepperOpen = activeSetForStepper === set.id;

            return (
              <div
                key={set.id}
                className={`rounded-xl border transition-all p-2 ${
                  set.isSkipped
                    ? 'bg-slate-900/40 border-slate-800/50 opacity-50'
                    : set.isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : isStepperOpen
                    ? 'bg-slate-800/90 border-cyan-500/50'
                    : 'bg-slate-800/40 border-slate-800'
                }`}
              >
                <div className="grid grid-cols-12 gap-1.5 items-center">
                  {/* Col 1: Set Order & Type toggle */}
                  <div className="col-span-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCycleSetType(set)}
                      className={`touch-target px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 ${typeMeta.color}`}
                      title={`当前：${typeMeta.label}（点击切换热身/正式/递减/力竭组）`}
                    >
                      <span>#{set.setOrder}</span>
                      <span className="text-[10px] opacity-90">{typeMeta.short}</span>
                    </button>
                  </div>

                  {/* Col 2: Last Performance Reference (semi-transparent) */}
                  <div className="col-span-3 text-xs text-slate-400/75 font-mono truncate">
                    {prevSet ? (
                      <button
                        type="button"
                        onClick={() => {
                          const targetW =
                            prevSet.unit === set.unit
                              ? prevSet.weight
                              : convertWeight(prevSet.weight, prevSet.unit, set.unit);
                          handleUpdateSetField(set, 'weight', targetW);
                          handleUpdateSetField(set, 'reps', prevSet.reps);
                        }}
                        className="hover:text-cyan-300 transition text-left"
                        title="点击一键带入上次数据"
                      >
                        {prevSet.weight}
                        {prevSet.unit} × {prevSet.reps}
                      </button>
                    ) : (
                      <span className="text-slate-600">首次记录</span>
                    )}
                    {set.isPR && (
                      <span className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                        <Trophy className="w-2.5 h-2.5" /> PR
                      </span>
                    )}
                  </div>

                  {/* Col 3: Weight Input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.5"
                      disabled={set.isSkipped}
                      value={set.weight}
                      onFocus={() => setActiveSetForStepper(set.id)}
                      onChange={(e) =>
                        handleUpdateSetField(set, 'weight', parseFloat(e.target.value) || 0)
                      }
                      aria-label={`第 ${set.setOrder} 组重量 (${set.unit})`}
                      className={`w-full touch-target text-center font-mono text-base font-bold rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none px-1 ${
                        set.isSkipped ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    />
                  </div>

                  {/* Col 4: Reps Input */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="1"
                      disabled={set.isSkipped}
                      value={set.reps}
                      onFocus={() => setActiveSetForStepper(set.id)}
                      onChange={(e) =>
                        handleUpdateSetField(set, 'reps', parseInt(e.target.value, 10) || 0)
                      }
                      aria-label={`第 ${set.setOrder} 组次数`}
                      className={`w-full touch-target text-center font-mono text-base font-bold rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none px-1 ${
                        set.isSkipped ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    />
                  </div>

                  {/* Col 5: Check Complete + Skip/More */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={set.isSkipped}
                      onClick={() => handleToggleSetComplete(set, exercise)}
                      aria-label={`完成第 ${set.setOrder} 组`}
                      className={`touch-target w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-90 ${
                        set.isCompleted
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSetForStepper(isStepperOpen ? null : set.id)
                      }
                      className={`touch-target w-9 h-11 rounded-xl flex items-center justify-center text-xs font-bold border ${
                        isStepperOpen
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="展开单手快捷步进面板与跳过/删除操作"
                    >
                      ±
                    </button>
                  </div>
                </div>

                {/* Single-hand Large Stepper Drawer (when set is focused or ± clicked) */}
                {isStepperOpen && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-700/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[11px] font-semibold text-cyan-300">
                        单手配重步进 ({set.unit}):
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[-10, -5, -2.5, 2.5, 5, 10].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() =>
                              handleUpdateSetField(set, 'weight', set.weight + delta)
                            }
                            className={`min-h-[44px] px-2.5 rounded-xl font-mono text-xs font-bold border active:scale-95 transition ${
                              delta > 0
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-400">
                          次数微调:
                        </span>
                        {[-2, -1, 1, 2].map((rDelta) => (
                          <button
                            key={rDelta}
                            type="button"
                            onClick={() =>
                              handleUpdateSetField(set, 'reps', set.reps + rDelta)
                            }
                            className="min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-slate-200"
                          >
                            {rDelta > 0 ? `+${rDelta}次` : `${rDelta}次`}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSetSkip(set)}
                          className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1 border ${
                            set.isSkipped
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-amber-300'
                          }`}
                        >
                          <Slash className="w-3.5 h-3.5" />
                          {set.isSkipped ? '恢复本组' : '划掉跳过'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(set)}
                          className="min-h-[44px] px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1"
                          title="删除本组"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Card Footer: + Add Set & Quick Feeling Note */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddSet(exercise)}
              className="touch-target px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              添加一组
            </button>

            <div className="relative flex-1">
              <StickyNote className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={currentNote}
                onChange={(e) => handleSaveExerciseNote(exercise.id, e.target.value)}
                placeholder="动作随手便签（如：变轻松了呢！下次加 5lb）"
                className="w-full touch-target pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-emerald-500/50 focus:outline-none text-xs text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Standard Execution Guide & Tips inside Card */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/70 text-xs text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-300">发力要领：</strong>
              {exercise.instructions[0]}
            </span>
          </div>
          {exercise.tips && exercise.tips[0] && (
            <div className="flex items-start gap-1.5 text-amber-300/90 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>注意：{exercise.tips[0]}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== STATE 1: NO ACTIVE WORKOUT (START DASHBOARD) ====================
  if (!activeSession) {
    const todayDayOfWeek = new Date().getDay();
    const recommendedRoutine =
      routines.find((r) => r.dayOfWeek === todayDayOfWeek) || routines[0];

    return (
      <div className="space-y-6">
        {/* Hero Quick Start Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-emerald-500/30 p-5 md:p-7 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100% 离线秒开 · 自动带出上次成绩</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                准备好今天的铁馆突破了吗？
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl">
                选择下方预设分化计划一键开练，或开启空白自由训练。训练期间将自动启用屏幕防息屏、独立记忆每个动作的{' '}
                <code className="text-cyan-300 font-mono">lb / kg</code> 单位。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {recommendedRoutine && (
                <button
                  type="button"
                  onClick={() => handleStartWorkout(recommendedRoutine)}
                  className="touch-target-lg px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>一键开练：{recommendedRoutine.name.split(' ')[0]}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStartWorkout(undefined)}
                className="touch-target-lg px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>自由空白训练</span>
              </button>
            </div>
          </div>
        </div>

        {/* Preset Split Routines Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
                <span>按分化计划一键开练</span>
              </h2>
              <p className="text-xs text-slate-400">
                点击任一分化模板，立即生成今日跟练清单并自动加载历史最佳配重
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToRoutines}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>管理全部计划</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routines.map((routine) => {
              const isRecommended = routine.id === recommendedRoutine?.id;
              return (
                <div
                  key={routine.id}
                  className={`rounded-2xl p-4 border transition flex flex-col justify-between ${
                    isRecommended
                      ? 'bg-slate-900/95 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {routine.splitType} 分化
                      </span>
                      {isRecommended && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300">
                          今日推荐
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">{routine.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {routine.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {routine.exercises.slice(0, 4).map((re) => {
                        const ex = exerciseMap.get(re.exerciseId);
                        return (
                          <span
                            key={re.exerciseId}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
                          >
                            {ex?.name || re.exerciseId} ({re.targetSets}×{re.targetReps})
                          </span>
                        );
                      })}
                      {routine.exercises.length > 4 && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                          +{routine.exercises.length - 4} 动作
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartWorkout(routine)}
                    className="mt-4 w-full touch-target py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>开始此计划 ({routine.exercises.length} 个动作)</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Workouts Snapshot */}
        {recentSessions && recentSessions.length > 0 && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>最近完成的训练课</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentSessions.slice(0, 4).map((sess) => (
                <div
                  key={sess.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{sess.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(sess.startTime).toLocaleDateString('zh-CN')} · 时长{' '}
                      {Math.round(sess.durationSeconds / 60)} 分钟
                    </div>
                    {sess.feelingNotes && (
                      <div className="text-xs text-emerald-400/90 mt-1 truncate">
                        “{sess.feelingNotes}”
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold text-cyan-300">
                      {sess.totalVolumeKg.toLocaleString()} kg
                    </div>
                    <div className="text-[11px] text-slate-500">折算总容量</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== STATE 2: ACTIVE WORKOUT SESSION ====================
  const focusedExerciseId =
    selectedExerciseId && activeSession.exerciseOrder.includes(selectedExerciseId)
      ? selectedExerciseId
      : activeSession.exerciseOrder[0];

  return (
    <div className="space-y-4">
      {/* Sticky Top Workout Status Bar */}
      <div className="sticky top-0 z-30 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 p-3 md:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 animate-pulse">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-extrabold text-white truncate">
                {activeSession.name}
              </h2>
              <button
                type="button"
                onClick={() =>
                  requestKeepScreenOn().then((ok) => setWakeLockActive(ok))
                }
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 border ${
                  wakeLockActive
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="防息屏状态指示器 (WakeLock API)"
              >
                <Sun className="w-3 h-3" />
                <span>{wakeLockActive ? '常亮防息屏中' : '屏幕常亮就绪'}</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-300 mt-0.5 font-mono">
              <span className="flex items-center gap-1 text-cyan-300 font-bold">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(elapsedSeconds)}
              </span>
              <span>
                总容量: <strong className="text-emerald-400">{liveVolumeKg.toLocaleString()} kg</strong>
              </span>
              <span>
                已完成: <strong>{completedSetsCount}</strong>/{activeSets.length} 组
              </span>
              {prSetsInSession.length > 0 && (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" /> {prSetsInSession.length} PR
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddExerciseModal(true)}
            className="touch-target px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>加动作</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="touch-target px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold cursor-pointer"
            title="放弃本次训练"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowFinishModal(true)}
            className="touch-target px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>完成结课</span>
          </button>
        </div>
      </div>

      {/* Responsive iPad Master-Detail & iPhone Stream Layout */}
      <div className="md:grid md:grid-cols-12 md:gap-6 items-start">
        {/* Left Sidebar (iPad Master Outline - hidden on small iPhone unless needed, visible on md+) */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-4 sticky top-24 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>今日动作大纲 (iPad 分栏)</span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  setIpadViewMode(ipadViewMode === 'split' ? 'stream' : 'split')
                }
                className="text-xs text-cyan-400 hover:underline font-medium"
              >
                {ipadViewMode === 'split' ? '切换全部展开' : '切换单动作聚焦'}
              </button>
            </div>

            <div className="space-y-2">
              {activeSession.exerciseOrder.map((exId, idx) => {
                const ex = exerciseMap.get(exId);
                if (!ex) return null;
                const exSets = activeSets.filter((s) => s.exerciseId === exId);
                const doneCount = exSets.filter((s) => s.isCompleted).length;
                const isSelected = focusedExerciseId === exId && ipadViewMode === 'split';
                const allDone = exSets.length > 0 && doneCount === exSets.length;

                return (
                  <button
                    key={exId}
                    type="button"
                    onClick={() => {
                      setSelectedExerciseId(exId);
                      setIpadViewMode('split');
                    }}
                    className={`w-full touch-target p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : allDone
                        ? 'bg-slate-900/50 border-emerald-500/20 text-slate-300'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          allDone
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {allDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{ex.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {MUSCLE_LABELS[ex.primaryMuscle]} · 默认 {ex.defaultUnit}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-400 shrink-0">
                      {doneCount}/{exSets.length}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowAddExerciseModal(true)}
              className="w-full touch-target py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>添加训练动作</span>
            </button>
          </div>

          {/* Overall Session Feeling Notes Box in Master Sidebar */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <StickyNote className="w-4 h-4 text-emerald-400" />
              <span>今日整体训练感悟便签</span>
            </label>
            <textarea
              rows={3}
              value={sessionFeelingInput}
              onChange={(e) => {
                setSessionFeelingInput(e.target.value);
                db.workoutSessions.update(activeSession.id, {
                  feelingNotes: e.target.value,
                });
              }}
              placeholder="记录今天的体能状态、充血感或突破心得..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </aside>

        {/* Right Detail / Main Exercise Stream */}
        <div className="md:col-span-8 lg:col-span-8 space-y-4">
          {/* Mobile horizontal quick jump pills */}
          <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {activeSession.exerciseOrder.map((exId, idx) => {
              const ex = exerciseMap.get(exId);
              if (!ex) return null;
              return (
                <a
                  key={exId}
                  href={`#ex-card-${exId}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 shrink-0"
                >
                  {idx + 1}. {ex.name}
                </a>
              );
            })}
          </div>

          {/* On iPhone always show all cards; on iPad show focused card + option for stream */}
          <div className="space-y-4">
            {activeSession.exerciseOrder.map((exId, idx) => {
              const isHiddenOnIpadSplit =
                ipadViewMode === 'split' && focusedExerciseId && exId !== focusedExerciseId;
              return (
                <div
                  id={`ex-card-${exId}`}
                  key={exId}
                  className={isHiddenOnIpadSplit ? 'md:hidden' : 'block'}
                >
                  {renderExerciseCard(exId, idx)}
                </div>
              );
            })}
          </div>

          {/* iPad Focused Exercise Extra Detail Card (Estimated 1RM & Full Steps) */}
          {ipadViewMode === 'split' && focusedExerciseId && exerciseMap.get(focusedExerciseId) && (
            <div className="hidden md:block rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
              {(() => {
                const fEx = exerciseMap.get(focusedExerciseId)!;
                const fSets = activeSets.filter(
                  (s) => s.exerciseId === focusedExerciseId && s.isCompleted
                );
                const best1RM = fSets.reduce(
                  (max, s) => Math.max(max, estimate1RM(s.weight, s.reps)),
                  0
                );
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <span>{fEx.name} · 完整动作标准与实时估算 1RM</span>
                      </h4>
                      {best1RM > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs font-mono font-bold">
                          今日估算 1RM: {best1RM} {fEx.defaultUnit}
                        </span>
                      )}
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
                      {fEx.instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Add Exercise to Session */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full md:max-w-xl max-h-[85dvh] rounded-t-3xl md:rounded-3xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">添加动作至当前训练</h3>
              <button
                type="button"
                onClick={() => setShowAddExerciseModal(false)}
                className="touch-target p-2 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-800 space-y-2">
              <input
                type="text"
                value={searchExerciseQuery}
                onChange={(e) => setSearchExerciseQuery(e.target.value)}
                placeholder="搜索动作名称（如：卧推、深蹲、下拉）..."
                className="w-full touch-target px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const).map(
                  (m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFilterMuscle(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                        filterMuscle === m
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {m === 'all' ? '全部肌群' : MUSCLE_LABELS[m]}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {exercises
                .filter((ex) => {
                  const matchMuscle =
                    filterMuscle === 'all' || ex.primaryMuscle === filterMuscle;
                  const matchQuery =
                    !searchExerciseQuery.trim() ||
                    ex.name.toLowerCase().includes(searchExerciseQuery.toLowerCase());
                  return matchMuscle && matchQuery;
                })
                .map((ex) => {
                  const alreadyIn = activeSession.exerciseOrder.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleAddExerciseToSession(ex)}
                      className="w-full p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-left transition"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{ex.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {MUSCLE_LABELS[ex.primaryMuscle]} · {EQUIPMENT_LABELS[ex.equipment]} · 默认{' '}
                          {ex.defaultUnit}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          alreadyIn
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {alreadyIn ? '已添加' : '+ 添加'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Finish Workout Summary & Celebration */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">完成今日训练结课！</h3>
              <p className="text-xs text-slate-400">
                所有组数已实时通过汇率折算为标准公斤容量并持久化至本地数据库
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-lg font-mono font-extrabold text-cyan-300">
                  {formatDuration(elapsedSeconds)}
                </div>
                <div className="text-[11px] text-slate-400">训练总耗时</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-lg font-mono font-extrabold text-emerald-400">
                  {liveVolumeKg.toLocaleString()} kg
                </div>
                <div className="text-[11px] text-slate-400">折算总容量</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-lg font-mono font-extrabold text-amber-300">
                  {prSetsInSession.length} 项
                </div>
                <div className="text-[11px] text-slate-400">新突破 PR</div>
              </div>
            </div>

            {prSetsInSession.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  <span>今日力量新纪录 (Progressive Overload PR)</span>
                </div>
                {prSetsInSession.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    className="text-xs text-slate-200 flex items-center justify-between"
                  >
                    <span>{exerciseMap.get(s.exerciseId)?.name}</span>
                    <span className="font-mono font-bold text-amber-300">
                      {s.weight}
                      {s.unit} × {s.reps}次
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                本次训练心得便签（选填）
              </label>
              <textarea
                rows={3}
                value={sessionFeelingInput}
                onChange={(e) => setSessionFeelingInput(e.target.value)}
                placeholder="例如：器械宽距高位下拉变轻松了呢！下周卧推冲 50lb"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="flex-1 touch-target py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                继续训练
              </button>
              <button
                type="button"
                onClick={handleConfirmFinishWorkout}
                className="flex-1 touch-target py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25"
              >
                确认保存并打卡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Secondary Confirmation for Discarding Workout */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/40 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">确认放弃当前未完成的训练？</h3>
            </div>
            <p className="text-xs text-slate-400">
              放弃后本次训练会话的临时勾选项将被移除。如果您只是想提前结束，请点击“完成结课”保存已做组数。
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 touch-target py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
              >
                返回继续练
              </button>
              <button
                type="button"
                onClick={handleDiscardWorkout}
                className="flex-1 touch-target py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs"
              >
                确认放弃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
