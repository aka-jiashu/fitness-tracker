import { WeightUnit, WorkoutSession, WorkoutSet } from '../types/fitness';

export const LB_TO_KG = 0.45359237;
export const KG_TO_LB = 2.20462262;

/**
 * 将任意重量按单位转换为标准公斤 (kg)
 */
export function toKg(weight: number, unit: WeightUnit): number {
  if (!weight || weight <= 0) return 0;
  return unit === 'lb' ? weight * LB_TO_KG : weight;
}

/**
 * 单位互转并保留合理精度（步进友好）
 */
export function convertWeight(weight: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  if (fromUnit === toUnit) return weight;
  const raw = fromUnit === 'lb' ? weight * LB_TO_KG : weight * KG_TO_LB;
  return Math.round(raw * 2) / 2; // 精确到 0.5
}

/**
 * 计算单组折算为 kg 的容量 (Volume = weight_kg * reps)
 */
export function calculateSetVolumeKg(set: Pick<WorkoutSet, 'weight' | 'unit' | 'reps' | 'isCompleted' | 'isSkipped'>): number {
  if (!set.isCompleted || set.isSkipped) return 0;
  const weightKg = toKg(set.weight, set.unit);
  return Math.round(weightKg * (set.reps || 0) * 10) / 10;
}

/**
 * 计算会话总容量 (kg)
 */
export function calculateSessionVolumeKg(sets: WorkoutSet[]): number {
  const total = sets.reduce((acc, s) => acc + calculateSetVolumeKg(s), 0);
  return Math.round(total);
}

/**
 * 估算单次最大重量 1RM (返回以原单位及 kg 为基准的估算值)
 * 采用 Epley 公式与高次数降权算法
 */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps <= 12) {
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
  }
  // reps > 12 降权处理
  return Math.round(weight * (1 + 12 / 30 + (reps - 12) / 50) * 10) / 10;
}

/**
 * 估算折算为 kg 的 1RM（用于跨单位统一比较是否打破 PR）
 */
export function estimate1RMKg(weight: number, reps: number, unit: WeightUnit): number {
  const weightKg = toKg(weight, unit);
  return estimate1RM(weightKg, reps);
}

/**
 * 格式化秒数为 MM:SS 或 HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface ProgressionRecommendation {
  isReady: boolean;
  fiveStarCount: number;
  suggestedDeltaWeight: number;
  unit: WeightUnit;
  message: string;
}

/**
 * 评估动作进阶资格：统计该动作在历史已完成会话及当前进行中会话中，获得 5 星达成度评分 (exerciseRatings[exerciseId] === 5) 的累计次数。
 * 当累计获得至少 2 次 5 星评分时，判定具备渐进超负荷进阶条件。
 */
export function evaluateExerciseProgression(
  sessions: WorkoutSession[],
  exerciseId: string,
  defaultUnit: WeightUnit = 'lb'
): ProgressionRecommendation {
  const fiveStarCount = sessions.filter(
    (s) => s.exerciseRatings?.[exerciseId] === 5
  ).length;
  const isReady = fiveStarCount >= 2;
  const suggestedDeltaWeight = defaultUnit === 'lb' ? 5 : 2.5;
  const deltaLabel = defaultUnit === 'lb' ? '+5lb/+2.5kg' : '+2.5kg/+5lb';

  return {
    isReady,
    fiveStarCount,
    suggestedDeltaWeight,
    unit: defaultUnit,
    message: isReady
      ? `🌟 累计 ${fiveStarCount} 次满星！该动作已轻松掌握，建议下次提升重量(${deltaLabel})或增加组数`
      : '',
  };
}
