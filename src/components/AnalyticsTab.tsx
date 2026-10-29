import React, { useState, useRef } from 'react';
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
  Trash2,
  Plus,
  Download,
  Upload,
  RotateCcw,
  ChevronDown,
  Scale,
  Calendar,
  Trophy,
} from 'lucide-react';
import {
  db,
  exportFullBackupJson,
  importBackupJson,
  resetToFactoryDefaults,
} from '../db/database';
import { BackupPayload, BodyMetric, Exercise, WorkoutSet } from '../types/fitness';
import { calculateSetVolumeKg, formatDuration } from '../utils/fitnessUtils';

const VOLUME_MUSCLE_SERIES = [
  { key: 'chest', label: '胸部', color: '#10b981' },
  { key: 'back', label: '背部', color: '#0ea5e9' },
  { key: 'legs', label: '臀腿', color: '#f59e0b' },
  { key: 'shoulders', label: '肩部', color: '#a855f7' },
  { key: 'arms', label: '手臂', color: '#f43f5e' },
] as const;

type VolumeMuscleKey = (typeof VOLUME_MUSCLE_SERIES)[number]['key'];

interface VolumeChartDataPoint {
  date: string;
  fullDate: string;
  sessionName: string;
  totalVolumeKg: number;
  chest?: number;
  back?: number;
  legs?: number;
  shoulders?: number;
  arms?: number;
}

/**
 * 将同动作下的连续相同重量×次数的组聚合为易读格式 (如 35lb×12×2)
 */
function summarizeSetsReadable(sets: WorkoutSet[]): string {
  if (sets.length === 0) return '';
  const groups: Array<{ w: number; u: string; r: number; c: number; skip?: boolean }> = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.w === s.weight &&
      last.u === s.unit &&
      last.r === s.reps &&
      Boolean(last.skip) === Boolean(s.isSkipped)
    ) {
      last.c += 1;
    } else {
      groups.push({
        w: s.weight,
        u: s.unit,
        r: s.reps,
        c: 1,
        skip: s.isSkipped,
      });
    }
  }
  return groups
    .map((g) => {
      const weightLabel = g.w === 0 ? '空' : `${g.w}${g.u}`;
      const base = `${weightLabel}×${g.r}×${g.c}`;
      return g.skip ? `${base} (未做)` : base;
    })
    .join('  ');
}

