import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
} from 'lucide-react';
import {
  db,
  exportFullBackupJson,
  importBackupJson,
  resetToFactoryDefaults,
} from '../db/database';
import { BackupPayload, BodyMetric } from '../types/fitness';
import { formatDuration } from '../utils/fitnessUtils';

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

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exerciseMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allExercises.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [allExercises]);

  const totalWorkouts = sessions.length;
  const totalVolumeTons =
    Math.round(
      (sessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0) / 1000) * 10
    ) / 10;
  const latestMetric = bodyMetrics[bodyMetrics.length - 1];

  // Volume trend data (chronological)
  const volumeChartData = [...sessions]
    .reverse()
    .slice(-12)
    .map((s) => {
      const d = new Date(s.startTime);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        volume: s.totalVolumeKg,
        name: s.name,
      };
    });

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
    setStatusMessage('已记录今日体重体征');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleDeleteSession = async (sessionId: string, name: string) => {
    if (!window.confirm(`确定删除训练记录「${name}」吗？`)) return;
    await db.transaction('rw', [db.workoutSessions, db.workoutSets], async () => {
      await db.workoutSets.where('sessionId').equals(sessionId).delete();
      await db.workoutSessions.delete(sessionId);
    });
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
    if (
      !window.confirm(
        '确定恢复出厂演示数据吗？当前自定义记录将被重置。'
      )
    ) {
      return;
    }
    await resetToFactoryDefaults();
    setStatusMessage('已恢复出厂默认数据');
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
            {totalWorkouts} <span className="text-xs font-normal text-slate-400">次</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="text-[11px] text-slate-400">累计总容量</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
            {totalVolumeTons} <span className="text-xs font-normal text-slate-400">吨</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="text-[11px] text-slate-400">最新体重</div>
          <div className="text-xl font-extrabold text-white mt-0.5">
            {latestMetric?.weightKg ?? '--'}{' '}
            <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
        </div>
      </div>

      {/* Volume Trend Chart */}
      {volumeChartData.length > 1 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">训练容量趋势 (kg)</h2>
            <span className="text-[11px] text-slate-400">最近 {volumeChartData.length} 次</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeChartData}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
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
                  dataKey="volume"
                  name="训练容量 (kg)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#volGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Body Weight Entry */}
      <form
        onSubmit={handleAddBodyMetric}
        className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white">快速记录今日体重</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="number"
            step="0.1"
            required
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="体重 (kg)"
            className="w-28 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            step="0.1"
            value={bodyFatInput}
            onChange={(e) => setBodyFatInput(e.target.value)}
            placeholder="体脂 % (选填)"
            className="w-28 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="touch-target px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>记录</span>
          </button>
        </div>
      </form>

      {/* Workout History List */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          历史训练日志 ({sessions.length})
        </h2>

        {sessions.map((session) => {
          const isExpanded = expandedSessionId === session.id;
          const setsForSession = allSets
            .filter((s) => s.sessionId === session.id && s.isCompleted)
            .sort((a, b) => a.setOrder - b.setOrder);
          const dateStr = new Date(session.startTime).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          });

          return (
            <div
              key={session.id}
              className="rounded-2xl bg-slate-900/85 border border-slate-800 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                  className="flex-1 text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{session.name}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      用时 {formatDuration(session.durationSeconds)} · 完成{' '}
                      {setsForSession.length} 组 · 总量 {session.totalVolumeKg} kg
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
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
                  isExpanded ? 'is-expanded mt-3 pt-3 border-t border-slate-800/80' : ''
                }`}
                hidden={!isExpanded}
              >
                <div className="space-y-1.5">
                  {session.exerciseOrder.map((exId) => {
                    const exSets = setsForSession.filter((s) => s.exerciseId === exId);
                    if (exSets.length === 0) return null;
                    return (
                      <div
                        key={exId}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-xs py-1"
                      >
                        <span className="font-bold text-slate-200">
                          {exerciseMap.get(exId) || exId}
                        </span>
                        <span className="font-mono text-slate-400">
                          {exSets.map((s) => `${s.weight}${s.unit}×${s.reps}`).join(' / ')}
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
            title="重置为出厂数据"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
