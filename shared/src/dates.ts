/**
 * Date helpers for the curriculum calendar.
 *
 * Every date in curriculum.json is a plain calendar date ("2026-08-10"), not a
 * moment in time. We handle them entirely in UTC so that a tech in Sydney and a
 * tech in Denver both see Week 12 starting on the same Monday. Mixing local time
 * in here is how you get off-by-one-day bugs that only show up for some users.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MS_PER_DAY = 86_400_000;

/** Parse "YYYY-MM-DD" as UTC midnight. Throws if the string is malformed. */
export function parseISODate(iso: string): Date {
  if (!ISO_DATE.test(iso)) {
    throw new Error(`Not an ISO date (expected YYYY-MM-DD): "${iso}"`);
  }
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) {
    throw new Error(`Not a real calendar date: "${iso}"`);
  }
  const date = new Date(ms);
  // Date.parse accepts "2026-02-31" on some engines and rolls it forward, so
  // confirm the round trip actually matches what we were given.
  if (toISODate(date) !== iso) {
    throw new Error(`Not a real calendar date: "${iso}"`);
  }
  return date;
}

/** Format a Date back to "YYYY-MM-DD" using its UTC fields. */
export function toISODate(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** UTC day-of-week where 1 is Monday, matching how the curriculum reads. */
export function isMonday(date: Date): boolean {
  return date.getUTCDay() === 1;
}

export function isSunday(date: Date): boolean {
  return date.getUTCDay() === 0;
}

/**
 * The user's *local* calendar date, expressed as a UTC-midnight Date so it can
 * be compared against curriculum dates.
 *
 * Using `new Date()` directly would compare a timestamp against a midnight
 * date and put anyone west of UTC on the wrong week for part of the day.
 */
export function today(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}
