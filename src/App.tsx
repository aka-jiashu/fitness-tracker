import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Dumbbell,
  Calendar,
  Activity,
  BookOpen,
  UserCheck,
  WifiOff,
  Flame,
} from 'lucide-react';
import { db, ensureDatabaseSeeded } from './db/database';
import { ActiveWorkoutTab } from './components/ActiveWorkoutTab';
import { RoutinesTab } from './components/RoutinesTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { ExerciseLibraryTab } from './components/ExerciseLibraryTab';
import { BodyMetricsSettingsTab } from './components/BodyMetricsSettingsTab';
import { FloatingRestTimer } from './components/FloatingRestTimer';
import { playRestTimerBeep } from './utils/deviceHardware';

type TabKey = 'workout' | 'routines' | 'analytics' | 'library' | 'metrics';

const NAV_TABS: Array<{
  key: TabKey;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { key: 'workout', label: '今日训练', shortLabel: '训练', icon: Dumbbell },
  { key: 'routines', label: '计划排期', shortLabel: '计划', icon: Calendar },
  { key: 'analytics', label: '肌群与历史', shortLabel: '分析', icon: Activity },
  { key: 'library', label: '动作百科', shortLabel: '百科', icon: BookOpen },
  { key: 'metrics', label: '体征与备份', shortLabel: '体征', icon: UserCheck },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('workout');
  const [dbReady, setDbReady] = useState(false);

  // Global Floating Rest Timer State
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTotalSec, setRestTotalSec] = useState(90);
  const [restRemainingSec, setRestRemainingSec] = useState(90);
  const [restExerciseName, setRestExerciseName] = useState<string>('');

  // Check if there is an unfinished workout session
  const activeSessions = useLiveQuery(
    () => db.workoutSessions.filter((s) => !s.isFinished).toArray(),
    []
  );
  const hasActiveWorkout = Boolean(activeSessions && activeSessions.length > 0);

  useEffect(() => {
    ensureDatabaseSeeded().then(() => setDbReady(true));
  }, []);

  // Countdown tick for Rest Timer
  useEffect(() => {
    if (!restTimerActive) return;
    if (restRemainingSec <= 0) return;

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
      <div className="min-h-dvh bg-[#0f172a] text-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-pulse">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-300">正在加载本地离线训练引擎...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0f172a] text-slate-100 flex flex-col">
      {/* Top App Bar (iOS Safe Area Top + iPad/Desktop Horizontal Tab Navigation) */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 pt-safe">
        <div className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
              <Dumbbell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">
                  铁馆日志
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" />
                  <span>离线优先 PWA</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                单手大步进 · 独立单位记忆 (lb/kg) · 本地 IndexedDB 存储
              </p>
            </div>
          </div>

          {/* iPad & Desktop Navigation Bar */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`touch-target px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
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

          {/* Mobile Active Workout Quick Badge */}
          {hasActiveWorkout && activeTab !== 'workout' && (
            <button
              type="button"
              onClick={() => setActiveTab('workout')}
              className="md:hidden px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-extrabold flex items-center gap-1 shadow-lg shadow-emerald-500/30 animate-pulse"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>训练进行中</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 pt-4 pb-tabbar-safe">
        {activeTab === 'workout' && (
          <ActiveWorkoutTab
            onStartRestTimer={handleStartRestTimer}
            onNavigateToRoutines={() => setActiveTab('routines')}
          />
        )}
        {activeTab === 'routines' && (
          <RoutinesTab onWorkoutStarted={() => setActiveTab('workout')} />
        )}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'library' && <ExerciseLibraryTab />}
        {activeTab === 'metrics' && <BodyMetricsSettingsTab />}
      </main>

      {/* Global Floating Rest Timer (persists across tabs) */}
      <FloatingRestTimer
        remainingSeconds={restRemainingSec}
        totalSeconds={restTotalSec}
        isActive={restTimerActive}
        exerciseName={restExerciseName}
        onAdjustSeconds={handleAdjustRestSeconds}
        onSetPreset={handleSetRestPreset}
        onSkip={handleSkipRest}
      />

      {/* iPhone Fixed Bottom Thumb TabBar (64px + iOS Safe Area Bottom) */}
      <nav
        aria-label="底部主导航"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 px-1">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`touch-target flex flex-col items-center justify-center gap-1 relative transition ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`px-3 py-1 rounded-full transition ${
                    isActive ? 'bg-emerald-500/15' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] leading-none">{tab.shortLabel}</span>
                {tab.key === 'workout' && hasActiveWorkout && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-5 animate-ping" />
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
