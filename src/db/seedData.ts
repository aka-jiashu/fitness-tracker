import {
  Exercise,
  Routine,
  WorkoutSession,
  WorkoutSet,
  BodyMetric,
  WeightUnit,
  SetType,
} from '../types/fitness';
import { calculateSessionVolumeKg, estimate1RMKg } from '../utils/fitnessUtils';

const BASE_TIME = new Date('2026-07-01T10:00:00+08:00').getTime();

// ==================== 1. 预置动作库 (覆盖用户真实日志全部动作 + 经典扩充) ====================
export const INITIAL_EXERCISES: Exercise[] = [
  // --- 胸部 (Chest) ---
  {
    id: 'ex_db_bench_press',
    name: '哑铃卧推',
    nameEn: 'Dumbbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'arms'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '平躺在卧推凳上，双脚踩实地面，沉肩收紧肩胛骨贴紧凳面。',
      '双手持哑铃置于胸侧，手肘与躯干呈 45-60 度夹角。',
      '呼气胸大肌发力推起至胸上方，吸气缓慢下放充分拉伸。',
    ],
    tips: ['避免手肘外展成 90 度减少肩关节压力', '全程维持肩胛骨后缩下沉'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_incline_db_press',
    name: '上斜哑铃卧推',
    nameEn: 'Incline Dumbbell Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'arms'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '将训练凳调至 30°~45° 上斜角，挺胸沉肩靠稳。',
      '哑铃下放至锁骨外侧，充分拉伸上胸肌纤维。',
      '沿锁骨上方向内上方推起并挤压上胸。',
    ],
    tips: ['角度不宜过高以免三角肌前束过多代偿', '离心下放控制 2 秒'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_fly',
    name: '哑铃飞鸟',
    nameEn: 'Dumbbell Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '仰卧平凳，双手对握哑铃举至胸正上方，手肘微屈固定如抱树状。',
      '吸气向身体两侧画弧线下放，感受胸大肌拉伸。',
      '呼气用胸肌内收力量带动大臂合拢。',
    ],
    tips: ['底部切勿过度下放拉伤肩前囊', '手肘角度全程固定不变'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_incline_db_fly',
    name: '上斜哑铃飞鸟',
    nameEn: 'Incline Dumbbell Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '仰卧于 30° 上斜凳，双手对握哑铃于锁骨正上方，微屈手肘。',
      '向两侧缓慢展开大臂，感受上胸外侧与锁骨部拉伸。',
      '上胸发力将大臂向内合拢挤压。',
    ],
    tips: ['专注上胸中缝挤压感', '下放时沉肩不耸肩'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_machine_chest_press',
    name: '器械推胸',
    nameEn: 'Machine Chest Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['arms', 'shoulders'],
    equipment: 'machine',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '调整座椅高度使握把平齐中下胸位置，背部贴紧靠背。',
      '沉肩收紧肩胛，呼气胸肌发力向前推起。',
      '顶峰微停顿后有控制地还原，配重片不完全撞击卸力。',
    ],
    tips: ['推起时肩膀不要离开靠垫前引'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_pec_deck_fly',
    name: '器械夹胸',
    nameEn: 'Pec Deck Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'machine',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '调整座椅高度使大臂与地面接近平行，背部贴紧靠垫。',
      '肘部微屈固定，用大臂内收力量将把手合拢至胸前。',
      '顶峰强烈挤压胸肌中缝 1~2 秒后缓慢放回。',
    ],
    tips: ['想象用手肘向中间靠拢，而非手掌发力'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_butterfly_pec_fly',
    name: '器械蝴蝶机夹胸',
    nameEn: 'Butterfly Machine Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'machine',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '坐稳蝴蝶机，小臂或手掌贴靠阻力垫，挺胸沉肩。',
      '胸大肌收缩带动双臂向胸前中线合拢。',
      '顶峰停顿挤压中缝，离心控制缓慢打开。',
    ],
    tips: ['还原时不要让配重片完全落底卸力'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_cable_chest_fly',
    name: '龙门架绳索夹胸',
    nameEn: 'Cable Crossover Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '站在龙门架中央往前迈半步稳定重心，躯干微前倾。',
      '手肘微屈固定，双臂呈环抱大树状向胸前下方聚拢。',
      '在胸前交叉点强烈挤压胸肌中下缘，缓慢还原。',
    ],
    tips: ['身体保持稳定不前后摇晃借力'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_incline_close_grip_bb_press',
    name: '上斜窄距杠铃卧推',
    nameEn: 'Incline Close-Grip Barbell Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['arms', 'shoulders'],
    equipment: 'barbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '仰卧上斜凳，双手以与肩同宽或略窄握距持杠。',
      '手肘贴近躯干下放杠铃至上胸锁骨下方。',
      '上胸内侧与肱三头肌协同发力推起。',
    ],
    tips: ['握距不宜过窄以免手腕不适'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_close_grip_db_press',
    name: '窄距哑铃卧推',
    nameEn: 'Close-Grip Neutral Dumbbell Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['arms'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '仰卧平凳，双手对握两只哑铃并使其相互贴紧于胸正上方。',
      '保持两只哑铃持续互推挤压，贴胸下放再垂直推起。',
    ],
    tips: ['全程保持两只哑铃紧贴对抗，强烈刺激胸肌内侧中缝'],
    createdAt: BASE_TIME,
  },

  // --- 背部 (Back) ---
  {
    id: 'ex_band_pull_up',
    name: '弹力带辅助引体向上',
    nameEn: 'Band-Assisted Pull-Up',
    primaryMuscle: 'back',
    secondaryMuscles: ['arms', 'core'],
    equipment: 'band',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '将弹力带系于单杠并套在脚掌或膝盖下，双手宽握单杠悬垂。',
      '先启动肩胛骨下压（沉肩），背阔肌发力将身体拉起至下巴过杠。',
      '顶峰停顿感受背阔肌收缩，缓慢下放还原。',
    ],
    tips: ['核心收紧避免晃腿借力', '想象将手肘向下插进后裤兜'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_row',
    name: '哑铃俯身划船',
    nameEn: 'Dumbbell Bent-Over Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['arms', 'core'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '屈髋俯身保持背部平直（或单手扶凳支撑），核心收紧。',
      '手持哑铃沿弧线向后上方拉至髋部外侧，手肘贴近身体。',
      '顶峰挤压背阔肌后缓慢下放充分拉伸。',
    ],
    tips: ['哑铃拉向胯部而非胸口，避免二头肌过多代偿'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_seated_cable_row',
    name: '器械坐姿划船',
    nameEn: 'Seated Cable Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['arms', 'shoulders'],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '双脚踩实踏板，膝盖微屈，挺胸保持脊柱中立。',
      '沉肩带动手肘贴近体侧向后拉至腹部。',
      '顶峰强烈夹紧肩胛骨 1 秒，缓慢放回。',
    ],
    tips: ['切勿靠躯干大幅度前后摇摆借力'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_wide_lat_pulldown',
    name: '器械宽距高位下拉',
    nameEn: 'Wide-Grip Lat Pulldown',
    primaryMuscle: 'back',
    secondaryMuscles: ['arms'],
    equipment: 'machine',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '固定大腿压垫，双手 1.5 倍肩宽握杆，身体微后倾 10°。',
      '沉肩启动，背阔肌发力带动手肘垂直下拉至锁骨上方。',
      '控制离心缓慢放回，充分拉伸背阔肌外侧宽度。',
    ],
    tips: ['小臂保持垂直，用背阔肌带手肘而非手腕硬拉'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_lat_pulldown',
    name: '器械高位下拉',
    nameEn: 'Machine Lat Pulldown',
    primaryMuscle: 'back',
    secondaryMuscles: ['arms'],
    equipment: 'machine',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '坐稳并压紧大腿垫，双手握住下拉杆，挺胸沉肩。',
      '背阔肌发力将握把拉至上胸位置，顶峰停顿 1 秒。',
    ],
    tips: ['还原时肩膀适度上延拉伸背阔肌，拉起前先沉肩'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_cable_lat_pulldown',
    name: '龙门架绳索高位下拉',
    nameEn: 'Cable High Pulldown',
    primaryMuscle: 'back',
    secondaryMuscles: ['arms'],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '于龙门架高位滑轮跪姿或坐姿固定，双手抓握下拉把手。',
      '沉肩挺胸，沿身体前侧将把手下拉至胸前，挤压背阔肌。',
    ],
    tips: ['自由滑轮轨迹更贴合肩关节自然活动度'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_straight_arm_pulldown',
    name: '器械俯身直臂下压',
    nameEn: 'Straight-Arm Pulldown',
    primaryMuscle: 'back',
    secondaryMuscles: ['core'],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '面对高位滑轮退后一步，屈髋俯身约 45°，手肘微屈固定。',
      '背阔肌发力将直杆或绳索沿弧线向下压至大腿前侧。',
      '顶峰强烈收缩背阔肌下缘 1 秒，缓慢抬起还原。',
    ],
    tips: ['不要过度屈肘变成三头下压，专注腋下背阔肌发力'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_deadlift',
    name: '哑铃硬拉',
    nameEn: 'Dumbbell Deadlift',
    primaryMuscle: 'back',
    secondaryMuscles: ['legs', 'core'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '双脚与髋同宽，双手持哑铃贴于小腿前侧，挺胸收紧腰背。',
      '臀腿与下背部协同发力蹬地站直，顶峰夹臀不超伸腰椎。',
    ],
    tips: ['全程保持腰背挺直，切勿弓背拉起'],
    createdAt: BASE_TIME,
  },

  // --- 肩部 (Shoulders) ---
  {
    id: 'ex_db_shoulder_press',
    name: '哑铃推举',
    nameEn: 'Dumbbell Shoulder Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['arms'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '坐姿靠稳，双手持哑铃举至耳侧，手肘微向前内收约 30°。',
      '三角肌发力将哑铃向头顶上方推起，缓慢下放至耳垂高度。',
    ],
    tips: ['核心绷紧避免挺腰借力，在肩胛平面推举更护肩'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_front_raise',
    name: '哑铃前平举',
    nameEn: 'Dumbbell Front Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['chest'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '自然站立核心收紧，双手持哑铃置于大腿前侧。',
      '手肘微屈固定，三角肌前束发力将哑铃向前平举至视线高度，缓慢下放。',
    ],
    tips: ['不要晃动躯干甩起重量，下放控制离心'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_lateral_raise',
    name: '哑铃侧平举',
    nameEn: 'Dumbbell Lateral Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '站立或坐姿微前倾，沉肩锁死斜方肌，手肘微屈。',
      '三角肌中束发力将双臂向远方两侧展开至与肩平齐，缓慢还原。',
    ],
    tips: ['想象把哑铃往两侧墙壁远推，而非耸肩上提'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_cable_lateral_raise',
    name: '龙门架单臂绳索侧平举',
    nameEn: 'Single-Arm Cable Lateral Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '侧对龙门架低位滑轮，内侧手扶柱稳定，外侧手持单柄。',
      '保持沉肩微屈肘，三角肌中束发力将绳索向侧上方拉起至水平。',
    ],
    tips: ['绳索在底部依然提供恒定张力，控制离心放回'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_rear_delt_fly',
    name: '俯身哑铃飞鸟',
    nameEn: 'Bent-Over Rear Delt Fly',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '屈髋俯身使躯干接近平行地面，双手持哑铃自然下垂。',
      '手肘微屈向身体两侧外上方展开，专注三角肌后束发力。',
    ],
    tips: ['不要刻意过度夹紧肩胛骨，让张力集中在三角肌后束'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_face_pull',
    name: '绳索面拉',
    nameEn: 'Cable Face Pull',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '将滑轮调至面部高度，双手握住双头绳向额头方向拉开。',
      '拉起同时做肩外旋打开大臂，挤压三角肌后束与肩袖肌群。',
    ],
    tips: ['核心收紧不后仰借力，强化肩关节稳定与后束立体感'],
    createdAt: BASE_TIME,
  },

  // --- 手臂 (Arms / Triceps) ---
  {
    id: 'ex_cable_straight_bar_pushdown',
    name: '绳索直杆下压',
    nameEn: 'Straight-Bar Tricep Pushdown',
    primaryMuscle: 'arms',
    secondaryMuscles: [],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '面对高位滑轮，双手正握直杆，上身微前倾，大臂贴紧身体两侧锁定。',
      '肱三头肌发力将直杆向下压到底，顶峰锁定 1 秒后控制还原。',
    ],
    tips: ['只有小臂围绕肘关节移动，大臂严禁前后晃动'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_overhead_tricep_ext',
    name: '哑铃颈后臂屈伸',
    nameEn: 'Overhead Dumbbell Tricep Extension',
    primaryMuscle: 'arms',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '坐姿或站姿，双手托住一只哑铃内侧举过头顶，大臂贴近耳朵垂直地面。',
      '保持大臂不动，屈肘将哑铃下放至颈后，充分拉伸三头肌长头后推起。',
    ],
    tips: ['手肘尽量朝前内收不要向两侧外撇'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_tricep_kickback',
    name: '哑铃俯身臂屈伸',
    nameEn: 'Dumbbell Tricep Kickback',
    primaryMuscle: 'arms',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '屈髋俯身，将大臂抬起与躯干平行并贴紧体侧固定。',
      '肱三头肌发力将小臂向后上方完全伸直，顶峰停顿 1 秒。',
    ],
    tips: ['大臂全程固定高于或平齐背部，切勿靠惯性甩动'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_cable_tricep_pushdown',
    name: '绳索三头下压',
    nameEn: 'Rope Tricep Pushdown',
    primaryMuscle: 'arms',
    secondaryMuscles: [],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '双手抓握双头绳末端，大臂贴紧肋骨两侧固定。',
      '向下压到底端时双手顺势向两侧扒开绳索，挤压三头肌外侧头。',
    ],
    tips: ['双肩下沉，顶峰充分伸直肘关节'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_bench_dips',
    name: '凳上臂屈伸',
    nameEn: 'Bench Dips',
    primaryMuscle: 'arms',
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: 'bodyweight',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '背对长凳双手撑于凳面边缘，双腿向前伸直或微屈脚跟触地。',
      '臀部贴近凳边垂直屈肘下沉至大臂平行地面，三头肌发力撑起。',
    ],
    tips: ['后背贴近凳子边缘，下放不宜过深以免肩关节前侧压力过大'],
    createdAt: BASE_TIME,
  },

  // --- 腿部 (Legs) ---
  {
    id: 'ex_db_squat',
    name: '哑铃深蹲',
    nameEn: 'Dumbbell Squat',
    primaryMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '双手持哑铃于体侧或胸前高脚杯托握，双脚与肩同宽。',
      '挺胸收腹，屈髋屈膝垂直下蹲至大腿平行地面，全脚掌发力蹬起。',
    ],
    tips: ['膝盖与脚尖方向一致，切勿内扣'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_wide_db_squat',
    name: '宽距哑铃深蹲',
    nameEn: 'Wide-Stance Dumbbell Sumo Squat',
    primaryMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '双脚宽距站立（约 1.5 倍肩宽），脚尖外展 45°，双手持哑铃自然下垂于体前。',
      '保持躯干挺直下蹲，重点刺激大腿内收肌群与臀腿，蹬地还原。',
    ],
    tips: ['下蹲时主动向外推开膝盖对齐脚尖'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_rdl',
    name: '哑铃罗马尼亚硬拉',
    nameEn: 'Dumbbell Romanian Deadlift',
    primaryMuscle: 'legs',
    secondaryMuscles: ['back', 'core'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '双手持哑铃贴近大腿前侧，膝盖微屈约 15° 固定。',
      '臀部水平向后推，哑铃贴着小腿缓慢下放至小腿中段。',
      '感受腘绳肌强烈牵拉后，臀大肌发力向前顶髋站直。',
    ],
    tips: ['腰背全程笔直如钢板，靠屈髋向后推臀而非弯腰'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_db_lunge',
    name: '箭步蹲',
    nameEn: 'Dumbbell Lunge',
    primaryMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'dumbbell',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '双手持哑铃于体侧（或徒手热身），前后分腿站立。',
      '躯干微前倾 15°，屈膝下沉至前后膝约呈 90°，前脚脚跟发力蹬回。',
    ],
    tips: ['保持骨盆端正，前膝稳定不内扣'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_narrow_jump_squat',
    name: '窄距深蹲跳',
    nameEn: 'Narrow-Stance Jump Squat',
    primaryMuscle: 'legs',
    secondaryMuscles: ['cardio', 'core'],
    equipment: 'bodyweight',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '双脚与髋同宽或略窄站立，徒手下蹲蓄力后臀腿爆发向上跃起。',
      '落地时前脚掌过渡全脚掌并顺势屈膝缓冲进入下一次跳跃。',
    ],
    tips: ['落地务必轻盈缓冲保护膝踝关节'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_leg_extension',
    name: '器械腿屈伸',
    nameEn: 'Leg Extension',
    primaryMuscle: 'legs',
    secondaryMuscles: [],
    equipment: 'machine',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '坐稳器械，滚垫压于脚踝上方，双手抓牢两侧握把。',
      '股四头肌发力将小腿向上踢直，顶峰收缩停顿 1 秒后缓慢下放。',
    ],
    tips: ['臀部紧贴座椅，离心下放保持控制'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_wide_leg_press',
    name: '宽距器械蹬腿机',
    nameEn: 'Wide-Stance Leg Press',
    primaryMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'machine',
    defaultUnit: 'kg',
    isCustom: false,
    instructions: [
      '坐入倒蹬机，双脚偏宽踩稳踏板，脚尖微外展。',
      '缓慢屈膝下放至大腿接近胸腹，脚跟发力蹬起，顶峰膝盖微屈不锁死。',
    ],
    tips: ['严禁在顶峰完全锁死膝关节'],
    createdAt: BASE_TIME,
  },
  {
    id: 'ex_cable_hip_abduction',
    name: '龙门架绳索侧抬腿',
    nameEn: 'Cable Hip Abduction',
    primaryMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'cable',
    defaultUnit: 'lb',
    isCustom: false,
    instructions: [
      '将脚踝扣环连接低位滑轮套在外侧脚踝上，手扶龙门架站稳。',
      '臀中肌发力将外侧腿向侧后方约 30° 抬起，顶峰停顿后缓慢还原。',
    ],
    tips: ['骨盆保持稳定，不要靠侧倾躯干借力'],
    createdAt: BASE_TIME,
  },
];

