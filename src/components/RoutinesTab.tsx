import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Play,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Search,
  X,
  Timer,
} from 'lucide-react';
import { db, startWorkoutFromRoutine } from '../db/database';
import {
  Exercise,
  Routine,
  RoutineExercise,
  MuscleGroup,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
} from '../types/fitness';

interface RoutinesTabProps {
  onWorkoutStarted: () => void;
}

const DAY_LABELS: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  0: '周日',
};

const DAY_OPTIONS: Array<{ value: number | undefined; label: string }> = [
  { value: undefined, label: '不限' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

const REST_OPTIONS = [60, 90, 120, 180];

export const RoutinesTab: React.FC<RoutinesTabProps> = ({ onWorkoutStarted }) => {
  const routines = useLiveQuery(() => db.routines.toArray(), []) || [];
  const allExercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const activeSessions =
    useLiveQuery(
      () => db.workoutSessions.filter((s) => !s.isFinished).toArray(),
      []
    ) || [];

  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(
    null
  );

  // Dialogs
  const createDialogRef = useRef<HTMLDialogElement | null>(null);
  const pickerDialogRef = useRef<HTMLDialogElement | null>(null);

  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDay, setNewRoutineDay] = useState<number | undefined>(undefined);

  const [targetRoutineIdForAdd, setTargetRoutineIdForAdd] = useState<string | null>(
    null
  );
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerMuscle, setPickerMuscle] = useState<MuscleGroup | 'all'>('all');

  const exerciseMap = React.useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

  // Safari fallback for <dialog closedby="any">
  useEffect(() => {
    const dialogs = [createDialogRef.current, pickerDialogRef.current].filter(
      Boolean
    ) as HTMLDialogElement[];
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const handleBackdrop = (event: MouseEvent) => {
      const dialog = event.currentTarget as HTMLDialogElement;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };

    dialogs.forEach((d) => d.addEventListener('click', handleBackdrop));
    return () =>
      dialogs.forEach((d) => d.removeEventListener('click', handleBackdrop));
  }, []);

  const handleStartRoutine = async (routine: Routine) => {
    if (routine.exercises.length === 0) {
      window.alert('该计划还没有添加动作，请先展开卡片添加动作后再开练。');
      setExpandedRoutineId(routine.id);
      return;
    }
    if (activeSessions.length > 0) {
      const ok = window.confirm(
        '当前有一场正在进行的训练，是否放弃当前未完成训练并按此计划重新开始？'
      );
      if (!ok) return;
    }
    await startWorkoutFromRoutine(routine);
    onWorkoutStarted();
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;
    const id = `routine_custom_${Date.now()}`;
    const newRoutine: Routine = {
      id,
      name: newRoutineName.trim(),
      splitType: 'Custom',
      dayOfWeek: newRoutineDay,
      exercises: [],
      isBuiltin: false,
      createdAt: Date.now(),
    };
    await db.routines.put(newRoutine);
    setNewRoutineName('');
    setNewRoutineDay(undefined);
    createDialogRef.current?.close();
    setExpandedRoutineId(id);
  };

  const handleUpdateRoutineName = async (routine: Routine, name: string) => {
    await db.routines.update(routine.id, { name });
  };

  const handleUpdateRoutineDay = async (
    routine: Routine,
    dayOfWeek: number | undefined
  ) => {
    await db.routines.update(routine.id, { dayOfWeek });
  };

  const handleStepTargetSets = async (
    routine: Routine,
    index: number,
    delta: number
  ) => {
    const next = [...routine.exercises];
    const item = next[index];
    if (!item) return;
    next[index] = {
      ...item,
      targetSets: Math.max(1, Math.min(20, item.targetSets + delta)),
    };
    await db.routines.update(routine.id, { exercises: next });
  };

  const handleStepTargetReps = async (
    routine: Routine,
    index: number,
    delta: number
  ) => {
    const next = [...routine.exercises];
    const item = next[index];
    if (!item) return;
    next[index] = {
      ...item,
      targetReps: Math.max(1, Math.min(60, item.targetReps + delta)),
    };
    await db.routines.update(routine.id, { exercises: next });
  };

  const handleCycleRestSeconds = async (routine: Routine, index: number) => {
    const next = [...routine.exercises];
    const item = next[index];
    if (!item) return;
    const curIdx = REST_OPTIONS.indexOf(item.restSeconds);
    const nextRest = REST_OPTIONS[(curIdx + 1) % REST_OPTIONS.length];
    next[index] = { ...item, restSeconds: nextRest };
    await db.routines.update(routine.id, { exercises: next });
  };

  const handleMoveExercise = async (
    routine: Routine,
    index: number,
    direction: -1 | 1
  ) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= routine.exercises.length) return;
    const next = [...routine.exercises];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    await db.routines.update(routine.id, { exercises: next });
  };

  const handleRemoveExerciseFromRoutine = async (
    routine: Routine,
    index: number
  ) => {
    const next = routine.exercises.filter((_, i) => i !== index);
    await db.routines.update(routine.id, { exercises: next });
  };

  const handleOpenPickerForRoutine = (routineId: string) => {
    setTargetRoutineIdForAdd(routineId);
    pickerDialogRef.current?.showModal();
  };

  const handleAddExerciseToRoutine = async (exercise: Exercise) => {
    if (!targetRoutineIdForAdd) return;
    const routine = routines.find((r) => r.id === targetRoutineIdForAdd);
    if (!routine) return;

    const newItem: RoutineExercise = {
      exerciseId: exercise.id,
      targetSets: 6,
      targetReps: 12,
      targetUnit: exercise.defaultUnit,
      restSeconds: 90,
    };

    await db.routines.update(routine.id, {
      exercises: [...routine.exercises, newItem],
    });
    pickerDialogRef.current?.close();
  };

  const handleCloneRoutine = async (routine: Routine) => {
    const id = `routine_copy_${Date.now()}`;
    const copy: Routine = {
      ...routine,
      id,
      name: `${routine.name} (副本)`,
      isBuiltin: false,
      createdAt: Date.now(),
    };
    await db.routines.put(copy);
    setExpandedRoutineId(id);
  };

  const handleDeleteRoutine = async (routine: Routine) => {
    if (!window.confirm(`确定删除训练计划「${routine.name}」吗？`)) return;
    await db.routines.delete(routine.id);
    if (expandedRoutineId === routine.id) {
      setExpandedRoutineId(null);
    }
  };

  const filteredExercises = allExercises.filter((ex) => {
    const matchMuscle =
      pickerMuscle === 'all' || ex.primaryMuscle === pickerMuscle;
    const matchQuery =
      !pickerSearch.trim() ||
      ex.name.toLowerCase().includes(pickerSearch.trim().toLowerCase());
    return matchMuscle && matchQuery;
  });

  // 按星期几排序（周一 1 ~ 周六 6, 周日 0, 未设定排后）
  const sortedRoutines = [...routines].sort((a, b) => {
    const orderA = a.dayOfWeek === undefined ? 99 : a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const orderB = b.dayOfWeek === undefined ? 99 : b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return orderA - orderB;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-white">训练计划模板</h1>
          <p className="text-xs text-slate-400">
            点击任意计划卡片展开微调动作、组数与次数，或直接一键开练
          </p>
        </div>
        <button
          type="button"
          onClick={() => createDialogRef.current?.showModal()}
          className="touch-target px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新建计划</span>
        </button>
      </div>

      {/* Accordion Routine List */}
      <div className="space-y-3">
        {sortedRoutines.map((routine) => {
          const isExpanded = expandedRoutineId === routine.id;
          const dayBadge =
            routine.dayOfWeek !== undefined
              ? DAY_LABELS[routine.dayOfWeek]
              : null;

          return (
            <div
              key={routine.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-4 transition"
            >
              {/* Collapsed Summary Row */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedRoutineId(isExpanded ? null : routine.id)
                  }
                  className="flex-1 text-left flex items-center justify-between gap-2 cursor-pointer min-w-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {dayBadge && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                          {dayBadge}
                        </span>
                      )}
                      <h2 className="text-base font-extrabold text-white truncate">
                        {routine.name}
                      </h2>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        ({routine.exercises.length} 个动作)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {routine.exercises.length > 0
                        ? routine.exercises
                            .map(
                              (e) =>
                                `${exerciseMap.get(e.exerciseId)?.name || e.exerciseId} (${e.targetSets}×${e.targetReps})`
                            )
                            .join(' · ')
                        : '暂无动作，点击展开添加动作'}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => handleStartRoutine(routine)}
                  className="touch-target px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-500/15 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>一键开练</span>
                </button>
              </div>

              {/* Expanded Inline Editor */}
              <div
                className={`expandable-panel ${
                  isExpanded
                    ? 'is-expanded mt-4 pt-4 border-t border-slate-800 space-y-4'
                    : ''
                }`}
                hidden={!isExpanded}
              >
                {/* Routine Name & Day of Week Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      计划名称
                    </label>
                    <input
                      type="text"
                      value={routine.name}
                      onChange={(e) =>
                        handleUpdateRoutineName(routine, e.target.value)
                      }
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      推荐训练日 (用于首页自动置顶推荐)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {DAY_OPTIONS.map((opt) => {
                        const active = routine.dayOfWeek === opt.value;
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() =>
                              handleUpdateRoutineDay(routine, opt.value)
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              active
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Routine Exercises List */}
                <div className="space-y-2">
                  {routine.exercises.map((item, idx) => {
                    const ex = exerciseMap.get(item.exerciseId);
                    return (
                      <div
                        key={`${item.exerciseId}_${idx}`}
                        className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2"
                      >
                        {/* Left: Reorder & Exercise Title */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveExercise(routine, idx, -1)}
                              className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-25 cursor-pointer"
                              title="上移"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === routine.exercises.length - 1}
                              onClick={() => handleMoveExercise(routine, idx, 1)}
                              className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-25 cursor-pointer"
                              title="下移"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">
                              {idx + 1}. {ex?.name || item.exerciseId}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {ex
                                ? `${MUSCLE_LABELS[ex.primaryMuscle]} · ${EQUIPMENT_LABELS[ex.equipment]} · 默认 ${ex.defaultUnit.toUpperCase()}`
                                : ''}
                              {item.notes ? ` · ${item.notes}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Right: Steppers for Target Sets, Target Reps, Rest Seconds, Delete */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Sets Stepper */}
                          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                handleStepTargetSets(routine, idx, -1)
                              }
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                              aria-label="减少目标组数"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-extrabold text-white px-1.5 min-w-[3rem] text-center">
                              {item.targetSets} 组
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleStepTargetSets(routine, idx, 1)
                              }
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                              aria-label="增加目标组数"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Reps Stepper */}
                          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                handleStepTargetReps(routine, idx, -1)
                              }
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                              aria-label="减少目标次数"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-extrabold text-white px-1.5 min-w-[3.2rem] text-center">
                              {item.targetReps} 次
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleStepTargetReps(routine, idx, 1)
                              }
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                              aria-label="增加目标次数"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Rest Timer Cycle */}
                          <button
                            type="button"
                            onClick={() => handleCycleRestSeconds(routine, idx)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1 cursor-pointer"
                            title="点击切换组间休息秒数"
                          >
                            <Timer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{item.restSeconds}s</span>
                          </button>

                          {/* Remove Exercise */}
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveExerciseFromRoutine(routine, idx)
                            }
                            className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="从计划中移除此动作"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Routine Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenPickerForRoutine(routine.id)}
                    className="touch-target px-3.5 py-2 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加动作到此计划</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCloneRoutine(routine)}
                      className="touch-target px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制计划</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoutine(routine)}
                      className="touch-target px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-rose-950/60 text-xs font-bold text-slate-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除计划</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Native Dialog 1: Create New Routine */}
      <dialog
        ref={createDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="create-routine-title"
        className="w-full max-w-md rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 p-5 shadow-2xl m-auto"
      >
        <form onSubmit={handleCreateRoutine} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3
              id="create-routine-title"
              className="text-base font-extrabold text-white"
            >
              新建训练计划模板
            </h3>
            <button
              type="button"
              onClick={() => createDialogRef.current?.close()}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              计划名称
            </label>
            <input
              type="text"
              required
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              placeholder="例如：周三 · 手臂与核心专项"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              绑定推荐训练日 (可选)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setNewRoutineDay(opt.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    newRoutineDay === opt.value
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => createDialogRef.current?.close()}
              className="touch-target px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="touch-target px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              创建并配置动作
            </button>
          </div>
        </form>
      </dialog>

      {/* Native Dialog 2: Exercise Picker for Routine */}
      <dialog
        ref={pickerDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="routine-picker-title"
        className="w-full max-w-lg rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 p-4 shadow-2xl m-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 id="routine-picker-title" className="text-base font-bold text-white">
            添加动作到计划
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
            {(
              ['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const
            ).map((m) => (
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
            ))}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
          {filteredExercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleAddExerciseToRoutine(ex)}
              className="w-full py-2.5 px-2 text-left hover:bg-slate-800/60 flex items-center justify-between rounded-lg transition cursor-pointer"
            >
              <div>
                <div className="text-sm font-bold text-white">{ex.name}</div>
                <div className="text-[11px] text-slate-400">
                  {MUSCLE_LABELS[ex.primaryMuscle]} ·{' '}
                  {EQUIPMENT_LABELS[ex.equipment]} · 默认 {ex.defaultUnit.toUpperCase()}
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400">+ 添加</span>
            </button>
          ))}
        </div>
      </dialog>
    </div>
  );
};
