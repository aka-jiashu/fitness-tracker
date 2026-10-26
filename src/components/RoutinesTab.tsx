import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  Play,
  Plus,
  Trash2,
  Clock,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import { db, getLastPerformanceForExercise } from '../db/database';
import {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  WorkoutSet,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
} from '../types/fitness';
import { convertWeight } from '../utils/fitnessUtils';

interface RoutinesTabProps {
  onWorkoutStarted: () => void;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const RoutinesTab: React.FC<RoutinesTabProps> = ({ onWorkoutStarted }) => {
  const routines = useLiveQuery(() => db.routines.toArray(), []) || [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [splitFilter, setSplitFilter] = useState<string>('ALL');

  // Create Custom Routine Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');
  const [newRoutineSplit, setNewRoutineSplit] = useState<Routine['splitType']>('PPL');
  const [newRoutineDay, setNewRoutineDay] = useState<number>(1);
  const [draftExercises, setDraftExercises] = useState<RoutineExercise[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const exerciseMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    exercises.forEach((e) => m.set(e.id, e));
    return m;
  }, [exercises]);

  const filteredRoutines = useMemo(() => {
    if (splitFilter === 'ALL') return routines;
    return routines.filter((r) => r.splitType === splitFilter);
  }, [routines, splitFilter]);

  const activeRoutine = useMemo(() => {
    return (
      filteredRoutines.find((r) => r.id === selectedRoutineId) ||
      filteredRoutines[0] ||
      routines[0]
    );
  }, [filteredRoutines, routines, selectedRoutineId]);

  // Launch a workout session from the selected routine and navigate to Tab 1
  const handleStartRoutineNow = async (routine: Routine) => {
    const existingActive = await db.workoutSessions.filter((s) => !s.isFinished).first();
    if (existingActive) {
      onWorkoutStarted();
      return;
    }

    const sessionId = `session_${Date.now()}`;
    const now = Date.now();
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
    onWorkoutStarted();
  };

  // Toggle exercise in draft custom routine
  const handleToggleDraftExercise = (ex: Exercise) => {
    const exists = draftExercises.some((d) => d.exerciseId === ex.id);
    if (exists) {
      setDraftExercises(draftExercises.filter((d) => d.exerciseId !== ex.id));
    } else {
      setDraftExercises([
        ...draftExercises,
        {
          exerciseId: ex.id,
          targetSets: 4,
          targetReps: 12,
          targetUnit: ex.defaultUnit,
          restSeconds: 90,
        },
      ]);
    }
  };

  const handleSaveCustomRoutine = async () => {
    if (!newRoutineName.trim() || draftExercises.length === 0) return;
    const newRoutine: Routine = {
      id: `routine_custom_${Date.now()}`,
      name: newRoutineName.trim(),
      description: newRoutineDesc.trim() || '自定义周期化分化训练日',
      splitType: newRoutineSplit,
      dayOfWeek: newRoutineDay,
      exercises: draftExercises,
      isBuiltin: false,
      createdAt: Date.now(),
    };
    await db.routines.put(newRoutine);
    setSelectedRoutineId(newRoutine.id);
    setShowCreateModal(false);
    setNewRoutineName('');
    setNewRoutineDesc('');
    setDraftExercises([]);
  };

  const handleDeleteRoutine = async (id: string) => {
    await db.routines.delete(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Weekly Schedule Strip */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>周期分化排期表 (PPL / 上下肢 / 全身)</span>
            </h2>
            <p className="text-xs text-slate-400">
              点击任意排期日或下方模板卡片即可查看动作编排并一键进入训练
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraftExercises(
                exercises.slice(0, 3).map((ex) => ({
                  exerciseId: ex.id,
                  targetSets: 4,
                  targetReps: 12,
                  targetUnit: ex.defaultUnit,
                  restSeconds: 90,
                }))
              );
              setShowCreateModal(true);
            }}
            className="touch-target px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新建训练计划</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
          {WEEKDAYS.map((dayLabel, dayIdx) => {
            const dayRoutine = routines.find((r) => r.dayOfWeek === dayIdx);
            const isToday = new Date().getDay() === dayIdx;
            const isSelected = activeRoutine?.id === dayRoutine?.id && Boolean(dayRoutine);

            return (
              <button
                key={dayLabel}
                type="button"
                onClick={() => dayRoutine && setSelectedRoutineId(dayRoutine.id)}
                className={`p-2 md:p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[72px] cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : isToday
                    ? 'bg-slate-800/90 border-cyan-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold">{dayLabel}</span>
                  {isToday && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400" title="今天" />
                  )}
                </div>
                <div className="text-[11px] font-semibold mt-1 line-clamp-2">
                  {dayRoutine ? (
                    <span className="text-emerald-300">
                      {dayRoutine.name.replace('推拉腿 · ', '').replace('上下肢分化 · ', '')}
                    </span>
                  ) : (
                    <span className="text-slate-600">休息恢复</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: '全部计划模板' },
          { key: 'PPL', label: '推拉腿三分化 (PPL)' },
          { key: 'UpperLower', label: '上下肢二分化 (Upper/Lower)' },
          { key: 'FullBody', label: '全身综合训练' },
          { key: 'Custom', label: '自定义计划' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSplitFilter(tab.key)}
            className={`touch-target px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
              splitFilter === tab.key
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Master-Detail Split Layout for iPad & Desktop */}
      <div className="md:grid md:grid-cols-12 md:gap-6 items-start space-y-4 md:space-y-0">
        {/* Left Column: Routine Cards List (5 cols on iPad) */}
        <div className="md:col-span-5 space-y-3">
          {filteredRoutines.map((routine) => {
            const isSelected = activeRoutine?.id === routine.id;
            return (
              <div
                key={routine.id}
                onClick={() => setSelectedRoutineId(routine.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/60 shadow-xl shadow-emerald-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {routine.splitType}
                  </span>
                  {routine.dayOfWeek !== undefined && (
                    <span className="text-xs text-slate-400">
                      推荐：{WEEKDAYS[routine.dayOfWeek]}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">{routine.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {routine.description}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    共 <strong>{routine.exercises.length}</strong> 个动作 ·{' '}
                    {routine.exercises.reduce((acc, e) => acc + e.targetSets, 0)} 组
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartRoutineNow(routine);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>开练</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Routine Detailed Breakdown (7 cols on iPad) */}
        <div className="md:col-span-7">
          {activeRoutine ? (
            <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-5 space-y-5 sticky top-20">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {activeRoutine.splitType} 周期计划
                    </span>
                    {activeRoutine.dayOfWeek !== undefined && (
                      <span className="text-xs text-cyan-300 font-medium">
                        排期：{WEEKDAYS[activeRoutine.dayOfWeek]}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-white">{activeRoutine.name}</h3>
                  <p className="text-xs text-slate-400">{activeRoutine.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {!activeRoutine.isBuiltin && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(activeRoutine.id)}
                      className="touch-target px-3 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartRoutineNow(activeRoutine)}
                    className="touch-target-lg px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-emerald-500/25 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>开始今日计划</span>
                  </button>
                </div>
              </div>

              {/* Exercises Table in Routine */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-cyan-400" />
                  <span>计划动作编排清单 ({activeRoutine.exercises.length} 项)</span>
                </h4>

                <div className="space-y-2.5">
                  {activeRoutine.exercises.map((item, idx) => {
                    const ex = exerciseMap.get(item.exerciseId);
                    if (!ex) return null;
                    return (
                      <div
                        key={`${item.exerciseId}_${idx}`}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-800 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">{ex.name}</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[11px] font-medium">
                                {MUSCLE_LABELS[ex.primaryMuscle]}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                {EQUIPMENT_LABELS[ex.equipment]}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {item.notes || ex.instructions[0]}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 sm:text-right pl-10 sm:pl-0">
                          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                            <span className="text-emerald-400 font-bold">{item.targetSets}</span> 组 ×{' '}
                            <span className="text-cyan-300 font-bold">{item.targetReps}</span> 次
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {item.restSeconds}s
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Create Custom Routine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[88dvh] rounded-3xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>创建自定义分化训练计划</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="touch-target p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">计划名称 *</label>
                  <input
                    type="text"
                    value={newRoutineName}
                    onChange={(e) => setNewRoutineName(e.target.value)}
                    placeholder="如：周六肩臂超级组特训"
                    className="mt-1 w-full touch-target px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300">所属分化</label>
                    <select
                      value={newRoutineSplit}
                      onChange={(e) =>
                        setNewRoutineSplit(e.target.value as Routine['splitType'])
                      }
                      className="mt-1 w-full touch-target px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="PPL">推拉腿 (PPL)</option>
                      <option value="UpperLower">上下肢</option>
                      <option value="FullBody">全身综合</option>
                      <option value="Custom">自定义</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">推荐星期</label>
                    <select
                      value={newRoutineDay}
                      onChange={(e) => setNewRoutineDay(Number(e.target.value))}
                      className="mt-1 w-full touch-target px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      {WEEKDAYS.map((w, idx) => (
                        <option key={w} value={idx}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">计划说明</label>
                <input
                  type="text"
                  value={newRoutineDesc}
                  onChange={(e) => setNewRoutineDesc(e.target.value)}
                  placeholder="简要描述训练重点与节奏要求..."
                  className="mt-1 w-full touch-target px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-2 block">
                  勾选包含的训练动作 (已选 {draftExercises.length} 项)
                </label>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {exercises.map((ex) => {
                    const selected = draftExercises.some((d) => d.exerciseId === ex.id);
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => handleToggleDraftExercise(ex)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                          selected
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>
                          <strong>{ex.name}</strong> · {MUSCLE_LABELS[ex.primaryMuscle]} (
                          {ex.defaultUnit})
                        </span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveCustomRoutine}
                disabled={!newRoutineName.trim() || draftExercises.length === 0}
                className="touch-target px-5 py-2 rounded-xl bg-emerald-500 disabled:opacity-40 text-slate-950 text-xs font-extrabold"
              >
                保存计划
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/40 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">确认删除该自定义训练计划？</h3>
            <p className="text-xs text-slate-400">
              删除计划模板不会影响您已经打卡保存的历史训练日志。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 touch-target py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRoutine(deleteConfirmId)}
                className="flex-1 touch-target py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
