/**
 * The curriculum, loaded once at module load.
 *
 * It is imported rather than fetched so it ends up in the bundle: the app works
 * with no network and no Azure account, which is what makes local development
 * and offline reading possible.
 *
 * loadCurriculum validates on the way in, so a broken data file fails at build
 * or first paint rather than silently rendering wrong weeks.
 */

import curriculumData from '@data/curriculum.json';
import { loadCurriculum } from '@shared/index.ts';

export const curriculum = loadCurriculum(curriculumData);

/** Format "2026-08-10" as "10 Aug" for compact list rows. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthName = months[Number(month) - 1] ?? '';
  return `${Number(day)} ${monthName}`;
}

/** Format a week's span as "10–16 Aug 2026". */
export function dateRange(startISO: string, endISO: string): string {
  const [startYear] = startISO.split('-');
  return `${shortDate(startISO)} – ${shortDate(endISO)} ${startYear}`;
}

/**
 * Strip the backtick code spans the curriculum uses in artifact descriptions.
 * The Markdown is authored for GitHub; here we render plain text.
 */
export function stripCode(text: string): string {
  return text.replace(/`/g, '');
}
