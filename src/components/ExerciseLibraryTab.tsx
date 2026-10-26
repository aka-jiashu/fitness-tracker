import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  Scale,
  X,
  Trash2,
} from 'lucide-react';
import { db } from '../db/database';
import {
  Exercise,
  MuscleGroup,
  EquipmentType,
  WeightUnit,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
} from '../types/fitness';

const MUSCLE_FILTERS: Array<{ key: 'all' | MuscleGroup; label: string }> = [
  { key: 'all', label: '全部肌群' },
  { key: 'chest', label: '胸部' },
  { key: 'back', label: '背部' },
  { key: 'legs', label: '腿部' },
  { key: 'shoulders', label: '肩部' },
  { key: 'arms', label: '手臂' },
  { key: 'core', label: '核心' },
  { key: 'cardio', label: '有氧/全身' },
];

const EQUIPMENT_FILTERS: Array<{ key: 'all' | EquipmentType; label: string }> = [
  { key: 'all', label: '全部器械' },
  { key: 'dumbbell', label: '哑铃 (lb)' },
  { key: 'barbell', label: '杠铃 (kg)' },
  { key: 'machine', label: '固定器械' },
  { key: 'cable', label: '绳索滑轮' },
  { key: 'bodyweight', label: '自重' },
  { key: 'band', label: '弹力带' },
];

