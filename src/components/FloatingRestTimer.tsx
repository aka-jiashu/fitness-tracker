import React from 'react';
import { Timer, Plus, Minus, SkipForward, Volume2, Flame } from 'lucide-react';
import { formatDuration } from '../utils/fitnessUtils';
import { playRestTimerBeep } from '../utils/deviceHardware';

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
  onSetPreset,
  onSkip,
}) => {
  if (!isActive) return null;

  const progress = totalSeconds > 0 ? Math.max(0, Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)) : 100;
  const isFinished = remainingSeconds <= 0;

  return (
    <div
      className="fixed left-3 right-3 md:left-auto md:right-6 md:w-[440px] bottom-safe-float z-40 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl shadow-black/70 p-3.5 transition-all"
      role="region"
      aria-label="组间休息计时器"
    >
      {/* Top progress bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 ${
            isFinished ? 'bg-amber-400 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isFinished
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-bounce'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isFinished ? <Flame className="w-6 h-6" /> : <Timer className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 truncate">
                {isFinished ? '休息结束！准备下一组' : `组间休息 · ${exerciseName || '当前动作'}`}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-baseline gap-2">
              <span>{formatDuration(remainingSeconds)}</span>
              <span className="text-xs font-normal text-slate-400">/ {formatDuration(totalSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Quick step controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onAdjustSeconds(-30)}
            className="touch-target px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold flex items-center gap-0.5 border border-slate-700"
            title="减少 30 秒"
          >
            <Minus className="w-3.5 h-3.5" />
            30s
          </button>
          <button
            type="button"
            onClick={() => onAdjustSeconds(30)}
            className="touch-target px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold flex items-center gap-0.5 border border-slate-700"
            title="增加 30 秒"
          >
            <Plus className="w-3.5 h-3.5" />
            30s
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="touch-target px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-lg shadow-emerald-500/20"
          >
            <SkipForward className="w-4 h-4" />
            {isFinished ? '好的' : '跳过'}
          </button>
        </div>
      </div>

      {/* Preset pills & sound test */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">快捷时长:</span>
          {[60, 90, 120, 180].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => onSetPreset(sec)}
              className={`px-2 py-1 rounded-lg font-medium transition ${
                totalSeconds === sec
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => playRestTimerBeep()}
          className="px-2 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 flex items-center gap-1"
          title="测试提示音与震动"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>试音</span>
        </button>
      </div>
    </div>
  );
};
