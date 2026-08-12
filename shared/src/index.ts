/** Public surface of @pathway/shared, used by web, api and cli. */

export type {
  ArtifactCheck,
  ArtifactCheckSource,
  Client,
  Curriculum,
  Lab,
  Tooling,
  Trial,
  Week,
  WeekProgress,
  WeekStatus,
} from './types.ts';
export { WEEK_STATUSES } from './types.ts';

export type { CalendarPosition, Pace, PhaseCompletion, PhaseGroup } from './curriculum.ts';
export {
  calendarPosition,
  completionByPhase,
  dependents,
  getWeek,
  loadCurriculum,
  pace,
  progressByWeek,
  totalHours,
  unmetDependencies,
  weekCount,
  weeksByPhase,
} from './curriculum.ts';

export type { Issue, IssueLevel } from './validate.ts';
export { errorsOnly, formatIssue, validateCurriculum } from './validate.ts';

export type { Identity, ProgressStore, WeekNote } from './store.ts';
export { emptyProgress, InMemoryProgressStore } from './store.ts';

export {
  addDays,
  daysBetween,
  isMonday,
  isSunday,
  parseISODate,
  today,
  toISODate,
} from './dates.ts';
