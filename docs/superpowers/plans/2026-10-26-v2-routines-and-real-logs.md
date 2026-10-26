# Fitness Tracker v2.0 (4-Tab Minimalist UI + Inline Routine Editor + 29 Real Workout Logs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v2.0 minimalist 4-Tab Fitness Tracker with an inline expandable Routine Manager, bidirectional workout-to-routine sync, and preload all 29 real workout sessions (2026-07-20 to 2026-10-22) and personalized routines.

**Architecture:** Uses Dexie.js (`useLiveQuery`) for zero-latency direct IndexedDB updates when expanding and fine-tuning routine templates inline, paired with native HTML `<dialog closedby="any">` modals and CSS `calc-size(auto, size)` accordion transitions. Automatically upgrades legacy 4-session demo databases to the user's 29 real workout sessions via a seed version marker in `ensureDatabaseSeeded()`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Dexie.js, Recharts, Lucide React.

**Spec:** `docs/specs/fitness-tracker-spec.md`

## Global Constraints

- Touch targets must be `>= 44px` (`.touch-target`).
- Use `<dialog closedby="any">` opened via `.showModal()` with Safari coordinate backdrop click fallback.
- Use `.expandable-panel` (`interpolate-size: allow-keywords`, `calc-size(auto, size)`) with `aria-expanded` and `hidden` attributes.
- Preserve independent per-exercise weight units (`kg` vs `lb`) and exact historical weights/reps/notes from the user's 29 training logs.

## Review Focus

- Starting a routine when an unfinished workout session already exists must prompt confirmation and cleanly replace the unfinished session.
- Skipped exercises/sets (`（未做）`) in the 29 historical logs must be stored with `isSkipped: true, isCompleted: false` so they do not inflate volume or 1RM PR calculations, while still displaying in historical session details.
- Existing browsers that already initialized the old 4-demo-session DB must automatically migrate to the 29 real workout logs and 5 personalized routines on load.
- Toggling between Volume Trend and Body Weight Trend in `AnalyticsTab` must render cleanly even when only a few data points exist.
- Completing a workout started from a routine where sets or exercises were modified must offer a checkbox to sync the updated structure back to the `Routine`.

---

### Task 1: Real Exercises, 5 Personalized Routines, and 29 Real Workout Sessions Seed Data

**Files:**
- Modify: `src/db/seedData.ts`
- Modify: `src/db/database.ts`

**Interfaces:**
- Produces: `INITIAL_EXERCISES`, `INITIAL_ROUTINES`, `INITIAL_SESSIONS`, `INITIAL_SETS`, `INITIAL_BODY_METRICS` in `src/db/seedData.ts`
- Produces: `ensureDatabaseSeeded(): Promise<void>`, `hasRoutineDiff(session: WorkoutSession, sets: WorkoutSet[], routine: Routine): boolean`, `syncSessionToRoutine(session: WorkoutSession, sets: WorkoutSet[], routine: Routine): Promise<void>` in `src/db/database.ts`

- [ ] **Step 1: Populate `src/db/seedData.ts` with all exercises from the user's logs, 5 personalized routines, and all 29 workout sessions (2026-07-20 to 2026-10-22)**
- [ ] **Step 2: Update `src/db/database.ts` with automatic v2 real-log seed migration (`SEED_VERSION_KEY = 'fitness_tracker_seed_v2_real'`) and routine diff/sync helpers**
- [ ] **Step 3: Verify TypeScript compilation (`npx tsc --noEmit`)**

---

### Task 2: Inline Expandable Routine Manager (`RoutinesTab.tsx`)

**Files:**
- Create: `src/components/RoutinesTab.tsx`

**Interfaces:**
- Consumes: `db`, `getLastPerformanceForExercise` from `src/db/database.ts`
- Produces: `RoutinesTab: React.FC<{ onWorkoutStarted: () => void }>`

- [ ] **Step 1: Implement `RoutinesTab.tsx` with accordion cards, inline name/dayOfWeek editing, exercise reorder (`ArrowUp`/`ArrowDown`), `+/-` steppers for `targetSets`, `targetReps`, `restSeconds`, exercise picker `<dialog>`, routine clone/delete, and one-click start workout**
- [ ] **Step 2: Verify TypeScript compilation (`npx tsc --noEmit`)**

---

### Task 3: Enhanced Active Workout Tab & Analytics Tab + 4-Tab App Shell

**Files:**
- Modify: `src/components/ActiveWorkoutTab.tsx`
- Modify: `src/components/AnalyticsTab.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `RoutinesTab`, `hasRoutineDiff`, `syncSessionToRoutine`
- Produces: Updated `ActiveWorkoutTab`, `AnalyticsTab`, and 4-Tab `App`

- [ ] **Step 1: Update `ActiveWorkoutTab.tsx` with Today's Recommended Routine highlight (by `dayOfWeek`), per-exercise collapsible sticky note, remove exercise button, exercise-specific `restSeconds` timer trigger, and finish dialog routine-sync checkbox**
- [ ] **Step 2: Update `AnalyticsTab.tsx` with toggleable Volume/Weight trend chart and skipped-set badge display in expandable session logs**
- [ ] **Step 3: Update `src/App.tsx` to 4-Tab navigation (`训练` · `计划` · `动作库` · `记录与趋势`)**
- [ ] **Step 4: Run `npm run build` and verify zero errors**
- [ ] **Step 5: Commit and push to `main` to deploy to GitHub Pages**
