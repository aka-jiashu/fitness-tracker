import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Scale,
  Download,
  Upload,
  Plus,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Ruler,
  Trash2,
} from 'lucide-react';
import {
  db,
  exportFullBackupJson,
  importBackupJson,
  resetToFactoryDefaults,
} from '../db/database';
import { BodyMetric, BackupPayload } from '../types/fitness';

export const BodyMetricsSettingsTab: React.FC = () => {
  const metrics = useLiveQuery(() => db.bodyMetrics.orderBy('date').toArray(), []) || [];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const latestMetric = metrics[metrics.length - 1];

  // Form inputs for new BodyMetric
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [weightKg, setWeightKg] = useState<string>(
    latestMetric?.weightKg ? String(latestMetric.weightKg) : '73.0'
  );
  const [bodyFatRate, setBodyFatRate] = useState<string>(
    latestMetric?.bodyFatRate ? String(latestMetric.bodyFatRate) : '15.0'
  );
  const [muscleMassKg, setMuscleMassKg] = useState<string>(
    latestMetric?.muscleMassKg ? String(latestMetric.muscleMassKg) : '36.0'
  );
  const [chestCm, setChestCm] = useState<string>(
    latestMetric?.chestCircumferenceCm ? String(latestMetric.chestCircumferenceCm) : '102.5'
  );
  const [waistCm, setWaistCm] = useState<string>(
    latestMetric?.waistCircumferenceCm ? String(latestMetric.waistCircumferenceCm) : '78.5'
  );
  const [hipCm, setHipCm] = useState<string>(
    latestMetric?.hipCircumferenceCm ? String(latestMetric.hipCircumferenceCm) : '96.5'
  );
  const [armCm, setArmCm] = useState<string>(
    latestMetric?.rightArmCm ? String(latestMetric.rightArmCm) : '37.2'
  );
  const [thighCm, setThighCm] = useState<string>(
    latestMetric?.rightThighCm ? String(latestMetric.rightThighCm) : '57.5'
  );
  const [notes, setNotes] = useState('');

  // Chart tab: 'composition' (体重/体脂/肌肉) vs 'circumference' (胸围/腰围/臂围/腿围)
  const [chartMode, setChartMode] = useState<'composition' | 'circumference'>('composition');

  // Backup / Restore status messages
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    const record: BodyMetric = {
      id: `bm_${date}_${Date.now()}`,
      date,
      weightKg: parseFloat(weightKg) || undefined,
      bodyFatRate: parseFloat(bodyFatRate) || undefined,
      muscleMassKg: parseFloat(muscleMassKg) || undefined,
      chestCircumferenceCm: parseFloat(chestCm) || undefined,
      waistCircumferenceCm: parseFloat(waistCm) || undefined,
      hipCircumferenceCm: parseFloat(hipCm) || undefined,
      leftArmCm: parseFloat(armCm) || undefined,
      rightArmCm: parseFloat(armCm) || undefined,
      leftThighCm: parseFloat(thighCm) || undefined,
      rightThighCm: parseFloat(thighCm) || undefined,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };
    await db.bodyMetrics.put(record);
    setNotes('');
    setStatusMessage({
      type: 'success',
      text: `已保存 ${date} 身体维度记录！`,
    });
  };

  const handleDeleteMetric = async (id: string) => {
    await db.bodyMetrics.delete(id);
  };

  // Export JSON Backup
  const handleExportJson = async () => {
    try {
      const payload = await exportFullBackupJson();
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitness-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: `备份导出成功：fitness-backup-${stamp}.json`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `导出失败：${(err as Error).message}`,
      });
    }
  };

  // Import JSON Backup
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      const res = await importBackupJson(parsed, importMode);
      setStatusMessage({
        type: 'success',
        text: `恢复成功！已导入 ${res.importedExercises} 个动作、${res.importedSessions} 节训练课、${res.importedMetrics} 条体征记录。`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `导入失败：${(err as Error).message}`,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmReset = async () => {
    await resetToFactoryDefaults();
    setShowResetConfirm(false);
    setStatusMessage({
      type: 'success',
      text: '已恢复出厂预置动作库与初始演示数据！',
    });
  };

  const chartData = metrics.map((m) => ({
    date: m.date.slice(5),
    weightKg: m.weightKg,
    bodyFatRate: m.bodyFatRate,
    muscleMassKg: m.muscleMassKg,
    chestCm: m.chestCircumferenceCm,
    waistCm: m.waistCircumferenceCm,
    armCm: m.rightArmCm,
    thighCm: m.rightThighCm,
  }));

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white px-2 py-1"
          >
            关闭
          </button>
        </div>
      )}

      {/* Top Summary Cards */}
      {latestMetric && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs text-slate-400">当前体重</div>
            <div className="text-2xl font-mono font-extrabold text-emerald-400 mt-1">
              {latestMetric.weightKg ?? '--'} <span className="text-xs font-normal">kg</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">记录于 {latestMetric.date}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs text-slate-400">当前体脂率</div>
            <div className="text-2xl font-mono font-extrabold text-cyan-300 mt-1">
              {latestMetric.bodyFatRate ?? '--'} <span className="text-xs font-normal">%</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              骨骼肌 {latestMetric.muscleMassKg ?? '--'} kg
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs text-slate-400">胸围 / 腰围</div>
            <div className="text-2xl font-mono font-extrabold text-white mt-1">
              {latestMetric.chestCircumferenceCm ?? '--'} /{' '}
              <span className="text-emerald-400">
                {latestMetric.waistCircumferenceCm ?? '--'}
              </span>{' '}
              <span className="text-xs font-normal">cm</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">黄金胸腰比追踪</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs text-slate-400">臂围 / 大腿围</div>
            <div className="text-2xl font-mono font-extrabold text-amber-300 mt-1">
              {latestMetric.rightArmCm ?? '--'} / {latestMetric.rightThighCm ?? '--'}{' '}
              <span className="text-xs font-normal">cm</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">四肢充血与围度成长</div>
          </div>
        </div>
      )}

      {/* Master-Detail Grid: Left Chart & History, Right Quick Entry & Data Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Recharts Body Trend + History Table */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  <span>身体体征与围度趋势折线图</span>
                </h2>
                <p className="text-xs text-slate-400">
                  周期化监控增肌减脂期间的体重、体脂率与核心围度走势
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartMode('composition')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'composition'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  体重 / 体脂 / 骨骼肌
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('circumference')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'circumference'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  胸 / 腰 / 臂 / 腿围
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'composition' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
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
                      dataKey="weightKg"
                      name="体重 (kg)"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="muscleMassKg"
                      name="骨骼肌 (kg)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bodyFatRate"
                      name="体脂率 (%)"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#06b6d4',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="chestCm"
                      name="胸围 (cm)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="waistCm"
                      name="腰围 (cm)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="thighCm"
                      name="大腿围 (cm)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="armCm"
                      name="臂围 (cm)"
                      stroke="#ec4899"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Body Metrics List */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-cyan-400" />
              <span>历史体征记录明细 ({metrics.length} 条)</span>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {[...metrics].reverse().map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-white">
                      {m.date} · 体重 <span className="text-emerald-400">{m.weightKg}kg</span> · 体脂{' '}
                      <span className="text-cyan-300">{m.bodyFatRate}%</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      胸围 {m.chestCircumferenceCm ?? '-'}cm | 腰围 {m.waistCircumferenceCm ?? '-'}cm |
                      臂围 {m.rightArmCm ?? '-'}cm | 腿围 {m.rightThighCm ?? '-'}cm
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMetric(m.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400"
                    title="删除该条体征记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Body Metric Entry Form + Offline JSON Backup & Restore */}
        <div className="lg:col-span-5 space-y-5">
          {/* Form 1: Record Body Metrics */}
          <form
            onSubmit={handleSaveMetric}
            className="rounded-2xl bg-slate-900/95 border border-slate-800 p-5 space-y-4"
          >
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>录入今日体征与围度</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-400">记录日期</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full touch-target px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">体重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-emerald-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">体脂率 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyFatRate}
                  onChange={(e) => setBodyFatRate(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-cyan-300"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">骨骼肌 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={muscleMassKg}
                  onChange={(e) => setMuscleMassKg(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">胸围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">腰围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">臀围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={hipCm}
                  onChange={(e) => setHipCm(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">臂围 (cm)</label>
                <input
                  type="number"
                  step="0.2"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">大腿围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  className="mt-1 w-full touch-target px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full touch-target-lg py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              保存今日身体数据
            </button>
          </form>

          {/* Box 2: Offline Data Security & JSON Backup Center */}
          <div className="rounded-2xl bg-slate-900/95 border border-emerald-500/30 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  隐私安全 · 离线 JSON 快照备份中心
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  所有训练日志与身体数据 100% 存储在您设备本地的 IndexedDB 中。支持一键导出标准 JSON 快照跨设备迁移。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="touch-target-lg px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>一键导出 JSON 备份</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="touch-target-lg px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>导入恢复 JSON 备份</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">导入模式:</span>
                <button
                  type="button"
                  onClick={() =>
                    setImportMode(importMode === 'merge' ? 'replace' : 'merge')
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-semibold"
                >
                  {importMode === 'merge' ? '智能合并 (推荐)' : '全量覆盖'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置演示数据</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Confirmation Modal for Factory Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/40 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">确认重置本地数据库？</h3>
            </div>
            <p className="text-xs text-slate-400">
              此操作将清空您新增的训练记录并恢复为出厂预置的 32 个经典动作与演示数据。建议重置前先点击“一键导出 JSON 备份”。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 touch-target py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 touch-target py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
