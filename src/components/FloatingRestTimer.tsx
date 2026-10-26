import React from 'react';
import { Timer, Plus, Minus, SkipForward, Flame } from 'lucide-react';
import { formatDuration } from '../utils/fitnessUtils';

interface FloatingRestTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  isActive: boolean;
  exerciseName?: string;
  onAdjustSeconds: (delta: number) => void;
  onSetPreset: (seconds: number) => void;
  onSkip: () => void;
}

export const FloatingRestTimer: React.FC<FloatingRestTimerProps> = ({
  remainingSeconds,
  totalSeconds,
  isActive,
  exerciseName,
  onAdjustSeconds,
  onSkip,
}) => {
  if (!isActive) return null;

  const progress =
    totalSeconds > 0
      ? Math.max(0, Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
      : 100;
  const isFinished = remainingSeconds <= 0;

  return (
    <div
      className="fixed left-3 right-3 md:left-auto md:right-6 md:w-96 bottom-safe-float z-40 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl px-3.5 py-2.5"
      role="region"
      aria-label="组间休息计时器"
    >
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${
            isFinished ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isFinished
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {isFinished ? <Flame className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 truncate">
              {isFinished ? '休息完成 · 开始下一组' : `休息 · ${exerciseName || '当前动作'}`}
            </div>
            <div className="text-xl font-bold font-mono text-white leading-tight">
              {formatDuration(remainingSeconds)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onAdjustSeconds(-15)}
            className="touch-target px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
            15s
          </button>
          <button
            type="button"
            onClick={() => onAdjustSeconds(30)}
            className="touch-target px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            30s
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="touch-target px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            {isFinished ? '完成' : '跳过'}
          </button>
        </div>
      </div>
    </div>
  );
};