// ==================== 2. 专属训练计划模板 (基于用户最新 9-10 月训练结构定制) ====================
export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'routine_user_legs',
    name: '周一 · 臀腿综合训练 (腿日)',
    description: '深蹲 + 罗马尼亚硬拉 + 箭步蹲 + 深蹲跳 + 腿屈伸 + 蹬腿机完整下肢动作链。',
    splitType: 'Split4',
    dayOfWeek: 1, // 周一
    isBuiltin: true,
    createdAt: BASE_TIME,
    exercises: [
      { exerciseId: 'ex_db_squat', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '前2组空手热身，后4组35lb正式组' },
      { exerciseId: 'ex_db_rdl', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '60lb×2组 + 70lb×4~6组' },
      { exerciseId: 'ex_db_lunge', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '50lb×2组 + 60lb×4组' },
      { exerciseId: 'ex_narrow_jump_squat', targetSets: 4, targetReps: 12, targetUnit: 'kg', restSeconds: 60, notes: '空手自重爆发跳' },
      { exerciseId: 'ex_leg_extension', targetSets: 2, targetReps: 12, targetUnit: 'kg', restSeconds: 60, notes: '15kg 股四头肌孤立充血' },
      { exerciseId: 'ex_wide_leg_press', targetSets: 6, targetReps: 15, targetUnit: 'kg', restSeconds: 90, notes: '65kg×12×2 + 75kg×15×4' },
    ],
  },
  {
    id: 'routine_user_chest',
    name: '周二 · 胸部轰炸 (平胸+上斜+器械)',
    description: '哑铃卧推冲重量 + 飞鸟拉伸 + 器械推胸与夹胸 + 上斜卧推与飞鸟收尾。',
    splitType: 'Split4',
    dayOfWeek: 2, // 周二
    isBuiltin: true,
    createdAt: BASE_TIME,
    exercises: [
      { exerciseId: 'ex_db_bench_press', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '35lb/40lb渐进，主力组 45lb~50lb' },
      { exerciseId: 'ex_db_fly', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '25lb×2 + 30lb×4' },
      { exerciseId: 'ex_machine_chest_press', targetSets: 6, targetReps: 12, targetUnit: 'kg', restSeconds: 90, notes: '35kg×2 + 45kg×4' },
      { exerciseId: 'ex_pec_deck_fly', targetSets: 6, targetReps: 12, targetUnit: 'kg', restSeconds: 60, notes: '25kg×2 + 30kg×4' },
      { exerciseId: 'ex_incline_db_press', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '25lb×2 + 30lb×4' },
      { exerciseId: 'ex_incline_db_fly', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '20lb×2 + 25lb×4' },
    ],
  },
  {
    id: 'routine_user_back',
    name: '周四 · 背部与后束强化 (背日)',
    description: '坐姿划船 + 直臂下压 + 哑铃俯身划船 + 绳索面拉 + 宽距高位下拉 + 辅助引体。',
    splitType: 'Split4',
    dayOfWeek: 4, // 周四
    isBuiltin: true,
    createdAt: BASE_TIME,
    exercises: [
      { exerciseId: 'ex_seated_cable_row', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '120lb×2 + 130lb×4' },
      { exerciseId: 'ex_straight_arm_pulldown', targetSets: 6, targetReps: 15, targetUnit: 'lb', restSeconds: 60, notes: '50lb×2 + 60lb×4' },
      { exerciseId: 'ex_db_row', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '35lb×2 + 40lb×4' },
      { exerciseId: 'ex_face_pull', targetSets: 6, targetReps: 15, targetUnit: 'lb', restSeconds: 60, notes: '50lb×2 + 60lb×4' },
      { exerciseId: 'ex_wide_lat_pulldown', targetSets: 6, targetReps: 12, targetUnit: 'kg', restSeconds: 90, notes: '25kg×2 + 30kg×4（变轻松了呢！）' },
      { exerciseId: 'ex_band_pull_up', targetSets: 4, targetReps: 12, targetUnit: 'kg', restSeconds: 90, notes: '弹力带辅助引体 12×4' },
    ],
  },
  {
    id: 'routine_user_shoulders_arms',
    name: '周五 · 肩部与三头联合 (肩臂日)',
    description: '哑铃推举 + 前平举 + 俯身飞鸟打造立体三角肌，配合颈后臂屈伸、直杆下压、三头下压与凳上臂屈伸全面轰炸三头肌。',
    splitType: 'Split4',
    dayOfWeek: 5, // 周五
    isBuiltin: true,
    createdAt: BASE_TIME,
    exercises: [
      { exerciseId: 'ex_db_shoulder_press', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90, notes: '25lb×2 + 30lb×2 + 35lb×2' },
      { exerciseId: 'ex_db_overhead_tricep_ext', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '25lb×15×2 + 30lb×12×2 + 35lb×12×2' },
      { exerciseId: 'ex_db_front_raise', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '10lb×15×2 + 15lb×12×4' },
      { exerciseId: 'ex_cable_straight_bar_pushdown', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '60lb×2 + 70lb×1 + 80lb×3' },
      { exerciseId: 'ex_rear_delt_fly', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '20lb×2 + 25lb×4' },
      { exerciseId: 'ex_cable_tricep_pushdown', targetSets: 5, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '20lb×1 + 30lb×2 + 40lb×2' },
      { exerciseId: 'ex_bench_dips', targetSets: 4, targetReps: 12, targetUnit: 'kg', restSeconds: 60, notes: '自重 12×4' },
      { exerciseId: 'ex_db_tricep_kickback', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60, notes: '15lb×2 + 20lb×4' },
    ],
  },
  {
    id: 'routine_user_incline_chest',
    name: '备选 · 上斜胸与中缝专项',
    description: '以上斜哑铃卧推、上斜飞鸟与龙门架/蝴蝶机夹胸为主的上胸强化模板。',
    splitType: 'Custom',
    dayOfWeek: 6, // 周六
    isBuiltin: true,
    createdAt: BASE_TIME,
    exercises: [
      { exerciseId: 'ex_incline_db_press', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 90 },
      { exerciseId: 'ex_incline_db_fly', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60 },
      { exerciseId: 'ex_machine_chest_press', targetSets: 6, targetReps: 12, targetUnit: 'kg', restSeconds: 90 },
      { exerciseId: 'ex_butterfly_pec_fly', targetSets: 6, targetReps: 12, targetUnit: 'kg', restSeconds: 60 },
      { exerciseId: 'ex_incline_close_grip_bb_press', targetSets: 4, targetReps: 12, targetUnit: 'lb', restSeconds: 90 },
      { exerciseId: 'ex_cable_chest_fly', targetSets: 6, targetReps: 12, targetUnit: 'lb', restSeconds: 60 },
    ],
  },
];

