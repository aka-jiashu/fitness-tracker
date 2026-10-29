// ==================== 1. 基础枚举与公用类型 ====================
export type MuscleGroup =
  | 'chest'      // 胸部
  | 'back'       // 背部
  | 'legs'       // 腿部 (股四头/股二头/小腿)
  | 'shoulders'  // 肩部 (前束/中束/后束)
  | 'arms'       // 手臂 (二头/三头)
  | 'core'       // 核心/腹部
  | 'cardio'     // 有氧/全身
  | 'other';

export type EquipmentType =
  | 'barbell'    // 杠铃
  | 'dumbbell'   // 哑铃
  | 'machine'    // 固定器械
  | 'cable'      // 绳索滑轮
  | 'bodyweight' // 自重/无负重
  | 'band'       // 弹力带
  | 'other';

export type WeightUnit = 'kg' | 'lb';

export type SetType = 'warmup' | 'normal' | 'drop' | 'failure';

// ==================== 2. 动作字典表 (Exercise) ====================
export interface Exercise {
  id: string;                     // 唯一标识 (如 'ex_db_bench_press')
  name: string;                   // 动作名称 (如 '哑铃卧推')
  nameEn?: string;                // 英文名称
  primaryMuscle: MuscleGroup;     // 主要目标肌群
  secondaryMuscles?: MuscleGroup[]; // 辅助肌群
  equipment: EquipmentType;       // 器械类型
  defaultUnit: WeightUnit;        // 默认单位记忆 ('kg' | 'lb')
  isCustom: boolean;              // 是否为用户自定义动作
  instructions: string[];         // 动作要领步骤
  tips?: string[];                // 常见易错警示
  mediaPlaceholder?: string;      // 演示图或矢量动图路径
  createdAt: number;
}

// ==================== 3. 训练计划与模板 (Routine) ====================
export interface RoutineExercise {
  exerciseId: string;
  targetSets: number;             // 预设目标组数 (如 4)
  targetReps: number;             // 预设目标次数 (如 12)
  targetUnit: WeightUnit;
  restSeconds: number;            // 推荐休息时长 (如 90)
  notes?: string;                 // 备注要求
}

export interface Routine {
  id: string;
  name: string;                   // 计划名称 (如 '推拉腿 - 腿日')
  description?: string;
  splitType: 'PPL' | 'UpperLower' | 'Split4' | 'FullBody' | 'Custom';
  dayOfWeek?: number;             // 推荐周期：0 (周日) ~ 6 (周六)
  exercises: RoutineExercise[];
  isBuiltin: boolean;
  createdAt: number;
}

// ==================== 4. 训练日志与组明细 (Workout & Sets) ====================
export interface WorkoutSet {
  id: string;
  sessionId: string;              // 所属训练会话 ID
  exerciseId: string;
  setOrder: number;               // 第几组 (1, 2, 3...)
  setType: SetType;               // 组类型
  weight: number;                 // 重量 (0 表示自重/空)
  unit: WeightUnit;               // 本组单位 ('kg' | 'lb')
  reps: number;                   // 完成次数
  rpe?: number;                   // 主观疲劳度 (1-10)
  isCompleted: boolean;           // 是否打勾完成
  isSkipped?: boolean;            // 是否跳过未做
  isPR?: boolean;                 // 是否打破个人历史最好成绩
  notes?: string;                 // 单组或动作内随手记
  completedAt?: number;
}

export interface WorkoutSession {
  id: string;
  name: string;                   // 会话名称 (如 '周一腿日力量训练')
  routineId?: string;             // 关联的计划模板 ID (可选)
  startTime: number;              // 开始时间戳
  endTime?: number;               // 结束时间戳
  durationSeconds: number;        // 总训练时长 (秒)
  totalVolumeKg: number;          // 统一折算为 kg 的训练总容量
  feelingNotes?: string;          // 训练心得与感受 (如 '器械宽距高位下拉变轻松了呢！')
  exerciseNotes?: Record<string, string>; // 针对单个动作的随手便签
  exerciseRatings?: Record<string, number>; // 针对单个动作全部做完后的 1~5 星达成度评分 (exerciseId -> 1~5)
  exerciseOrder: string[];        // 当天完成的动作 ID 列表
  isFinished: boolean;            // 是否已结课完成
  createdAt: number;
}

// ==================== 5. 身体体征数据 (BodyMetric) ====================
export interface BodyMetric {
  id: string;
  date: string;                   // 日期格式 'YYYY-MM-DD'
  weightKg?: number;              // 体重 (kg)
  bodyFatRate?: number;           // 体脂率 (%)
  muscleMassKg?: number;          // 骨骼肌 (kg)
  chestCircumferenceCm?: number;  // 胸围 (cm)
  waistCircumferenceCm?: number;  // 腰围 (cm)
  hipCircumferenceCm?: number;    // 臀围 (cm)
  leftArmCm?: number;             // 左大臂围 (cm)
  rightArmCm?: number;            // 右大臂围 (cm)
  leftThighCm?: number;           // 左大腿围 (cm)
  rightThighCm?: number;          // 右大腿围 (cm)
  notes?: string;
  createdAt: number;
}

export interface BackupPayload {
  version: number;
  exportedAt: number;
  appName: 'FitnessTracker';
  data: {
    exercises: Exercise[];
    routines: Routine[];
    workoutSessions: WorkoutSession[];
    workoutSets: WorkoutSet[];
    bodyMetrics: BodyMetric[];
  };
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: '胸部',
  back: '背部',
  legs: '腿部',
  shoulders: '肩部',
  arms: '手臂',
  core: '核心',
  cardio: '有氧/全身',
  other: '其他',
};

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  machine: '固定器械',
  cable: '绳索滑轮',
  bodyweight: '自重',
  band: '弹力带',
  other: '其他器材',
};

export const SET_TYPE_META: Record<SetType, { label: string; short: string; color: string }> = {
  warmup: { label: '热身组', short: 'W', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  normal: { label: '正式组', short: 'N', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  drop: { label: '递减组', short: 'D', color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
  failure: { label: '力竭组', short: 'F', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
};
