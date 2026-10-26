import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  Trophy,
  Calendar as CalendarIcon,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  StickyNote,
} from 'lucide-react';
import { db } from '../db/database';
import {
  Exercise,
  MuscleGroup,
  MUSCLE_LABELS,
} from '../types/fitness';
import { estimate1RM, calculateSetVolumeKg } from '../utils/fitnessUtils';

const MAIN_MUSCLES: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

export const AnalyticsTab: React.FC = () => {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const finishedSessions = useLiveQuery(
    () =>
      db.workoutSessions
        .filter((s) => s.isFinished)
        .sortBy('startTime'),
    []
  ) || [];
  const allSets = useLiveQuery(() => db.workoutSets.toArray(), []) || [];

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('ex_01_db_bench_press');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const exerciseMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    exercises.forEach((e) => m.set(e.id, e));
    return m;
  }, [exercises]);

  // 1. Muscle Fatigue & Recovery Analysis (48h - 72h window)
  const muscleStatusList = useMemo(() => {
    const now = Date.now();
    const HOUR_MS = 3600 * 1000;

    return MAIN_MUSCLES.map((muscle) => {
      let lastTrainedTime = 0;
      let recentSets72h = 0;
      let totalHistoricalSets = 0;

      for (const s of allSets) {
        if (!s.isCompleted || s.isSkipped) continue;
        const ex = exerciseMap.get(s.exerciseId);
        if (!ex) continue;
        const isPrimary = ex.primaryMuscle === muscle;
        const isSecondary = ex.secondaryMuscles?.includes(muscle);
        if (!isPrimary && !isSecondary) continue;

        const weightFactor = isPrimary ? 1 : 0.5;
        totalHistoricalSets += weightFactor;

        const sess = finishedSessions.find((fs) => fs.id === s.sessionId);
        const ts = s.completedAt || sess?.startTime || 0;
        if (ts > lastTrainedTime && isPrimary) {
          lastTrainedTime = ts;
        }
        if (now - ts <= 72 * HOUR_MS) {
          recentSets72h += weightFactor;
        }
      }

      const hoursSince = lastTrainedTime ? Math.round((now - lastTrainedTime) / HOUR_MS) : 999;
      let status: 'fatigued' | 'recovering' | 'ready' = 'ready';
      if (hoursSince <= 36 && recentSets72h >= 3) {
        status = 'fatigued';
      } else if (hoursSince <= 68 && recentSets72h >= 2) {
        status = 'recovering';
      }

      return {
        muscle,
        label: MUSCLE_LABELS[muscle],
        hoursSince,
        recentSets72h: Math.round(recentSets72h),
        totalHistoricalSets: Math.round(totalHistoricalSets),
        status,
      };
    });
  }, [allSets, exerciseMap, finishedSessions]);

  // 2. 1RM & Volume Trend Data for Selected Exercise
  const selectedExercise = exerciseMap.get(selectedExerciseId) || exercises[0];

  const exerciseTrendData = useMemo(() => {
    if (!selectedExercise) return [];
    const points: Array<{
      date: string;
      sessionName: string;
      est1RM: number;
      maxWeight: number;
      volumeKg: number;
      unit: string;
    }> = [];

    for (const sess of finishedSessions) {
      const setsInSess = allSets.filter(
        (s) =>
          s.sessionId === sess.id &&
          s.exerciseId === selectedExercise.id &&
          s.isCompleted &&
          !s.isSkipped
      );
      if (setsInSess.length === 0) continue;

      let best1RM = 0;
      let maxW = 0;
      let volKg = 0;
      for (const s of setsInSess) {
        const rm = estimate1RM(s.weight, s.reps);
        if (rm > best1RM) best1RM = rm;
        if (s.weight > maxW) maxW = s.weight;
        volKg += calculateSetVolumeKg(s);
      }

      const d = new Date(sess.startTime);
      points.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        sessionName: sess.name,
        est1RM: best1RM,
        maxWeight: maxW,
        volumeKg: Math.round(volKg),
        unit: selectedExercise.defaultUnit,
      });
    }
    return points;
  }, [finishedSessions, allSets, selectedExercise]);

  // 3. Overall Session Volume Trend
  const sessionVolumeTrend = useMemo(() => {
    return finishedSessions.slice(-12).map((sess) => {
      const d = new Date(sess.startTime);
      return {
        id: sess.id,
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        name: sess.name,
        volumeKg: sess.totalVolumeKg,
        durationMin: Math.round(sess.durationSeconds / 60),
      };
    });
  }, [finishedSessions]);

  // 4. Personal Records (PR Honor Wall)
  const prRecords = useMemo(() => {
    const bestByEx = new Map<
      string,
      { exercise: Exercise; weight: number; reps: number; unit: string; est1RM: number }
    >();

    for (const s of allSets) {
      if (!s.isCompleted || s.isSkipped || s.weight <= 0) continue;
      const ex = exerciseMap.get(s.exerciseId);
      if (!ex) continue;
      const rm = estimate1RM(s.weight, s.reps);
      const current = bestByEx.get(ex.id);
      if (!current || rm > current.est1RM) {
        bestByEx.set(ex.id, {
          exercise: ex,
          weight: s.weight,
          reps: s.reps,
          unit: s.unit,
          est1RM: rm,
        });
      }
    }
    return Array.from(bestByEx.values()).sort((a, b) => b.est1RM - a.est1RM);
  }, [allSets, exerciseMap]);

  // 5. Last 28 Days Calendar Heatmap
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const DAY_MS = 86400 * 1000;

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      const dateStr = d.toLocaleDateString('zh-CN');
      const matchedSessions = finishedSessions.filter(
        (s) => new Date(s.startTime).toLocaleDateString('zh-CN') === dateStr
      );
      days.push({
        date: d,
        dayNum: d.getDate(),
        sessions: matchedSessions,
        totalVolume: matchedSessions.reduce((acc, s) => acc + s.totalVolumeKg, 0),
      });
    }
    return days;
  }, [finishedSessions]);

  const activeHistorySession = useMemo(() => {
    if (selectedSessionId) {
      return finishedSessions.find((s) => s.id === selectedSessionId);
    }
    return finishedSessions[finishedSessions.length - 1];
  }, [finishedSessions, selectedSessionId]);

  return (
    <div className="space-y-6">
      {/* Section 1: Muscle Fatigue & Recovery Status + SVG Anatomy Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span>人体肌群恢复度与近 72h 负荷状态</span>
              </h2>
              <p className="text-xs text-slate-400">
                根据最近 48~72 小时内完成的正式组容量，科学评估各肌群超量恢复窗口
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {muscleStatusList.map((item) => {
              const badgeStyle =
                item.status === 'fatigued'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : item.status === 'recovering'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';

              const statusText =
                item.status === 'fatigued'
                  ? '疲劳恢复中'
                  : item.status === 'recovering'
                  ? '超量恢复期'
                  : '满血就绪';

              return (
                <div
                  key={item.muscle}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{item.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${badgeStyle}`}
                    >
                      {item.status === 'fatigued' ? (
                        <Flame className="w-3 h-3" />
                      ) : item.status === 'recovering' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {statusText}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/70">
                    <span>近72h: {item.recentSets72h} 组</span>
                    <span className="font-mono text-slate-300">
                      累计 {item.totalHistoricalSets} 组
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 28-Day Workout Calendar Heatmap */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-cyan-400" />
                <span>近 28 天训练打卡热力日历</span>
              </h3>
              <span className="text-xs font-semibold text-emerald-400">
                共完成 {finishedSessions.length} 次训练
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const hasWorkout = day.sessions.length > 0;
                const isSelected =
                  hasWorkout &&
                  day.sessions.some((s) => s.id === activeHistorySession?.id);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      hasWorkout && setSelectedSessionId(day.sessions[0].id)
                    }
                    className={`h-10 rounded-xl font-mono text-xs font-bold flex flex-col items-center justify-center transition border ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950 border-white shadow-lg shadow-emerald-500/30 scale-105'
                        : hasWorkout
                        ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/40 cursor-pointer'
                        : 'bg-slate-950/60 border-slate-800/70 text-slate-500'
                    }`}
                    title={
                      hasWorkout
                        ? `${day.date.toLocaleDateString('zh-CN')}: ${day.sessions[0].name} (${day.totalVolume}kg)`
                        : day.date.toLocaleDateString('zh-CN')
                    }
                  >
                    <span>{day.dayNum}</span>
                    {hasWorkout && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Historical Session Summary */}
          {activeHistorySession && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-white truncate">
                  {new Date(activeHistorySession.startTime).toLocaleDateString('zh-CN')} ·{' '}
                  {activeHistorySession.name}
                </div>
                {activeHistorySession.feelingNotes && (
                  <div className="text-emerald-400 truncate mt-0.5 flex items-center gap-1">
                    <StickyNote className="w-3 h-3 shrink-0" />
                    <span>“{activeHistorySession.feelingNotes}”</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 font-mono font-bold text-cyan-300">
                {activeHistorySession.totalVolumeKg.toLocaleString()} kg
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Progressive Overload 1RM & Volume Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Exercise 1RM Trend Chart */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>动作估算 1RM 渐进超负荷走势 (Epley 公式)</span>
              </h3>
              <p className="text-xs text-slate-400">
                追踪目标动作的单次极限力量增长曲线与单次最大负重
              </p>
            </div>

            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              aria-label="选择要分析的动作"
              className="touch-target px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-emerald-300"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.defaultUnit})
                </option>
              ))}
            </select>
          </div>

          <div className="h-64 w-full">
            {exerciseTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseTrendData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#10b981',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="est1RM"
                    name={`估算 1RM (${selectedExercise?.defaultUnit})`}
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#10b981' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    name={`正式组最大重量 (${selectedExercise?.defaultUnit})`}
                    stroke="#06b6d4"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <p>该动作暂无历史完成组记录，在「今日训练」中打勾完成后将自动绘制曲线。</p>
                <div className="flex gap-2">
                  {[
                    { id: 'ex_01_db_bench_press', label: '查看：哑铃卧推' },
                    { id: 'ex_07_bb_squat', label: '查看：杠铃深蹲' },
                    { id: 'ex_17_lat_pulldown', label: '查看：高位下拉' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setSelectedExerciseId(btn.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-300 font-semibold"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workout Session Total Volume AreaChart */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-cyan-400" />
              <span>单次训练总容量趋势 (统一折算 kg)</span>
            </h3>
            <p className="text-xs text-slate-400">
              自动将 lb 与 kg 混合训练组统一换算为标准公斤总负荷
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessionVolumeTrend} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#06b6d4',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volumeKg"
                  name="总容量 (kg)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#volGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 3: Personal Records (PR Honor Wall) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>个人力量 PR 荣誉榜 (Personal Records)</span>
          </h3>
          <span className="text-xs text-slate-400">基于历史已完成组自动核算</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {prRecords.map((rec) => (
            <button
              key={rec.exercise.id}
              type="button"
              onClick={() => setSelectedExerciseId(rec.exercise.id)}
              className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/90 text-left transition flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  <span>{MUSCLE_LABELS[rec.exercise.primaryMuscle]}</span>
                </div>
                <div className="text-sm font-bold text-white truncate mt-0.5">
                  {rec.exercise.name}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  最佳组: {rec.weight}
                  {rec.unit} × {rec.reps}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-extrabold text-emerald-400">
                  {rec.est1RM} {rec.unit}
                </div>
                <div className="text-[10px] text-slate-500">估算 1RM</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
