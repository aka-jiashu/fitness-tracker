import confetti from 'canvas-confetti';

let wakeLockSentinel: WakeLockSentinel | null = null;

/**
 * 请求屏幕常亮防息屏 (Screen Wake Lock API)
 */
export async function requestKeepScreenOn(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      return false;
    }
  }
  return false;
}

/**
 * 释放屏幕常亮锁
 */
export function releaseKeepScreenOn(): void {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}

/**
 * 检查当前是否处于防息屏激活态
 */
export function isScreenWakeLockActive(): boolean {
  return wakeLockSentinel !== null && !wakeLockSentinel.released;
}

/**
 * 原生 Web Audio API 合成组间休息结束双音节清脆提示音 (880Hz -> 1760Hz) 与设备震动
 */
export function playRestTimerBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (e) {
    console.warn('Web Audio beep failed:', e);
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {
      // ignore vibration errors on unsupported browsers
    }
  }
}

/**
 * 触发完成组短促轻快反馈音
 */
export function playSetCheckSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.06); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    }
  } catch {
    // ignore
  }
}

/**
 * 触发破纪录 PR 或训练结课的礼花彩带动效
 */
export function triggerCelebrationConfetti(isBigWorkoutFinish = false): void {
  try {
    if (isBigWorkoutFinish) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#f59e0b', '#34d399'],
      });
    } else {
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#10b981', '#38bdf8'],
      });
    }
  } catch {
    // ignore confetti error in headless environments
  }
}