export const ExerciseLibraryTab: React.FC = () => {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const allSets = useLiveQuery(() => db.workoutSets.toArray(), []) || [];

  const [muscleFilter, setMuscleFilter] = useState<'all' | MuscleGroup>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<'all' | EquipmentType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('ex_01_db_bench_press');

  // Create Custom Exercise Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNameEn, setCustomNameEn] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('chest');
  const [customEquipment, setCustomEquipment] = useState<EquipmentType>('dumbbell');
  const [customUnit, setCustomUnit] = useState<WeightUnit>('lb');
  const [customInstruction, setCustomInstruction] = useState('');
  const [customTip, setCustomTip] = useState('');

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchM = muscleFilter === 'all' || ex.primaryMuscle === muscleFilter;
      const matchE = equipmentFilter === 'all' || ex.equipment === equipmentFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQ =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        (ex.nameEn && ex.nameEn.toLowerCase().includes(q));
      return matchM && matchE && matchQ;
    });
  }, [exercises, muscleFilter, equipmentFilter, searchQuery]);

  const activeExercise = useMemo(() => {
    return (
      filteredExercises.find((e) => e.id === selectedExerciseId) ||
      filteredExercises[0] ||
      exercises[0]
    );
  }, [filteredExercises, exercises, selectedExerciseId]);

  const handleUpdateDefaultUnit = async (ex: Exercise, unit: WeightUnit) => {
    await db.exercises.update(ex.id, { defaultUnit: unit });
  };

  const handleCreateCustomExercise = async () => {
    if (!customName.trim()) return;
    const newEx: Exercise = {
      id: `ex_custom_${Date.now()}`,
      name: customName.trim(),
      nameEn: customNameEn.trim() || 'Custom Exercise',
      primaryMuscle: customMuscle,
      secondaryMuscles: [],
      equipment: customEquipment,
      defaultUnit: customUnit,
      isCustom: true,
      instructions: customInstruction.trim()
        ? customInstruction
            .trim()
            .split('\n')
            .filter(Boolean)
        : ['保持核心收紧与目标肌群主导发力，控制离心回落节奏。'],
      tips: customTip.trim() ? [customTip.trim()] : ['避免使用惯性甩动借力'],
      createdAt: Date.now(),
    };
    await db.exercises.put(newEx);
    setSelectedExerciseId(newEx.id);
    setShowCreateModal(false);
    setCustomName('');
    setCustomNameEn('');
    setCustomInstruction('');
    setCustomTip('');
  };

  const handleDeleteCustomExercise = async (id: string) => {
    await db.exercises.delete(id);
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Search Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>动作指导百科 ({exercises.length} 个标准与自定义动作)</span>
            </h2>
            <p className="text-xs text-slate-400">
              内置 32 个黄金经典动作发力要领与防伤避坑指南，支持按动作独立配置默认单位 (lb / kg)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="touch-target px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新建自定义动作</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索中英文动作名称（如：哑铃卧推、RDL、Face Pull、引体）..."
            className="w-full touch-target pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:outline-none text-sm text-white"
          />
        </div>

        {/* Muscle Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {MUSCLE_FILTERS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMuscleFilter(m.key)}
              className={`touch-target px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                muscleFilter === m.key
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Equipment Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {EQUIPMENT_FILTERS.map((eq) => (
            <button
              key={eq.key}
              type="button"
              onClick={() => setEquipmentFilter(eq.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                equipmentFilter === eq.key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {eq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Master-Detail Split View */}
      <div className="md:grid md:grid-cols-12 md:gap-6 items-start space-y-4 md:space-y-0">
        {/* Left Column: Filtered Exercise Grid (6 cols on iPad) */}
        <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70dvh] overflow-y-auto pr-1">
          {filteredExercises.map((ex) => {
            const isSelected = activeExercise?.id === ex.id;
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelectedExerciseId(ex.id)}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {MUSCLE_LABELS[ex.primaryMuscle]}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                        ex.defaultUnit === 'lb'
                          ? 'bg-cyan-500/15 text-cyan-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      默认 {ex.defaultUnit.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2">{ex.name}</h3>
                  {ex.nameEn && (
                    <div className="text-[11px] text-slate-500 truncate">{ex.nameEn}</div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{EQUIPMENT_LABELS[ex.equipment]}</span>
                  <span className="text-emerald-400 font-semibold">查看详解 →</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Detailed Exercise Encyclopedia Card (6 cols on iPad) */}
        <div className="md:col-span-6">
          {activeExercise && (
            <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-5 space-y-5 sticky top-20 shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      主肌群：{MUSCLE_LABELS[activeExercise.primaryMuscle]}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300">
                      器械：{EQUIPMENT_LABELS[activeExercise.equipment]}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    {activeExercise.name}
                  </h3>
                  {activeExercise.nameEn && (
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {activeExercise.nameEn}
                    </p>
                  )}
                </div>

                {activeExercise.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomExercise(activeExercise.id)}
                    className="touch-target px-3 py-2 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Unit Memory Configuration Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Scale className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">默认配重单位独立记忆</div>
                    <div className="text-[11px] text-slate-400">
                      哑铃推荐设为英磅 (lb)，杠铃与大型插片器械推荐设为公斤 (kg)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(['lb', 'kg'] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => handleUpdateDefaultUnit(activeExercise, u)}
                      className={`touch-target px-3.5 py-1.5 rounded-xl font-mono text-xs font-extrabold transition cursor-pointer ${
                        activeExercise.defaultUnit === u
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step-by-step Execution Instructions */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>标准发力要领与执行步骤</span>
                </h4>
                <div className="space-y-2">
                  {activeExercise.instructions.map((step, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Mistakes & Safety Warnings */}
              {activeExercise.tips && activeExercise.tips.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>常见代偿错误与防伤警示</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90">
                    {activeExercise.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Historical Sets Count Footer */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
                  辅助协同肌群：
                  {activeExercise.secondaryMuscles && activeExercise.secondaryMuscles.length > 0
                    ? activeExercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join('、')
                    : '无明显代偿肌群'}
                </span>
                <span className="font-mono text-slate-300">
                  已累计完成{' '}
                  {
                    allSets.filter(
                      (s) => s.exerciseId === activeExercise.id && s.isCompleted
                    ).length
                  }{' '}
                  组
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Custom Exercise Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">创建自定义训练动作</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="touch-target p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">动作中文名称 *</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="如：哈克深蹲、保加利亚分腿蹲"
                  className="mt-1 w-full touch-target px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-300">目标主肌群</label>
                  <select
                    value={customMuscle}
                    onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                    className="mt-1 w-full touch-target px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">器械类型</label>
                  <select
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value as EquipmentType)}
                    className="mt-1 w-full touch-target px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    {Object.entries(EQUIPMENT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">默认单位</label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as WeightUnit)}
                    className="mt-1 w-full touch-target px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="lb">英磅 (lb)</option>
                    <option value="kg">公斤 (kg)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">
                  动作发力要领（每行一条）
                </label>
                <textarea
                  rows={3}
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="核心收紧，下放控制离心 2 秒..."
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">常见避坑提醒</label>
                <input
                  type="text"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder="如：避免膝盖内扣或腰部反弓"
                  className="mt-1 w-full touch-target px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="touch-target px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateCustomExercise}
                disabled={!customName.trim()}
                className="touch-target px-5 py-2 rounded-xl bg-emerald-500 disabled:opacity-40 text-slate-950 text-xs font-extrabold"
              >
                保存至动作库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
