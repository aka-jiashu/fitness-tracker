import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell, BookOpen, Activity, Flame } from 'lucide-react';
import { db, ensureDatabaseSeeded } from './db/database';
import { ActiveWorkoutTab } from './components/ActiveWorkoutTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { ExerciseLibraryTab } from './components/ExerciseLibraryTab';
import { FloatingRestTimer } from './components/FloatingRestTimer';
import { playRestTimerBeep } from './utils/deviceHardware';

type TabKey = 'workout' | 'library' | 'analytics';

const NAV_TABS: Array<{
  key: TabKey;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { key: 'workout', label: '训练打卡', icon: Dumbbell },
  { key: 'library', label: '动作库', icon: BookOpen },
  { key: 'analytics', label: '记录与趋势', icon: Activity },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('workout');
  const [dbReady, setDbReady] = useState(false);

  // Rest Timer State
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTotalSec, setRestTotalSec] = useState(90);
  const [restRemainingSec, setRestRemainingSec] = useState(90);
  const [restExerciseName, setRestExerciseName] = useState<string>('');

  const activeSessions = useLiveQuery(
    () => db.workoutSessions.filter((s) => !s.isFinished).toArray(),
    []
  );
  const hasActiveWorkout = Boolean(activeSessions && activeSessions.length > 0);

  useEffect(() => {
    ensureDatabaseSeeded().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!restTimerActive || restRemainingSec <= 0) return;
    const timer = setInterval(() => {
      setRestRemainingSec((prev) => {
        if (prev <= 1) {
          playRestTimerBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restTimerActive, restRemainingSec]);

  const handleStartRestTimer = useCallback((seconds: number, exerciseName: string) => {
    setRestTotalSec(seconds);
    setRestRemainingSec(seconds);
    setRestExerciseName(exerciseName);
    setRestTimerActive(true);
  }, []);

  const handleAdjustRestSeconds = useCallback((delta: number) => {
    setRestRemainingSec((prev) => Math.max(0, prev + delta));
    setRestTotalSec((prev) => Math.max(15, prev + delta));
  }, []);

  const handleSetRestPreset = useCallback((seconds: number) => {
    setRestTotalSec(seconds);
    setRestRemainingSec(seconds);
  }, []);

  const handleSkipRest = useCallback(() => {
    setRestTimerActive(false);
  }, []);

  if (!dbReady) {
    return (
      <div className="min-h-dvh bg-[#090d16] text-slate-100 flex items-center justify-center p-6">
        <div className="text-sm font-bold text-slate-400">正在加载本地训练数据...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#090d16] text-slate-100 flex flex-col">
      {/* Minimalist Top Bar */}
      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 pt-safe">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-white">
              铁馆日志
            </span>
          </div>

          {/* Desktop / iPad Segmented Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`touch-target px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.key === 'workout' && hasActiveWorkout && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-slate-950' : 'bg-emerald-400 animate-ping'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Active Workout Badge */}
          {hasActiveWorkout && activeTab !== 'workout' && (
            <button
              type="button"
              onClick={() => setActiveTab('workout')}
              className="md:hidden px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>训练中</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 pt-4 pb-tabbar-safe">
        {activeTab === 'workout' && (
          <ActiveWorkoutTab onStartRestTimer={handleStartRestTimer} />
        )}
        {activeTab === 'library' && <ExerciseLibraryTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>

      {/* Compact Rest Timer */}
      <FloatingRestTimer
        remainingSeconds={restRemainingSec}
        totalSeconds={restTotalSec}
        isActive={restTimerActive}
        exerciseName={restExerciseName}
        onAdjustSeconds={handleAdjustRestSeconds}
        onSetPreset={handleSetRestPreset}
        onSkip={handleSkipRest}
      />

      {/* iPhone Bottom 3-Tab Bar */}
      <nav
        aria-label="底部导航"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#090d16]/95 backdrop-blur-md border-t border-slate-800/90 pb-safe"
      >
        <div className="grid grid-cols-3 h-14 px-2">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`touch-target flex flex-col items-center justify-center gap-1 relative transition cursor-pointer ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] leading-none">{tab.label}</span>
                {tab.key === 'workout' && hasActiveWorkout && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-8 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;
