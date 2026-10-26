import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Trash2, ChevronDown, X } from 'lucide-react';
import { db } from '../db/database';
import {
  Exercise,
  MuscleGroup,
  EquipmentType,
  WeightUnit,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
} from '../types/fitness';

export const ExerciseLibraryTab: React.FC = () => {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || [];
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const createDialogRef = useRef<HTMLDialogElement | null>(null);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('chest');
  const [newEquipment, setNewEquipment] = useState<EquipmentType>('dumbbell');
  const [newUnit, setNewUnit] = useState<WeightUnit>('kg');
  const [newTip, setNewTip] = useState('');

  useEffect(() => {
    const dialog = createDialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    const handleBackdrop = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };
    dialog.addEventListener('click', handleBackdrop);
    return () => dialog.removeEventListener('click', handleBackdrop);
  }, []);

  const filtered = exercises.filter((ex) => {
    const matchMuscle = muscleFilter === 'all' || ex.primaryMuscle === muscleFilter;
    const matchQuery =
      !search.trim() || ex.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchMuscle && matchQuery;
  });

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const item: Exercise = {
      id: `ex_custom_${Date.now()}`,
      name: newName.trim(),
      primaryMuscle: newMuscle,
      equipment: newEquipment,
      defaultUnit: newUnit,
      isCustom: true,
      instructions: newTip.trim() ? [newTip.trim()] : ['保持核心收紧，控制离心收缩节奏。'],
      createdAt: Date.now(),
    };
    await db.exercises.put(item);
    setNewName('');
    setNewTip('');
    createDialogRef.current?.close();
  };

  const handleDeleteCustom = async (ex: Exercise) => {
    if (!ex.isCustom) return;
    if (!window.confirm(`确定删除自定义动作「${ex.name}」吗？`)) return;
    await db.exercises.delete(ex.id);
  };

  const handleToggleUnit = async (ex: Exercise) => {
    const nextUnit: WeightUnit = ex.defaultUnit === 'kg' ? 'lb' : 'kg';
    await db.exercises.update(ex.id, { defaultUnit: nextUnit });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Search & Filter Header */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-extrabold text-white">动作库</h1>
            <p className="text-xs text-slate-400">
              共 {exercises.length} 个动作 · 点击卡片展开动作要领
            </p>
          </div>
          <button
            type="button"
            onClick={() => createDialogRef.current?.showModal()}
            className="touch-target px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增动作</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索动作名称（如：卧推、深蹲、下拉）..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(
            ['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'] as const
          ).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscleFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                muscleFilter === m
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {m === 'all' ? '全部肌群' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filtered.map((ex) => {
          const isExpanded = expandedId === ex.id;
          return (
            <div
              key={ex.id}
              className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-3.5 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                  className="text-left flex-1 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{ex.name}</span>
                      {ex.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                          自定义
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {MUSCLE_LABELS[ex.primaryMuscle]} · {EQUIPMENT_LABELS[ex.equipment]}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleToggleUnit(ex)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-emerald-400 cursor-pointer"
                    title="切换默认重量单位"
                  >
                    {ex.defaultUnit.toUpperCase()}
                  </button>
                  {ex.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(ex)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="删除自定义动作"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`expandable-panel ${isExpanded ? 'is-expanded mt-3 pt-2.5 border-t border-slate-800/80' : ''}`}
                hidden={!isExpanded}
              >
                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                  {ex.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
                {ex.tips && ex.tips.length > 0 && (
                  <p className="text-[11px] text-amber-300/90 mt-2">
                    提示：{ex.tips.join('；')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Native Dialog for Creating Custom Exercise */}
      <dialog
        ref={createDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="new-exercise-title"
        className="w-full max-w-md rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 p-5 shadow-2xl m-auto"
      >
        <form onSubmit={handleCreateExercise} className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 id="new-exercise-title" className="text-base font-extrabold text-white">
              新增自定义动作
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
            <label className="block text-xs font-bold text-slate-300 mb-1">动作名称</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例如：单臂绳索侧平举"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">主肌群</label>
              <select
                value={newMuscle}
                onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-2 text-xs text-white"
              >
                {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">器械</label>
              <select
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value as EquipmentType)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-2 text-xs text-white"
              >
                {Object.entries(EQUIPMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">默认单位</label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value as WeightUnit)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-2 text-xs text-white"
              >
                <option value="kg">KG (公斤)</option>
                <option value="lb">LB (磅)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              动作要领备注 (可选)
            </label>
            <input
              type="text"
              value={newTip}
              onChange={(e) => setNewTip(e.target.value)}
              placeholder="一句关键发力提示..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
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
              保存动作
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};
