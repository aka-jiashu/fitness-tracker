# 铁馆日志 (Fitness Tracker)

一款**离线优先、隐私安全、极简 4-Tab 架构**的个人力量训练打卡与体征追踪 PWA。专为健身房弱网/无网环境和高心率单手触控场景设计，所有数据保存在浏览器本地 `IndexedDB`，无需注册账号，零云端依赖。

- **在线体验**：<https://aka-jiashu.github.io/fitness-tracker/>

---

## 核心功能与设计亮点

- **极简 4-Tab 架构**：`训练`、`计划`、`动作库`、`记录与趋势` 四大模块职责分明，去除了冗余统计横幅与复杂表单，单屏聚焦单一任务。
- **离线优先本地存储**：基于浏览器原生 `IndexedDB` 与 `Dexie.js` 响应式查询（`useLiveQuery`），弱网或飞行模式下毫秒级响应，数据完全归属个人本地。
- **iPhone / iPad 双端适配**：
  - **iPhone**：底部固定 4-Tab 导航栏、iOS 安全区（刘海/灵动岛与底部横条）适配、大尺寸 `+/-` 重量/次数步进器（热区 ≥ 44px），单手拇指即可完成记录。
  - **iPad / 桌面端**：顶部 4-Tab 分段导航，训练中自动切换为左右 **Master-Detail 主从分栏**（左侧动作目录，右侧当前动作组明细）。
- **计划模板原地展开微调 + 结课反向同步**：
  - 预置 4 套分部位训练计划（臀腿、胸部、背部、肩与三头）及 37 个经典动作；支持新建、复制、删除自定义计划与动作。
  - 点击计划卡片即可原地展开，实时调整动作顺序、目标组数、目标次数、组间休息秒数与推荐训练日（星期绑定），无需手动点保存。
  - 训练中途若临时增删动作或调整组数，结课时自动检测结构差异，勾选即可将最新动作顺序、组数与阶梯配重同步回原模板。
- **渐进超负荷辅助与反馈闭环**：
  - **自动带出重量**：按计划开练时，优先继承该动作上一次已完成训练的真实重量（支持 `kg / lb` 按 0.5 步进无损换算）；无历史记录时回退至模板内置阶梯配重预设。
  - **PR 判定与组间计时**：完成组自动按 Epley 估算 1RM 校验是否打破个人纪录（破纪录触发彩带与提示音），并按动作配置的休息秒数启动底部悬浮倒计时（支持 Web Audio 提示音与震动）。
  - **1~5 星达成度评分与进阶建议**：单个动作全部组完成后展开 1~5 星达成度评分；当某动作累计获得 2 次及以上 5 星满星时，自动弹出琥珀金进阶建议横幅，支持一键加重（`+2.5kg` / `+5lb`）或 `+1 组`。
- **分肌群容量趋势图与体重追踪**：
  - 最近 30 场训练的**分肌群连续容量折线图**（胸/背/臀腿/肩/手臂分色独立连线，跨场次自动 `connectNulls` 连续绘制，支持图例交互筛选）。
  - 切换即可查看体重变化走势，并内嵌单行快速记录今日体重与体脂率（选填）。
- **干净默认态 + 一键导入示例数据**：
  - 首次打开仅加载 37 个预置动作与 4 套分化计划，保持干净的空白训练记录状态。
  - 在「记录与趋势」页支持一键导入内置的 **39 场示例训练记录**（对应离线快照 [public/sample-workout-data.json](public/sample-workout-data.json)），方便快速预览完整历史日志与趋势图表。
- **JSON 备份恢复 & PWA 体验**：支持全量 JSON 导出、合并模式导入恢复、一键重置出厂状态，以及 iOS Safari 添加到主屏幕的全屏体验。

---

## 技术栈一览

