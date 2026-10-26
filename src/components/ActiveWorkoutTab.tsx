import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Play,
  Plus,
  Minus,
  Check,
  Trash2,
  Trophy,
  Search,
  Dumbbell,
  CheckCircle2,
  X,
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
  SetType,
  WeightUnit,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
  SET_TYPE_META,
  MuscleGroup,
} from '../types/fitness';
import {
  calculateSessionVolumeKg,
  convertWeight,
  formatDuration,
} from '../utils/fitnessUtils';
import {
  playSetCheckSound,
  triggerCelebrationConfetti,
} from '../utils/deviceHardware';

interface ActiveWorkoutTabProps {
  onStartRestTimer: (seconds: number, exerciseName: string) => void;
}

const SET_TYPES_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

export const ActiveWorkoutTab: React.FC<ActiveWorkoutTabProps> = ({
  onStartRestTimer,
}) => {
  const activeSessions = useLiveQuery(
    () => db.workoutSessions.filter((s) => !s.isFinished).toArray(),
    []
  );
  const currentSession: WorkoutSession | undefined = activeSessions?.[0];

  const allExercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const allRoutines = useLiveQuery(() => db.routines.toArray(), []) || [];

  const sessionSets =
    useLiveQuery(
      () =>
        currentSession
          ? db.workoutSets.where('sessionId').equals(currentSession.id).toArray()
          : Promise.resolve([] as WorkoutSet[]),
      [currentSession?.id]
    ) || [];

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Native Dialog Refs
  const pickerDialogRef = useRef<HTMLDialogElement | null>(null);
  const finishDialogRef = useRef<HTMLDialogElement | null>(null);

  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerMuscle, setPickerMuscle] = useState<MuscleGroup | 'all'>('all');
  const [feelingInput, setFeelingInput] = useState('');

  // History cache per exercise
  const [historyMap, setHistoryMap] = useState<
    Record<string, { sets: WorkoutSet[]; lastNote?: string }>
  >({});

  // Light-dismiss fallback for <dialog closedby="any">
  useEffect(() => {
    const dialogs = [pickerDialogRef.current, finishDialogRef.current].filter(
      Boolean
    ) as HTMLDialogElement[];
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const handleBackdropClick = (event: MouseEvent) => {
      const dialog = event.currentTarget as HTMLDialogElement;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInDialog) {
        dialog.close();
      }
    };

    dialogs.forEach((d) => d.addEventListener('click', handleBackdropClick));
    return () => {
      dialogs.forEach((d) => d.removeEventListener('click', handleBackdropClick));
    };
  }, [currentSession?.id]);

  // Workout elapsed timer
  useEffect(() => {
    if (!currentSession) {
      setElapsedSec(0);
      return;
    }
    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - currentSession.startTime) / 1000)
      );
      setElapsedSec(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  // Keep selected exercise valid for iPad master-detail
  useEffect(() => {
    if (!currentSession) {
      setSelectedExerciseId(null);
      return;
    }
    if (
      currentSession.exerciseOrder.length > 0 &&
      (!selectedExerciseId ||
        !currentSession.exerciseOrder.includes(selectedExerciseId))
    ) {
      setSelectedExerciseId(currentSession.exerciseOrder[0]);
    }
  }, [currentSession, selectedExerciseId]);

  // Load last performance for active exercises
  useEffect(() => {
    if (!currentSession) return;
    let active = true;
    (async () => {
      const nextMap: Record<string, { sets: WorkoutSet[]; lastNote?: string }> = {};
      for (const exId of currentSession.exerciseOrder) {
        nextMap[exId] = await getLastPerformanceForExercise(exId, currentSession.id);
      }
      if (active) setHistoryMap(nextMap);
    })();
    return () => {
      active = false;
    };
  }, [currentSession?.id, currentSession?.exerciseOrder.join(',')]);

  const exerciseMap = React.useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

  const startFromRoutine = async (routine: Routine) => {
    const sessionId = `ws_${Date.now()}`;
    const exerciseOrder = routine.exercises.map((item) => item.exerciseId);
    const newSets: WorkoutSet[] = [];

    for (const item of routine.exercises) {
      const ex = exerciseMap.get(item.exerciseId);
      const unit: WeightUnit = ex?.defaultUnit || item.targetUnit || 'kg';
      const lastPerf = await getLastPerformanceForExercise(item.exerciseId, sessionId);

      for (let i = 1; i <= item.targetSets; i++) {
        const prevSet =
          lastPerf.sets[i - 1] || lastPerf.sets[lastPerf.sets.length - 1];
        const defaultWeight = prevSet
          ? convertWeight(prevSet.weight, prevSet.unit, unit)
          : unit === 'lb'
          ? 45
          : 20;
        const defaultReps = prevSet ? prevSet.reps : item.targetReps;

        newSets.push({
          id: `set_${sessionId}_${item.exerciseId}_${i}_${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          sessionId,
          exerciseId: item.exerciseId,
          setOrder: i,
          setType: 'normal',
          weight: ex?.equipment === 'bodyweight' ? 0 : defaultWeight,
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
  };

  const startFreeWorkout = async () => {
    const sessionId = `ws_${Date.now()}`;
    const newSession: WorkoutSession = {
      id: sessionId,
      name: '自由力量训练',
      startTime: Date.now(),
      durationSeconds: 0,
      totalVolumeKg: 0,
      exerciseOrder: [],
      isFinished: false,
      createdAt: Date.now(),
    };
    await db.workoutSessions.put(newSession);
  };

  const handleAddExerciseToSession = async (exercise: Exercise) => {
    if (!currentSession) return;
    if (!currentSession.exerciseOrder.includes(exercise.id)) {
      const nextOrder = [...currentSession.exerciseOrder, exercise.id];
      const lastPerf = await getLastPerformanceForExercise(
        exercise.id,
        currentSession.id
      );
      const unit = exercise.defaultUnit || 'kg';
      const prevSet = lastPerf.sets[0];
      const initWeight = prevSet
        ? convertWeight(prevSet.weight, prevSet.unit, unit)
        : exercise.equipment === 'bodyweight'
        ? 0
        : unit === 'lb'
        ? 45
        : 20;

      const firstSet: WorkoutSet = {
        id: `set_${Date.now()}_1`,
        sessionId: currentSession.id,
        exerciseId: exercise.id,
        setOrder: 1,
        setType: 'normal',
        weight: initWeight,
        unit,
        reps: prevSet ? prevSet.reps : 10,
        isCompleted: false,
      };

      await db.transaction('rw', [db.workoutSessions, db.workoutSets], async () => {
        await db.workoutSessions.update(currentSession.id, {
          exerciseOrder: nextOrder,
        });
        await db.workoutSets.put(firstSet);
      });
    }
    setSelectedExerciseId(exercise.id);
    pickerDialogRef.current?.close();
  };

  const handleAddSet = async (exerciseId: string) => {
    if (!currentSession) return;
    const exSets = sessionSets
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.setOrder - b.setOrder);
    const lastSet = exSets[exSets.length - 1];
    const ex = exerciseMap.get(exerciseId);
    const unit = lastSet?.unit || ex?.defaultUnit || 'kg';

    const newSet: WorkoutSet = {
      id: `set_${Date.now()}_${exSets.length + 1}`,
      sessionId: currentSession.id,
      exerciseId,
      setOrder: exSets.length + 1,
      setType: 'normal',
      weight: lastSet ? lastSet.weight : 20,
      unit,
      reps: lastSet ? lastSet.reps : 10,
      isCompleted: false,
    };
    await db.workoutSets.put(newSet);
  };

  const handleDeleteSet = async (set: WorkoutSet) => {
    await db.workoutSets.delete(set.id);
  };

  const handleStepWeight = async (set: WorkoutSet, delta: number) => {
    const nextWeight = Math.max(0, Math.round((set.weight + delta) * 2) / 2);
    await db.workoutSets.update(set.id, { weight: nextWeight });
  };

  const handleStepReps = async (set: WorkoutSet, delta: number) => {
    const nextReps = Math.max(1, set.reps + delta);
    await db.workoutSets.update(set.id, { reps: nextReps });
  };

  const handleCycleSetType = async (set: WorkoutSet) => {
    const idx = SET_TYPES_CYCLE.indexOf(set.setType);
    const nextType = SET_TYPES_CYCLE[(idx + 1) % SET_TYPES_CYCLE.length];
    await db.workoutSets.update(set.id, { setType: nextType });
  };

  const handleToggleExerciseUnit = async (exercise: Exercise) => {
    const nextUnit: WeightUnit = exercise.defaultUnit === 'kg' ? 'lb' : 'kg';
    await db.exercises.update(exercise.id, { defaultUnit: nextUnit });
    const exSets = sessionSets.filter(
      (s) => s.exerciseId === exercise.id && !s.isCompleted
    );
    await Promise.all(
      exSets.map((s) =>
        db.workoutSets.update(s.id, {
          unit: nextUnit,
          weight: convertWeight(s.weight, s.unit, nextUnit),
        })
      )
    );
  };

  const handleToggleCompleteSet = async (set: WorkoutSet, exercise: Exercise) => {
    const nextCompleted = !set.isCompleted;
    let isPR = false;
    if (nextCompleted) {
      isPR = await checkProgressiveOverloadPR(
        set.exerciseId,
        set.weight,
        set.reps,
        set.unit,
        set.id
      );
      playSetCheckSound();
      if (isPR) triggerCelebrationConfetti(false);
      onStartRestTimer(90, exercise.name);
    }
    await db.workoutSets.update(set.id, {
      isCompleted: nextCompleted,
      isPR: nextCompleted ? isPR : false,
      completedAt: nextCompleted ? Date.now() : undefined,
    });
  };

  const handleFinishWorkout = async () => {
    if (!currentSession) return;
    const totalVol = calculateSessionVolumeKg(sessionSets);
    await db.workoutSessions.update(currentSession.id, {
      endTime: Date.now(),
      durationSeconds: elapsedSec,
      totalVolumeKg: totalVol,
      feelingNotes: feelingInput.trim() || undefined,
      isFinished: true,
    });
    triggerCelebrationConfetti(true);
    finishDialogRef.current?.close();
    setFeelingInput('');
  };

  const handleDiscardWorkout = async () => {
    if (!currentSession) return;
    if (!window.confirm('确定放弃本次未完成的训练吗？')) return;
    await db.transaction('rw', [db.workoutSessions, db.workoutSets], async () => {
      await db.workoutSets.where('sessionId').equals(currentSession.id).delete();
      await db.workoutSessions.delete(currentSession.id);
    });
  };

  // ==================== 状态 1：尚未开始训练（极简启动面板） ====================
  if (!currentSession) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-2">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-white">开始今日训练</h1>
            <p className="text-xs text-slate-400">
              选择预设分化模板一键生成训练组，或直接开始空白自由训练。
            </p>
          </div>
          <button
            type="button"
            onClick={startFreeWorkout}
            className="touch-target px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>空白自由训练</span>
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            快捷分化计划模板
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allRoutines.map((routine) => (
              <div
                key={routine.id}
                className="rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 p-4 flex flex-col justify-between gap-4 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">{routine.name}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {routine.exercises.length} 个动作
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {routine.exercises
                      .map((e) => exerciseMap.get(e.exerciseId)?.name || '')
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => startFromRoutine(routine)}
                  className="touch-target w-full py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>按此模板开练</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 状态 2：训练进行中 ====================
  const completedCount = sessionSets.filter((s) => s.isCompleted).length;
  const totalVolKg = calculateSessionVolumeKg(sessionSets);

  const renderExerciseCard = (exerciseId: string) => {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) return null;

    const exSets = sessionSets
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.setOrder - b.setOrder);
    const lastPerf = historyMap[exerciseId];
    const unit = exercise.defaultUnit || 'kg';
    const stepDelta = unit === 'lb' ? 5 : 2.5;

    return (
      <div
        key={exerciseId}
        className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">{exercise.name}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {MUSCLE_LABELS[exercise.primaryMuscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
              </span>
            </div>
            {lastPerf && lastPerf.sets.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                上次最佳:{' '}
                {lastPerf.sets
                  .slice(0, 3)
                  .map((s) => `${s.weight}${s.unit}×${s.reps}`)
                  .join(', ')}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleToggleExerciseUnit(exercise)}
            className="touch-target px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 border border-slate-700 cursor-pointer"
            title="切换该动作默认单位 (kg/lb)"
          >
            单位: {unit.toUpperCase()}
          </button>
        </div>

        {/* Set Rows */}
        <div className="space-y-2">
          {exSets.map((set, idx) => {
            const meta = SET_TYPE_META[set.setType];
            return (
              <div
                key={set.id}
                className={`rounded-xl p-2.5 border transition flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${
                  set.isCompleted
                    ? 'bg-emerald-950/25 border-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                {/* Set index & type */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCycleSetType(set)}
                    className={`w-8 h-8 rounded-lg text-xs font-extrabold border flex items-center justify-center cursor-pointer ${meta.color}`}
                    title={`点击切换组类型 (当前: ${meta.label})`}
                  >
                    {set.setType === 'normal' ? idx + 1 : meta.short}
                  </button>
                  {set.isPR && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                      <Trophy className="w-3 h-3" /> PR
                    </span>
                  )}
                </div>

                {/* Weight Stepper */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStepWeight(set, -stepDelta)}
                    className="touch-target w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                    aria-label="减少重量"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-20 text-center">
                    <input
                      type="number"
                      step="0.5"
                      value={set.weight}
                      onChange={(e) =>
                        db.workoutSets.update(set.id, {
                          weight: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="w-full text-center bg-transparent text-base font-extrabold text-white focus:outline-none"
                    />
                    <div className="text-[10px] text-slate-400 -mt-1">{set.unit}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStepWeight(set, stepDelta)}
                    className="touch-target w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                    aria-label="增加重量"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Reps Stepper */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStepReps(set, -1)}
                    className="touch-target w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                    aria-label="减少次数"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-14 text-center">
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) =>
                        db.workoutSets.update(set.id, {
                          reps: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-full text-center bg-transparent text-base font-extrabold text-white focus:outline-none"
                    />
                    <div className="text-[10px] text-slate-400 -mt-1">次</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStepReps(set, 1)}
                    className="touch-target w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                    aria-label="增加次数"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Check & Delete */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleCompleteSet(set, exercise)}
                    className={`touch-target px-3.5 h-10 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                      set.isCompleted
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{set.isCompleted ? '已完成' : '完成'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSet(set)}
                    className="w-9 h-10 rounded-xl text-slate-500 hover:text-rose-400 flex items-center justify-center cursor-pointer"
                    title="删除该组"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Set Button */}
        <button
          type="button"
          onClick={() => handleAddSet(exerciseId)}
          className="touch-target w-full py-2 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 text-xs font-bold text-slate-300 hover:text-emerald-400 flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>加一组</span>
        </button>
      </div>
    );
  };

  const filteredExercises = allExercises.filter((ex) => {
    const matchMuscle = pickerMuscle === 'all' || ex.primaryMuscle === pickerMuscle;
    const matchQuery =
      !pickerSearch.trim() ||
      ex.name.toLowerCase().includes(pickerSearch.trim().toLowerCase());
    return matchMuscle && matchQuery;
  });

  return (
    <div className="space-y-4">
      {/* Compact Session Status Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-white">{currentSession.name}</h2>
            <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 font-mono">
              <span>用时 {formatDuration(elapsedSec)}</span>
              <span>·</span>
              <span>完成 {completedCount} 组</span>
              <span>·</span>
              <span>容量 {totalVolKg} kg</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => pickerDialogRef.current?.showModal()}
            className="touch-target px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>加动作</span>
          </button>
          <button
            type="button"
            onClick={() => finishDialogRef.current?.showModal()}
            className="touch-target px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>完成训练</span>
          </button>
          <button
            type="button"
            onClick={handleDiscardWorkout}
            className="touch-target px-2.5 py-2 rounded-xl text-slate-400 hover:text-rose-400 text-xs cursor-pointer"
            title="放弃训练"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty Exercise Prompt */}
      {currentSession.exerciseOrder.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 p-10 text-center space-y-3">
          <Dumbbell className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="text-sm font-bold text-slate-300">尚未添加训练动作</div>
          <button
            type="button"
            onClick={() => pickerDialogRef.current?.showModal()}
            className="touch-target px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>选择第一个动作</span>
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Vertical Stack */}
          <div className="md:hidden space-y-3">
            {currentSession.exerciseOrder.map((exId) => renderExerciseCard(exId))}
          </div>

          {/* iPad / Desktop Master-Detail Split Layout */}
          <div className="hidden md:grid md:grid-cols-12 gap-5 items-start">
            <aside className="col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-1.5 sticky top-20">
              <div className="text-[11px] font-bold text-slate-400 px-2 py-1">
                本场训练动作 ({currentSession.exerciseOrder.length})
              </div>
              {currentSession.exerciseOrder.map((exId, idx) => {
                const ex = exerciseMap.get(exId);
                if (!ex) return null;
                const setsForEx = sessionSets.filter((s) => s.exerciseId === exId);
                const doneCnt = setsForEx.filter((s) => s.isCompleted).length;
                const isSelected = selectedExerciseId === exId;
                return (
                  <button
                    key={exId}
                    type="button"
                    onClick={() => setSelectedExerciseId(exId)}
                    className={`touch-target w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-xs truncate">
                      {idx + 1}. {ex.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {doneCnt}/{setsForEx.length}
                    </span>
                  </button>
                );
              })}
            </aside>

            <section className="col-span-8">
              {selectedExerciseId
                ? renderExerciseCard(selectedExerciseId)
                : renderExerciseCard(currentSession.exerciseOrder[0])}
            </section>
          </div>
        </>
      )}

      {/* Native Dialog 1: Exercise Picker (Light-Dismiss enabled) */}
      <dialog
        ref={pickerDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="picker-dialog-title"
        className="w-full max-w-lg rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 p-4 shadow-2xl m-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 id="picker-dialog-title" className="text-base font-bold text-white">
            选择训练动作
          </h3>
          <button
            type="button"
            onClick={() => pickerDialogRef.current?.close()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="搜索动作名称..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const).map(
              (m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPickerMuscle(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                    pickerMuscle === m
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {m === 'all' ? '全部' : MUSCLE_LABELS[m]}
                </button>
              )
            )}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
          {filteredExercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleAddExerciseToSession(ex)}
              className="w-full py-2.5 px-2 text-left hover:bg-slate-800/60 flex items-center justify-between rounded-lg transition cursor-pointer"
            >
              <div>
                <div className="text-sm font-bold text-white">{ex.name}</div>
                <div className="text-[11px] text-slate-400">
                  {MUSCLE_LABELS[ex.primaryMuscle]} · {EQUIPMENT_LABELS[ex.equipment]}
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400">+ 添加</span>
            </button>
          ))}
        </div>
      </dialog>

      {/* Native Dialog 2: Finish Workout Confirmation (Light-Dismiss enabled) */}
      <dialog
        ref={finishDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="finish-dialog-title"
        className="w-full max-w-md rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 p-5 shadow-2xl m-auto"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 id="finish-dialog-title" className="text-base font-extrabold text-white">
              完成今日训练
            </h3>
            <button
              type="button"
              onClick={() => finishDialogRef.current?.close()}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400">总用时</div>
              <div className="text-sm font-bold text-white font-mono">
                {formatDuration(elapsedSec)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">完成组数</div>
              <div className="text-sm font-bold text-emerald-400">{completedCount} 组</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">总容量</div>
              <div className="text-sm font-bold text-white">{totalVolKg} kg</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              训练备注 / 今日状态 (可选)
            </label>
            <textarea
              rows={2}
              value={feelingInput}
              onChange={(e) => setFeelingInput(e.target.value)}
              placeholder="例如：状态不错，卧推突破重量！"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => finishDialogRef.current?.close()}
              className="touch-target px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
            >
              继续训练
            </button>
            <button
              type="button"
              onClick={handleFinishWorkout}
              className="touch-target px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              保存记录
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
};