// ==================== 3. 用户 2026.07.20 ~ 2026.10.22 真实训练日志构建器 ====================
interface RawBatch {
  w: number;
  u: WeightUnit;
  r: number;
  c: number;
  t?: SetType;
  skip?: boolean;
}

interface RawExLog {
  exId: string;
  note?: string;
  batches: RawBatch[];
}

interface RawSessionSpec {
  date: string; // YYYY-MM-DD
  name: string;
  routineId?: string;
  durationMin: number;
  feeling?: string;
  items: RawExLog[];
}

const b = (
  w: number,
  u: WeightUnit,
  r: number,
  c: number,
  opts?: { t?: SetType; skip?: boolean }
): RawBatch => ({
  w,
  u,
  r,
  c,
  t: opts?.t,
  skip: opts?.skip,
});

const RAW_USER_LOGS: RawSessionSpec[] = [
  // 1. 2026-07-20 周一
  {
    date: '2026-07-20',
    name: '周一 · 胸部训练 (上斜+推胸+绳索)',
    routineId: 'routine_user_incline_chest',
    durationMin: 55,
    items: [
      {
        exId: 'ex_incline_db_press',
        batches: [b(20, 'lb', 12, 2, { t: 'warmup' }), b(30, 'lb', 12, 1), b(35, 'lb', 12, 2), b(40, 'lb', 12, 2)],
      },
      {
        exId: 'ex_incline_db_fly',
        batches: [b(20, 'lb', 12, 1), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(20, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
      {
        exId: 'ex_cable_chest_fly',
        batches: [b(30, 'lb', 12, 4)],
      },
    ],
  },
  // 2. 2026-07-21 周二
  {
    date: '2026-07-21',
    name: '周二 · 背部综合训练',
    routineId: 'routine_user_back',
    durationMin: 60,
    items: [
      {
        exId: 'ex_db_row',
        batches: [b(20, 'lb', 12, 1, { t: 'warmup' }), b(30, 'lb', 12, 2), b(35, 'lb', 12, 3)],
      },
      {
        exId: 'ex_lat_pulldown',
        batches: [b(60, 'lb', 12, 2), b(80, 'lb', 12, 4)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(80, 'lb', 12, 2), b(85, 'lb', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(40, 'lb', 15, 2), b(50, 'lb', 12, 3), b(45, 'lb', 12, 1, { t: 'drop' })],
      },
      {
        exId: 'ex_db_deadlift',
        batches: [b(50, 'lb', 15, 4)],
      },
    ],
  },
  // 3. 2026-07-22 周三
  {
    date: '2026-07-22',
    name: '周三 · 肩部专项轰炸',
    routineId: 'routine_user_shoulders_arms',
    durationMin: 62,
    feeling: '哑铃推举 25lb 最后两组推到力竭，前中后束全面充血',
    items: [
      {
        exId: 'ex_db_shoulder_press',
        note: '最后两个力竭',
        batches: [
          b(15, 'lb', 15, 2, { t: 'warmup' }),
          b(25, 'lb', 12, 2),
          b(25, 'lb', 12, 2, { t: 'failure' }),
        ],
      },
      {
        exId: 'ex_db_front_raise',
        batches: [b(10, 'lb', 15, 6)],
      },
      {
        exId: 'ex_rear_delt_fly',
        batches: [b(15, 'lb', 15, 2), b(20, 'lb', 15, 4)],
      },
      {
        exId: 'ex_db_lateral_raise',
        batches: [b(10, 'lb', 15, 3)],
      },
      {
        exId: 'ex_cable_lateral_raise',
        batches: [b(10, 'lb', 15, 6)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(30, 'lb', 12, 2), b(40, 'lb', 12, 4)],
      },
    ],
  },
  // 4. 2026-07-23 周四
  {
    date: '2026-07-23',
    name: '周四 · 手臂肱三头肌专项',
    routineId: 'routine_user_shoulders_arms',
    durationMin: 50,
    items: [
      {
        exId: 'ex_cable_straight_bar_pushdown',
        batches: [b(40, 'lb', 15, 2), b(60, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_overhead_tricep_ext',
        batches: [b(20, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_tricep_kickback',
        batches: [b(15, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_tricep_pushdown',
        batches: [b(20, 'lb', 12, 4)],
      },
      {
        exId: 'ex_bench_dips',
        batches: [b(0, 'kg', 12, 4)],
      },
    ],
  },
  // 5. 2026-07-28 周二
  {
    date: '2026-07-28',
    name: '周二 · 胸部训练 (哑铃卧推突破45lb)',
    routineId: 'routine_user_chest',
    durationMin: 56,
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(25, 'lb', 12, 1), b(30, 'lb', 12, 1), b(35, 'lb', 12, 1), b(40, 'lb', 12, 2), b(45, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 5)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
      {
        exId: 'ex_cable_chest_fly',
        batches: [b(30, 'lb', 12, 6)],
      },
    ],
  },
  // 6. 2026-07-29 周三
  {
    date: '2026-07-29',
    name: '周三 · 背部高容量训练',
    routineId: 'routine_user_back',
    durationMin: 65,
    items: [
      {
        exId: 'ex_cable_lat_pulldown',
        batches: [b(70, 'lb', 12, 2), b(90, 'lb', 12, 4)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(90, 'lb', 12, 2), b(100, 'lb', 12, 4)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        batches: [b(25, 'kg', 12, 4)],
      },
      {
        exId: 'ex_db_row',
        batches: [b(30, 'lb', 12, 2), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(40, 'lb', 15, 2), b(50, 'lb', 15, 4)],
      },
      {
        exId: 'ex_db_deadlift',
        batches: [b(50, 'lb', 15, 4)],
      },
    ],
  },
  // 7. 2026-07-30 周四
  {
    date: '2026-07-30',
    name: '周四 · 肩部雕刻训练',
    routineId: 'routine_user_shoulders_arms',
    durationMin: 55,
    items: [
      {
        exId: 'ex_db_shoulder_press',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 15, 4)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(30, 'lb', 12, 1), b(40, 'lb', 12, 5)],
      },
      {
        exId: 'ex_db_front_raise',
        batches: [b(10, 'lb', 15, 2), b(15, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_lateral_raise',
        batches: [b(10, 'lb', 15, 6)],
      },
      {
        exId: 'ex_rear_delt_fly',
        batches: [b(15, 'lb', 15, 2), b(20, 'lb', 15, 4)],
      },
    ],
  },
  // 8. 2026-07-31 周五
  {
    date: '2026-07-31',
    name: '周五 · 三头肌专项强化',
    routineId: 'routine_user_shoulders_arms',
    durationMin: 52,
    items: [
      {
        exId: 'ex_db_overhead_tricep_ext',
        batches: [b(25, 'lb', 15, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_tricep_kickback',
        batches: [b(15, 'lb', 12, 2), b(20, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_straight_bar_pushdown',
        batches: [b(50, 'lb', 15, 2), b(60, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_tricep_pushdown',
        batches: [b(20, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_bench_dips',
        batches: [b(0, 'kg', 12, 4)],
      },
    ],
  },
  // 9. 2026-08-03 周一
  {
    date: '2026-08-03',
    name: '周一 · 臀腿综合训练',
    routineId: 'routine_user_legs',
    durationMin: 58,
    items: [
      {
        exId: 'ex_wide_db_squat',
        batches: [b(0, 'lb', 12, 2, { t: 'warmup' }), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_rdl',
        batches: [b(60, 'lb', 15, 6)],
      },
      {
        exId: 'ex_wide_leg_press',
        batches: [b(65, 'kg', 12, 2), b(75, 'kg', 15, 4)],
      },
      {
        exId: 'ex_leg_extension',
        batches: [b(15, 'kg', 12, 6)],
      },
      {
        exId: 'ex_cable_hip_abduction',
        note: '未做',
        batches: [b(10, 'lb', 12, 2, { skip: true }), b(15, 'lb', 12, 4, { skip: true })],
      },
    ],
  },
  // 10. 2026-08-04 周二
  {
    date: '2026-08-04',
    name: '周二 · 上斜胸与蝴蝶机专项',
    routineId: 'routine_user_incline_chest',
    durationMin: 60,
    items: [
      {
        exId: 'ex_incline_db_press',
        batches: [b(30, 'lb', 12, 2), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_db_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_close_grip_bb_press',
        batches: [b(20, 'lb', 12, 4)],
      },
      {
        exId: 'ex_butterfly_pec_fly',
        batches: [b(15, 'kg', 12, 2), b(20, 'kg', 12, 1), b(25, 'kg', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
    ],
  },
  // 11. 2026-08-05 周三
  {
    date: '2026-08-05',
    name: '周三 · 背部宽度与厚度训练',
    routineId: 'routine_user_back',
    durationMin: 60,
    items: [
      {
        exId: 'ex_wide_lat_pulldown',
        batches: [b(25, 'kg', 12, 4), b(30, 'kg', 12, 2)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(90, 'lb', 12, 2), b(110, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_lat_pulldown',
        batches: [b(110, 'lb', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(40, 'lb', 15, 1), b(50, 'lb', 15, 1), b(60, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_row',
        batches: [b(30, 'lb', 12, 2), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_deadlift',
        note: '未做',
        batches: [b(50, 'lb', 15, 4, { skip: true })],
      },
    ],
  },
  // 12. 2026-08-06 周四
  {
    date: '2026-08-06',
    name: '周四 · 肩部推举与飞鸟训练',
    routineId: 'routine_user_shoulders_arms',
    durationMin: 55,
    items: [
      {
        exId: 'ex_db_shoulder_press',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 1), b(30, 'lb', 12, 3)],
      },
      {
        exId: 'ex_rear_delt_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_lateral_raise',
        batches: [b(10, 'lb', 12, 2), b(15, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_front_raise',
        batches: [b(10, 'lb', 15, 2), b(15, 'lb', 12, 4)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(40, 'lb', 12, 6)],
      },
    ],
  },
  // 13. 2026-08-10 周一
  {
    date: '2026-08-10',
    name: '周一 · 腿日 (RDL突破70lb)',
    routineId: 'routine_user_legs',
    durationMin: 50,
    items: [
      {
        exId: 'ex_db_squat',
        batches: [b(0, 'lb', 12, 2, { t: 'warmup' }), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_rdl',
        batches: [b(50, 'lb', 12, 2), b(70, 'lb', 12, 4)],
      },
      {
        exId: 'ex_leg_extension',
        batches: [b(15, 'kg', 12, 6)],
      },
      {
        exId: 'ex_wide_leg_press',
        note: '未做',
        batches: [b(65, 'kg', 12, 2, { skip: true }), b(75, 'kg', 15, 4, { skip: true })],
      },
    ],
  },
  // 14. 2026-08-11 周二
  {
    date: '2026-08-11',
    name: '周二 · 胸部训练 (绳索夹胸加量)',
    routineId: 'routine_user_chest',
    durationMin: 60,
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(30, 'lb', 12, 1), b(35, 'lb', 12, 1), b(45, 'lb', 12, 2), b(40, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_close_grip_db_press',
        batches: [b(20, 'lb', 12, 5)],
      },
      {
        exId: 'ex_cable_chest_fly',
        batches: [b(60, 'lb', 12, 2), b(80, 'lb', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
    ],
  },
  // 15. 2026-08-17 周一
  {
    date: '2026-08-17',
    name: '周一 · 腿日 (新增箭步蹲与深蹲跳)',
    routineId: 'routine_user_legs',
    durationMin: 62,
    items: [
      {
        exId: 'ex_db_squat',
        batches: [b(0, 'lb', 12, 2, { t: 'warmup' }), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_rdl',
        batches: [b(60, 'lb', 12, 2), b(70, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_lunge',
        batches: [b(0, 'lb', 12, 2, { t: 'warmup' }), b(50, 'lb', 12, 4)],
      },
      {
        exId: 'ex_narrow_jump_squat',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_wide_leg_press',
        batches: [b(65, 'kg', 12, 2), b(75, 'kg', 15, 4)],
      },
      {
        exId: 'ex_leg_extension',
        note: '未做',
        batches: [b(15, 'kg', 12, 6, { skip: true })],
      },
    ],
  },
  // 16. 2026-08-18 周二
  {
    date: '2026-08-18',
    name: '周二 · 上斜胸与器械推胸突破40kg',
    routineId: 'routine_user_incline_chest',
    durationMin: 60,
    items: [
      {
        exId: 'ex_incline_db_press',
        batches: [b(30, 'lb', 12, 2), b(35, 'lb', 12, 2), b(40, 'lb', 12, 2)],
      },
      {
        exId: 'ex_incline_db_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 2), b(30, 'lb', 12, 2)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(30, 'kg', 12, 2), b(40, 'kg', 12, 4)],
      },
      {
        exId: 'ex_butterfly_pec_fly',
        batches: [b(20, 'kg', 12, 1), b(25, 'kg', 12, 5)],
      },
      {
        exId: 'ex_incline_close_grip_bb_press',
        batches: [b(20, 'lb', 12, 4)],
      },
    ],
  },
  // 17. 2026-08-19 周三
  {
    date: '2026-08-19',
    name: '周三 · 背部训练 (解锁弹力带辅助引体)',
    routineId: 'routine_user_back',
    durationMin: 65,
    items: [
      {
        exId: 'ex_band_pull_up',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(90, 'lb', 12, 1), b(100, 'lb', 12, 1), b(110, 'lb', 12, 4)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        batches: [b(25, 'kg', 12, 4), b(30, 'kg', 12, 2)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 2), b(60, 'lb', 15, 4)],
      },
      {
        exId: 'ex_cable_lat_pulldown',
        batches: [b(110, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_row',
        batches: [b(30, 'lb', 12, 2), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_deadlift',
        note: '未做',
        batches: [b(50, 'lb', 15, 4, { skip: true })],
      },
    ],
  },
  // 18. 2026-09-01 周二
  {
    date: '2026-09-01',
    name: '周二 · 胸部综合训练',
    routineId: 'routine_user_chest',
    durationMin: 60,
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(30, 'lb', 12, 1), b(35, 'lb', 12, 1), b(45, 'lb', 12, 3), b(40, 'lb', 12, 1)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 6)],
      },
      {
        exId: 'ex_incline_db_press',
        batches: [b(25, 'lb', 12, 5)],
      },
      {
        exId: 'ex_pec_deck_fly',
        batches: [b(25, 'kg', 12, 3), b(30, 'kg', 12, 3)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(30, 'kg', 12, 2), b(35, 'kg', 12, 4)],
      },
    ],
  },
  // 19. 2026-09-03 周四
  {
    date: '2026-09-03',
    name: '周四 · 背部与后束面拉训练',
    routineId: 'routine_user_back',
    durationMin: 64,
    items: [
      {
        exId: 'ex_db_row',
        batches: [b(35, 'lb', 12, 4), b(40, 'lb', 12, 2)],
      },
      {
        exId: 'ex_band_pull_up',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(100, 'lb', 12, 2), b(110, 'lb', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 2), b(60, 'lb', 15, 4)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        note: '30kg*12*2 未做',
        batches: [b(25, 'kg', 12, 4), b(30, 'kg', 12, 2, { skip: true })],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(40, 'lb', 12, 2), b(50, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_lat_pulldown',
        note: '未做',
        batches: [b(110, 'lb', 12, 4, { skip: true })],
      },
      {
        exId: 'ex_db_deadlift',
        note: '未做',
        batches: [b(50, 'lb', 15, 4, { skip: true })],
      },
    ],
  },
  // 20. 2026-09-05 周五
  {
    date: '2026-09-05',
    name: '周五 · 肩部与三头联合训练',
    routineId: 'routine_user_shoulders_arms',
    durationMin: 60,
    items: [
      {
        exId: 'ex_db_shoulder_press',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_overhead_tricep_ext',
        batches: [b(25, 'lb', 15, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_front_raise',
        batches: [b(10, 'lb', 15, 2), b(15, 'lb', 12, 4)],
      },
      {
        exId: 'ex_bench_dips',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_rear_delt_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_straight_bar_pushdown',
        batches: [b(50, 'lb', 15, 2), b(70, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_tricep_kickback',
        note: '未做',
        batches: [b(15, 'lb', 12, 2, { skip: true }), b(20, 'lb', 12, 4, { skip: true })],
      },
      {
        exId: 'ex_cable_tricep_pushdown',
        note: '未做',
        batches: [b(20, 'lb', 12, 2, { skip: true }), b(30, 'lb', 12, 4, { skip: true })],
      },
    ],
  },
  // 21. 2026-09-08 周二
  {
    date: '2026-09-08',
    name: '周二 · 胸部训练 (飞鸟30lb+推胸40kg)',
    routineId: 'routine_user_chest',
    durationMin: 60,
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(35, 'lb', 12, 2), b(40, 'lb', 12, 1), b(45, 'lb', 12, 3)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(35, 'kg', 12, 2), b(40, 'kg', 12, 4)],
      },
      {
        exId: 'ex_pec_deck_fly',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
      {
        exId: 'ex_incline_db_press',
        batches: [b(25, 'lb', 12, 6)],
      },
    ],
  },
  // 22. 2026-09-09 周三
  {
    date: '2026-09-09',
    name: '周三 · 背部与后束强化',
    routineId: 'routine_user_back',
    durationMin: 62,
    feeling: '哑铃俯身划船 40lb×4组下次保持，有点勉强',
    items: [
      {
        exId: 'ex_band_pull_up',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_db_row',
        note: '下次保持，有点勉强',
        batches: [b(35, 'lb', 12, 2), b(40, 'lb', 12, 4)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(100, 'lb', 12, 2), b(110, 'lb', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 1), b(60, 'lb', 15, 5)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(40, 'lb', 12, 2), b(50, 'lb', 12, 4)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        batches: [b(25, 'kg', 12, 4), b(30, 'kg', 12, 2)],
      },
    ],
  },
  // 23. 2026-09-10 周四
  {
    date: '2026-09-10',
    name: '周四 · 肩臂联合全套通关 (推举35lb/直杆80lb)',
    routineId: 'routine_user_shoulders_arms',
    durationMin: 70,
    items: [
      {
        exId: 'ex_db_shoulder_press',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 2), b(35, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_overhead_tricep_ext',
        batches: [b(25, 'lb', 15, 2), b(30, 'lb', 12, 2), b(35, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_front_raise',
        batches: [b(10, 'lb', 15, 2), b(15, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_straight_bar_pushdown',
        batches: [b(60, 'lb', 12, 2), b(70, 'lb', 12, 1), b(80, 'lb', 12, 3)],
      },
      {
        exId: 'ex_rear_delt_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_cable_tricep_pushdown',
        batches: [b(20, 'lb', 12, 1), b(30, 'lb', 12, 2), b(40, 'lb', 12, 2)],
      },
      {
        exId: 'ex_bench_dips',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_db_tricep_kickback',
        batches: [b(15, 'lb', 12, 2), b(20, 'lb', 12, 4)],
      },
    ],
  },
  // 24. 2026-09-14 周一
  {
    date: '2026-09-14',
    name: '周一 · 臀腿完整6动作通关 (箭步蹲60lb)',
    routineId: 'routine_user_legs',
    durationMin: 65,
    items: [
      {
        exId: 'ex_db_squat',
        batches: [b(0, 'lb', 12, 2, { t: 'warmup' }), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_rdl',
        batches: [b(60, 'lb', 12, 2), b(70, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_lunge',
        batches: [b(20, 'lb', 12, 2), b(60, 'lb', 12, 4)],
      },
      {
        exId: 'ex_narrow_jump_squat',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_leg_extension',
        batches: [b(15, 'kg', 12, 2)],
      },
      {
        exId: 'ex_wide_leg_press',
        batches: [b(65, 'kg', 12, 2), b(75, 'kg', 15, 4)],
      },
    ],
  },
  // 25. 2026-09-16 周三
  {
    date: '2026-09-16',
    name: '周三 · 胸部训练 (器械推胸突破45kg)',
    routineId: 'routine_user_chest',
    durationMin: 60,
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(35, 'lb', 12, 1), b(40, 'lb', 12, 1), b(45, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_db_press',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_pec_deck_fly',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(35, 'kg', 12, 2), b(45, 'kg', 12, 4)],
      },
    ],
  },
  // 26. 2026-09-17 周四
  {
    date: '2026-09-17',
    name: '周四 · 背部训练 (坐姿划船120lb)',
    routineId: 'routine_user_back',
    durationMin: 63,
    feeling: '器械宽距高位下拉 30kg 2组改 25kg 了 -…-；俯身划船 40lb 下次保持',
    items: [
      {
        exId: 'ex_band_pull_up',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(110, 'lb', 12, 4), b(120, 'lb', 12, 2)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 1), b(60, 'lb', 15, 5)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        note: '30kg*12*0（2 改 25 了 -…-）',
        batches: [b(25, 'kg', 12, 6)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(40, 'lb', 12, 1), b(50, 'lb', 12, 5)],
      },
      {
        exId: 'ex_db_row',
        note: '下次保持，有点勉强',
        batches: [b(35, 'lb', 12, 2), b(40, 'lb', 12, 4)],
      },
    ],
  },
  // 27. 2026-09-21 周一
  {
    date: '2026-09-21',
    name: '周一 · 胸部训练 (哑铃卧推突破50lb!)',
    routineId: 'routine_user_chest',
    durationMin: 52,
    feeling: '哑铃卧推成功推起 50lb×12×2！',
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(35, 'lb', 12, 1), b(40, 'lb', 12, 1), b(45, 'lb', 12, 2), b(50, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_db_press',
        batches: [b(30, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_db_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_pec_deck_fly',
        note: '未做',
        batches: [b(25, 'kg', 12, 2, { skip: true }), b(30, 'kg', 12, 4, { skip: true })],
      },
      {
        exId: 'ex_machine_chest_press',
        note: '未做',
        batches: [b(35, 'kg', 12, 2, { skip: true }), b(45, 'kg', 12, 4, { skip: true })],
      },
    ],
  },
  // 28. 2026-09-22 周二
  {
    date: '2026-09-22',
    name: '周二 · 背部强化训练',
    routineId: 'routine_user_back',
    durationMin: 62,
    feeling: '宽距高位下拉 30kg 稳步完成 3 组，俯身划船 40lb 下次保持',
    items: [
      {
        exId: 'ex_db_row',
        note: '下次保持，有点勉强',
        batches: [b(35, 'lb', 12, 2), b(40, 'lb', 12, 4)],
      },
      {
        exId: 'ex_band_pull_up',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 1), b(60, 'lb', 15, 5)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(110, 'lb', 12, 4), b(120, 'lb', 12, 2)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(40, 'lb', 15, 1), b(50, 'lb', 15, 5)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        batches: [b(25, 'kg', 12, 3), b(30, 'kg', 12, 3)],
      },
    ],
  },
  // 29. 2026-10-08 周四
  {
    date: '2026-10-08',
    name: '周四 · 节后恢复胸部训练',
    routineId: 'routine_user_chest',
    durationMin: 48,
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(35, 'lb', 12, 1), b(40, 'lb', 12, 1), b(45, 'lb', 12, 2), b(50, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(35, 'kg', 12, 2), b(45, 'kg', 12, 4)],
      },
      {
        exId: 'ex_incline_db_press',
        note: '30lb*12*4 未做',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4, { skip: true })],
      },
      {
        exId: 'ex_incline_db_fly',
        note: '未做',
        batches: [b(20, 'lb', 12, 2, { skip: true }), b(25, 'lb', 12, 4, { skip: true })],
      },
      {
        exId: 'ex_pec_deck_fly',
        note: '未做',
        batches: [b(25, 'kg', 12, 2, { skip: true }), b(30, 'kg', 12, 4, { skip: true })],
      },
    ],
  },
  // 30. 2026-10-09 周五
  {
    date: '2026-10-09',
    name: '周五 · 背部强化 (坐姿划船120lb×4组)',
    routineId: 'routine_user_back',
    durationMin: 58,
    items: [
      {
        exId: 'ex_db_row',
        note: '下次保持，有点勉强',
        batches: [b(35, 'lb', 12, 2), b(40, 'lb', 12, 4)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        batches: [b(25, 'kg', 12, 3), b(30, 'kg', 12, 3)],
      },
      {
        exId: 'ex_seated_cable_row',
        batches: [b(110, 'lb', 12, 2), b(120, 'lb', 12, 4)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(40, 'lb', 15, 2), b(50, 'lb', 15, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 2), b(60, 'lb', 15, 4)],
      },
      {
        exId: 'ex_band_pull_up',
        note: '未做',
        batches: [b(0, 'kg', 12, 4, { skip: true })],
      },
    ],
  },
  // 31. 2026-10-15 周四
  {
    date: '2026-10-15',
    name: '周四 · 胸部自由重量+器械推胸',
    routineId: 'routine_user_chest',
    durationMin: 56,
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(35, 'lb', 12, 1), b(40, 'lb', 12, 1), b(45, 'lb', 12, 2), b(50, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_db_press',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_db_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        note: '45kg*12*4 未做',
        batches: [b(35, 'kg', 12, 4), b(45, 'kg', 12, 4, { skip: true })],
      },
      {
        exId: 'ex_pec_deck_fly',
        note: '30kgx12x4 未做',
        batches: [b(25, 'kg', 12, 4), b(30, 'kg', 12, 4, { skip: true })],
      },
    ],
  },
  // 32. 2026-10-16 周五
  {
    date: '2026-10-16',
    name: '周五 · 背部进阶 (宽距高位下拉变轻松了呢！)',
    routineId: 'routine_user_back',
    durationMin: 64,
    feeling: '器械宽距高位下拉变轻松了呢！绳索面拉下次可以加重量（下次+）',
    items: [
      {
        exId: 'ex_seated_cable_row',
        batches: [b(110, 'lb', 12, 2), b(120, 'lb', 12, 4)],
      },
      {
        exId: 'ex_band_pull_up',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_db_row',
        batches: [b(35, 'lb', 12, 2), b(40, 'lb', 12, 4)],
      },
      {
        exId: 'ex_face_pull',
        note: '下次+',
        batches: [b(40, 'lb', 15, 2), b(50, 'lb', 15, 4)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        note: '变轻松了呢！',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 2), b(60, 'lb', 15, 4)],
      },
    ],
  },
  // 33. 2026-10-19 周一
  {
    date: '2026-10-19',
    name: '周一 · 腿日 (罗马尼亚硬拉70lb×6组加量)',
    routineId: 'routine_user_legs',
    durationMin: 64,
    feeling: '哑铃罗马尼亚硬拉 70lb 由 4 组加量完成 6 组！',
    items: [
      {
        exId: 'ex_db_squat',
        batches: [b(0, 'lb', 12, 2, { t: 'warmup' }), b(35, 'lb', 12, 4)],
      },
      {
        exId: 'ex_db_rdl',
        note: '70lbx12x（4）6 组突破',
        batches: [b(60, 'lb', 12, 2), b(70, 'lb', 12, 6)],
      },
      {
        exId: 'ex_db_lunge',
        batches: [b(50, 'lb', 12, 2), b(60, 'lb', 12, 4)],
      },
      {
        exId: 'ex_narrow_jump_squat',
        batches: [b(0, 'kg', 12, 4)],
      },
      {
        exId: 'ex_leg_extension',
        batches: [b(15, 'kg', 12, 2)],
      },
      {
        exId: 'ex_wide_leg_press',
        note: '75kgx15x4 未做',
        batches: [b(65, 'kg', 12, 2), b(75, 'kg', 15, 4, { skip: true })],
      },
    ],
  },
  // 34. 2026-10-20 周二
  {
    date: '2026-10-20',
    name: '周二 · 胸部6动作全满贯通关',
    routineId: 'routine_user_chest',
    durationMin: 68,
    feeling: '平胸 + 器械 + 上斜 6 个动作共 36 组全部高质量完成！',
    items: [
      {
        exId: 'ex_db_bench_press',
        batches: [b(35, 'lb', 12, 1), b(40, 'lb', 12, 1), b(45, 'lb', 12, 2), b(50, 'lb', 12, 2)],
      },
      {
        exId: 'ex_db_fly',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_machine_chest_press',
        batches: [b(35, 'kg', 12, 2), b(45, 'kg', 12, 4)],
      },
      {
        exId: 'ex_pec_deck_fly',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
      {
        exId: 'ex_incline_db_press',
        batches: [b(25, 'lb', 12, 2), b(30, 'lb', 12, 4)],
      },
      {
        exId: 'ex_incline_db_fly',
        batches: [b(20, 'lb', 12, 2), b(25, 'lb', 12, 4)],
      },
    ],
  },
  // 35. 2026-10-22 周四
  {
    date: '2026-10-22',
    name: '周四 · 背部突破 (坐姿划船130lb & 面拉60lb)',
    routineId: 'routine_user_back',
    durationMin: 65,
    feeling: '器械坐姿划船突破 130lb×12×4，绳索面拉上 60lb，器械宽距高位下拉变轻松了呢！',
    items: [
      {
        exId: 'ex_seated_cable_row',
        batches: [b(120, 'lb', 12, 2), b(130, 'lb', 12, 4)],
      },
      {
        exId: 'ex_straight_arm_pulldown',
        batches: [b(50, 'lb', 15, 2), b(60, 'lb', 15, 4)],
      },
      {
        exId: 'ex_db_row',
        batches: [b(35, 'lb', 12, 2), b(40, 'lb', 12, 4)],
      },
      {
        exId: 'ex_face_pull',
        batches: [b(50, 'lb', 15, 2), b(60, 'lb', 15, 4)],
      },
      {
        exId: 'ex_wide_lat_pulldown',
        note: '变轻松了呢！',
        batches: [b(25, 'kg', 12, 2), b(30, 'kg', 12, 4)],
      },
      {
        exId: 'ex_band_pull_up',
        batches: [b(0, 'kg', 12, 4)],
      },
    ],
  },
];

function buildUserHistoryData(): {
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
} {
  const sessions: WorkoutSession[] = [];
  const sets: WorkoutSet[] = [];
  const best1RMByExercise: Record<string, number> = {};

  RAW_USER_LOGS.forEach((raw, sIdx) => {
    const sessionId = `ws_real_${raw.date.replace(/-/g, '')}_${sIdx + 1}`;
    const startTime = new Date(`${raw.date}T19:00:00+08:00`).getTime();
    const durationSeconds = raw.durationMin * 60;
    const endTime = startTime + durationSeconds * 1000;

    const exerciseOrder: string[] = [];
    const exerciseNotes: Record<string, string> = {};
    const currentSessionSets: WorkoutSet[] = [];

    raw.items.forEach((item) => {
      if (!exerciseOrder.includes(item.exId)) {
        exerciseOrder.push(item.exId);
      }
      if (item.note) {
        exerciseNotes[item.exId] = item.note;
      }

      let orderInEx = 1;
      item.batches.forEach((batch) => {
        for (let i = 0; i < batch.c; i++) {
          const isSkipped = Boolean(batch.skip);
          const isCompleted = !isSkipped;
          const est1RM = isCompleted ? estimate1RMKg(batch.w, batch.r, batch.u) : 0;
          let isPR = false;

          if (isCompleted && batch.w > 0) {
            const prevBest = best1RMByExercise[item.exId] || 0;
            if (est1RM > prevBest + 0.05) {
              isPR = prevBest > 0; // 首次记录作为基准，后续突破标记为 PR
              best1RMByExercise[item.exId] = est1RM;
            }
          }

          const setObj: WorkoutSet = {
            id: `set_${sessionId}_${item.exId}_${orderInEx}`,
            sessionId,
            exerciseId: item.exId,
            setOrder: orderInEx,
            setType: batch.t || 'normal',
            weight: batch.w,
            unit: batch.u,
            reps: batch.r,
            isCompleted,
            isSkipped,
            isPR,
            completedAt: isCompleted ? startTime + orderInEx * 90 * 1000 : undefined,
          };

          currentSessionSets.push(setObj);
          sets.push(setObj);
          orderInEx++;
        }
      });
    });

    const totalVolumeKg = calculateSessionVolumeKg(currentSessionSets);

    sessions.push({
      id: sessionId,
      name: raw.name,
      routineId: raw.routineId,
      startTime,
      endTime,
      durationSeconds,
      totalVolumeKg,
      feelingNotes: raw.feeling,
      exerciseNotes: Object.keys(exerciseNotes).length > 0 ? exerciseNotes : undefined,
      exerciseOrder,
      isFinished: true,
      createdAt: startTime,
    });
  });

  return { sessions, sets };
}

const builtHistory = buildUserHistoryData();

export const INITIAL_SESSIONS: WorkoutSession[] = builtHistory.sessions;
export const INITIAL_SETS: WorkoutSet[] = builtHistory.sets;

export const INITIAL_BODY_METRICS: BodyMetric[] = [
  {
    id: 'bm_20260720',
    date: '2026-07-20',
    weightKg: 74.5,
    bodyFatRate: 17.2,
    createdAt: new Date('2026-07-20T08:30:00+08:00').getTime(),
  },
  {
    id: 'bm_20260815',
    date: '2026-08-15',
    weightKg: 73.8,
    bodyFatRate: 16.4,
    createdAt: new Date('2026-08-15T08:30:00+08:00').getTime(),
  },
  {
    id: 'bm_20260915',
    date: '2026-09-15',
    weightKg: 73.2,
    bodyFatRate: 15.6,
    createdAt: new Date('2026-09-15T08:30:00+08:00').getTime(),
  },
  {
    id: 'bm_20261022',
    date: '2026-10-22',
    weightKg: 72.8,
    bodyFatRate: 14.9,
    createdAt: new Date('2026-10-22T08:30:00+08:00').getTime(),
  },
];