export const AnalyticsTab: React.FC = () => {
  const sessions =
    useLiveQuery(
      () =>
        db.workoutSessions
          .filter((s) => s.isFinished)
          .reverse()
          .sortBy('startTime'),
      []
    ) || [];

  const allSets = useLiveQuery(() => db.workoutSets.toArray(), []) || [];
  const allExercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const bodyMetrics =
    useLiveQuery(() => db.bodyMetrics.orderBy('date').toArray(), []) || [];

  const [chartMode, setChartMode] = useState<'volume' | 'weight'>('volume');
  const [visibleMuscles, setVisibleMuscles] = useState<
    Record<VolumeMuscleKey, boolean>
  >({
    chest: true,
    back: true,
    legs: true,
    shoulders: true,
    arms: true,
  });
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null
  );
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exerciseMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allExercises.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [allExercises]);

  const exerciseObjMap = React.useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

  const setsBySessionMap = React.useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const s of allSets) {
      const list = map.get(s.sessionId);
      if (list) {
        list.push(s);
      } else {
        map.set(s.sessionId, [s]);
      }
    }
    return map;
  }, [allSets]);

  const totalWorkouts = sessions.length;
  const totalVolumeTons =
    Math.round(
      (sessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0) / 1000) * 10
    ) / 10;
  const latestMetric = bodyMetrics[bodyMetrics.length - 1];

  // Volume trend data by primary muscle group (chronological, up to last 30 sessions)
  const volumeChartData: VolumeChartDataPoint[] = React.useMemo(() => {
    return [...sessions]
      .reverse()
      .slice(-30)
      .map((s) => {
        const d = new Date(s.startTime);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const fullDate = `${d.getFullYear()}-${String(month).padStart(
          2,
          '0'
        )}-${String(day).padStart(2, '0')}`;

        const muscleVolumes: Record<VolumeMuscleKey, number> = {
          chest: 0,
          back: 0,
          legs: 0,
          shoulders: 0,
          arms: 0,
        };

        const sessionSets = setsBySessionMap.get(s.id) || [];
        for (const set of sessionSets) {
          if (!set.isCompleted || set.isSkipped) continue;
          const ex = exerciseObjMap.get(set.exerciseId);
          const muscle = ex?.primaryMuscle;
          if (muscle && muscle in muscleVolumes) {
            muscleVolumes[muscle as VolumeMuscleKey] += calculateSetVolumeKg(set);
          }
        }

        return {
          date: `${month}/${day}`,
          fullDate,
          sessionName: s.name,
          totalVolumeKg: s.totalVolumeKg,
          chest:
            muscleVolumes.chest > 0
              ? Math.round(muscleVolumes.chest)
              : undefined,
          back:
            muscleVolumes.back > 0 ? Math.round(muscleVolumes.back) : undefined,
          legs:
            muscleVolumes.legs > 0 ? Math.round(muscleVolumes.legs) : undefined,
          shoulders:
            muscleVolumes.shoulders > 0
              ? Math.round(muscleVolumes.shoulders)
              : undefined,
          arms:
            muscleVolumes.arms > 0 ? Math.round(muscleVolumes.arms) : undefined,
        };
      });
  }, [sessions, setsBySessionMap, exerciseObjMap]);

  const toggleMuscleSeries = (key: VolumeMuscleKey) => {
    setVisibleMuscles((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const anyVisible = Object.values(next).some(Boolean);
      return anyVisible ? next : prev;
    });
  };

  // Weight trend data
  const weightChartData = bodyMetrics.slice(-15).map((bm) => ({
    date: bm.date.slice(5),
    value: bm.weightKg || 0,
    bodyFat: bm.bodyFatRate,
  }));

  const handleAddBodyMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    const bf = parseFloat(bodyFatInput);
    const today = new Date().toISOString().slice(0, 10);

    const record: BodyMetric = {
      id: `bm_${today}_${Date.now()}`,
      date: today,
      weightKg: w,
      bodyFatRate: bf > 0 ? bf : undefined,
      createdAt: Date.now(),
    };
    await db.bodyMetrics.put(record);
    setWeightInput('');
    setBodyFatInput('');
    setChartMode('weight');
    setStatusMessage('已记录今日体重体征');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleDeleteSession = async (sessionId: string, name: string) => {
    if (!window.confirm(`确定删除训练记录「${name}」吗？`)) return;
    await db.transaction(
      'rw',
      [db.workoutSessions, db.workoutSets],
      async () => {
        await db.workoutSets.where('sessionId').equals(sessionId).delete();
        await db.workoutSessions.delete(sessionId);
      }
    );
  };

  const handleExportBackup = async () => {
    const payload = await exportFullBackupJson();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('JSON 备份已导出');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as BackupPayload;
      const res = await importBackupJson(json, 'merge');
      setStatusMessage(`成功导入 ${res.importedSessions} 场训练记录`);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : '导入失败，请检查 JSON 文件'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('确定恢复预置的 35 场真实训练日志与 5 套专属计划吗？')) {
      return;
    }
    await resetToFactoryDefaults();
    setStatusMessage('已恢复完整预置训练日志与计划');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {statusMessage && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-xs font-bold text-emerald-300">
          {statusMessage}
        </div>
      )}

      {/* Top 3 Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="text-[11px] text-slate-400">累计打卡</div>
          <div className="text-xl font-extrabold text-white mt-0.5">
            {totalWorkouts}{' '}
            <span className="text-xs font-normal text-slate-400">场</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="text-[11px] text-slate-400">累计总容量</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
            {totalVolumeTons}{' '}
            <span className="text-xs font-normal text-slate-400">吨</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="text-[11px] text-slate-400">最新体重</div>
          <div className="text-xl font-extrabold text-white mt-0.5">
            {latestMetric?.weightKg ?? '--'}{' '}
            <span className="text-xs font-normal text-slate-400">
              kg
              {latestMetric?.bodyFatRate
                ? ` · ${latestMetric.bodyFatRate}%`
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Dual-Mode Trend Chart + Quick Weight Entry */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">
              {chartMode === 'volume'
                ? '分部位训练容量趋势 (kg)'
                : '身体体重变化走势 (kg)'}
            </h2>
            {chartMode === 'volume' && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                同部位跨场次自动连续连线 · 点击图例可筛选部位
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setChartMode('volume')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMode === 'volume'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              训练容量
            </button>
            <button
              type="button"
              onClick={() => setChartMode('weight')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMode === 'weight'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              体重走势
            </button>
          </div>
        </div>

        {/* Muscle Group Interactive Legend */}
        {chartMode === 'volume' && (
          <div className="flex items-center flex-wrap gap-1.5">
            {VOLUME_MUSCLE_SERIES.map((series) => {
              const active = visibleMuscles[series.key];
              return (
                <button
                  key={series.key}
                  type="button"
                  onClick={() => toggleMuscleSeries(series.key)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                    active
                      ? 'bg-slate-950/90 border-slate-700 text-slate-100'
                      : 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-55'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: active ? series.color : '#475569',
                    }}
                  />
                  <span>{series.label}</span>
                </button>
              );
            })}
            {Object.values(visibleMuscles).some((v) => !v) && (
              <button
                type="button"
                onClick={() =>
                  setVisibleMuscles({
                    chest: true,
                    back: true,
                    legs: true,
                    shoulders: true,
                    arms: true,
                  })
                }
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                全显
              </button>
            )}
          </div>
        )}

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'volume' ? (
              <LineChart data={volumeChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const point = payload[0]
                      ?.payload as VolumeChartDataPoint | undefined;
                    if (!point) return null;

                    const activeItems = VOLUME_MUSCLE_SERIES.filter(
                      (s) =>
                        visibleMuscles[s.key] &&
                        typeof point[s.key] === 'number' &&
                        (point[s.key] ?? 0) > 0
                    );

                    return (
                      <div className="rounded-xl bg-slate-950/95 border border-slate-700 px-3 py-2.5 shadow-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                          <span className="font-bold text-white">
                            {point.sessionName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {point.fullDate}
                          </span>
                        </div>
                        {activeItems.length > 0 ? (
                          <div className="space-y-1">
                            {activeItems.map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between gap-4"
                              >
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  {item.label}
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {point[item.key]} kg
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            本场主要为已隐藏部位训练
                          </div>
                        )}
                        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-4 text-[11px] text-slate-400">
                          <span>当场总容量</span>
                          <span className="font-mono font-bold text-slate-200">
                            {point.totalVolumeKg} kg
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                {VOLUME_MUSCLE_SERIES.map((series) =>
                  visibleMuscles[series.key] ? (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={2.5}
                      connectNulls={true}
                      dot={{ r: 3, fill: series.color, strokeWidth: 0 }}
                      activeDot={{
                        r: 5,
                        fill: series.color,
                        stroke: '#0f172a',
                        strokeWidth: 2,
                      }}
                    />
                  ) : null
                )}
              </LineChart>
            ) : (
              <AreaChart data={weightChartData}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="体重 (kg)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Inline Quick Body Weight Entry */}
        <form
          onSubmit={handleAddBodyMetric}
          className="pt-3 border-t border-slate-800/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300">
              记录今日体重
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="number"
              step="0.1"
              required
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="体重 (kg)"
              className="w-28 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <input
              type="number"
              step="0.1"
              value={bodyFatInput}
              onChange={(e) => setBodyFatInput(e.target.value)}
              placeholder="体脂 % (选填)"
              className="w-28 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="touch-target px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>记录</span>
            </button>
          </div>
        </form>
      </div>

      {/* Workout History List */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          历史训练日志 ({sessions.length} 场)
        </h2>

        {sessions.map((session) => {
          const isExpanded = expandedSessionId === session.id;
          const allSetsForSession = allSets
            .filter((s) => s.sessionId === session.id)
            .sort((a, b) => a.setOrder - b.setOrder);
          const completedSets = allSetsForSession.filter((s) => s.isCompleted);
          const prCount = completedSets.filter((s) => s.isPR).length;

          const d = new Date(session.startTime);
          const dateStr = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          return (
            <div
              key={session.id}
              className="rounded-2xl bg-slate-900/85 border border-slate-800 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedSessionId(isExpanded ? null : session.id)
                  }
                  className="flex-1 text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {session.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </span>
                      {prCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                          <Trophy className="w-3 h-3" /> {prCount} PR
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      用时 {formatDuration(session.durationSeconds)} · 完成{' '}
                      {completedSets.length} 组 · 总量 {session.totalVolumeKg}{' '}
                      kg
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteSession(session.id, session.name)}
                  className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="删除记录"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {session.feelingNotes && (
                <p className="text-xs text-emerald-300/90 mt-2 bg-emerald-950/25 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                  “{session.feelingNotes}”
                </p>
              )}

              <div
                className={`expandable-panel ${
                  isExpanded
                    ? 'is-expanded mt-3 pt-3 border-t border-slate-800/80'
                    : ''
                }`}
                hidden={!isExpanded}
              >
                <div className="space-y-2">
                  {session.exerciseOrder.map((exId) => {
                    const exSets = allSetsForSession.filter(
                      (s) => s.exerciseId === exId
                    );
                    if (exSets.length === 0) return null;
                    const allSkipped = exSets.every((s) => s.isSkipped);
                    const exNote = session.exerciseNotes?.[exId];

                    return (
                      <div
                        key={exId}
                        className={`flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs py-1 ${
                          allSkipped ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            {exerciseMap.get(exId) || exId}
                          </span>
                          {exNote && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                              {exNote}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-slate-300">
                          {summarizeSetsReadable(exSets)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Backup & Restore Footer */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-white">本地离线数据备份</h3>
          <p className="text-[11px] text-slate-400">
            数据保存在浏览器 IndexedDB 中，可随时导出 JSON 备份。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="touch-target px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>导出</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>导入</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleResetAll}
            className="touch-target px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-rose-950/50 text-xs font-bold text-slate-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            title="恢复预置真实日志与计划"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