| 类别 | 技术选型 | 版本 (`package.json`) |
| :--- | :--- | :--- |
| 前端框架 | React + React DOM | `^19.0.0` |
| 开发语言 | TypeScript | `~5.7.2` |
| 构建工具 | Vite + `@vitejs/plugin-react` | `^6.2.0` / `^4.3.4` |
| 样式方案 | Tailwind CSS + `@tailwindcss/vite` | `^4.0.14` |
| 样式工具 | `clsx` + `tailwind-merge` | `^2.1.1` / `^3.0.2` |
| 本地数据库 | Dexie.js + `dexie-react-hooks` | `^4.0.11` / `^1.1.7` |
| 数据可视化 | Recharts | `^2.15.1` |
| 图标与动效 | `lucide-react` + `canvas-confetti` | `^1.16.0` / `^1.9.4` |

---

## 快速开始

环境要求：Node.js 20+ 与 npm。

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器
npm run dev

# 3. 类型检查并构建生产产物（输出至 dist/）
npm run build

# 4. 本地预览生产构建结果
npm run preview
```

### GitHub Pages 自动部署

仓库已配置 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：
- 每次推送到 `main` 分支（或在 Actions 页面手动触发 `workflow_dispatch`）时，自动使用 Node.js 20 执行 `npm ci && npm run build`，并将 `dist/` 目录发布至 GitHub Pages。
- `vite.config.ts` 已配置 `base: './'` 与按依赖分包（`charts-vendor`、`db-vendor`、`ui-vendor`），适配子路径静态托管。

---

## 项目目录结构与文档导航

```text
fitness-tracker/
├── .github/workflows/
│   └── deploy.yml                  # GitHub Pages 自动构建与部署工作流
├── docs/specs/
│   └── fitness-tracker-spec.md     # v2.0 极简版综合设计与技术规范
├── public/
│   ├── manifest.json               # PWA Web App Manifest
│   └── sample-workout-data.json    # 39 场示例训练记录标准 JSON 快照
├── src/
│   ├── components/
│   │   ├── ActiveWorkoutTab.tsx    # Tab 1：训练启动台、跟练打卡、评星与结课同步
│   │   ├── RoutinesTab.tsx         # Tab 2：训练计划模板与原地手风琴微调
│   │   ├── ExerciseLibraryTab.tsx  # Tab 3：动作库检索、要领展开与自定义动作
│   │   ├── AnalyticsTab.tsx        # Tab 4：分肌群容量/体重趋势、历史日志与备份
│   │   └── FloatingRestTimer.tsx   # 全局底部悬浮组间休息计时器
│   ├── db/
│   │   ├── database.ts             # Dexie 数据库定义、初始化、PR 判定、同步与备份
│   │   └── seedData.ts             # 37 个预置动作、4 套分化计划与 39 场示例数据
│   ├── types/
│   │   └── fitness.ts              # 核心领域类型、枚举与标签映射
│   ├── utils/
│   │   ├── fitnessUtils.ts         # 单位换算、容量/1RM 估算与进阶条件评估
│   │   └── deviceHardware.ts       # Web Audio 提示音、震动、屏幕常亮与彩带动效
│   ├── App.tsx                     # 应用外壳、4-Tab 导航与休息计时状态管理
│   └── index.css                   # Tailwind v4 样式、安全区与原生手风琴过渡
├── agents.md                       # 项目工程约定与 Agent 协作规范
├── package.json
└── vite.config.ts
```

### 文档导航

- **详细设计与技术规范**：[docs/specs/fitness-tracker-spec.md](docs/specs/fitness-tracker-spec.md)（包含 4-Tab 交互细节、Dexie 存储契约、核心业务算法与现代 Web 规范清单）
- **工程约定与协作规范**：[agents.md](agents.md)

---

## iOS Safari 添加到主屏幕（PWA）

1. 在 iPhone 或 iPad 上使用 **Safari** 打开 <https://aka-jiashu.github.io/fitness-tracker/>。
2. 点击底部工具栏（iPad 为地址栏右侧）的 **分享** 按钮。
3. 向下滑动并选择 **「添加到主屏幕」**，确认名称为 **「铁馆日志」** 后点击 **添加**。
4. 之后从主屏幕图标启动，即可获得隐藏浏览器地址栏的全屏暗黑体验。

> **数据提示**：本地数据存储在当前设备对应浏览器的 `IndexedDB` 中，建议定期在「记录与趋势」页点击 **「导出」** 保存 JSON 备份文件，换机或清理浏览器缓存后可通过 **「导入 JSON」** 无损恢复。
