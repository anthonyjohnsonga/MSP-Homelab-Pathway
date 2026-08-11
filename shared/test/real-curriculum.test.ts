/**
 * The shipped curriculum must itself be valid. This is the test that stops a
 * hand-edit to data/curriculum.json from reaching the platform.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { errorsOnly, formatIssue, validateCurriculum } from '../src/validate.ts';
import { calendarPosition, loadCurriculum, weeksByPhase } from '../src/curriculum.ts';
import { parseISODate } from '../src/dates.ts';

const raw = readFileSync(new URL('../../data/curriculum.json', import.meta.url), 'utf8');
const data: unknown = JSON.parse(raw);

describe('data/curriculum.json', () => {
  it('passes every invariant', () => {
    const errors = errorsOnly(validateCurriculum(data));
    assert.deepEqual(errors, [], errors.map(formatIssue).join('\n'));
  });

  it('loads', () => {
    const c = loadCurriculum(data);
    assert.ok(c.weeks.length > 0);
  });

  it('is the 52-week edition today', () => {
    // Not an invariant — a deliberate tripwire, so that moving to the 56-week
    // variant is a conscious edit here rather than a silent change in the data.
    assert.equal(loadCurriculum(data).weeks.length, 52);
  });

  it('runs Northgate Legal as the client', () => {
    assert.equal(loadCurriculum(data).client.name, 'Northgate Legal');
  });

  it('names the lab repo msp-lab', () => {
    assert.equal(loadCurriculum(data).repo, 'msp-lab');
  });

  it('groups into the declared phases without splitting one', () => {
    const c = loadCurriculum(data);
    const groups = weeksByPhase(c);
    // A phase appearing twice means its weeks are not contiguous.
    assert.equal(new Set(groups.map((g) => g.phase)).size, groups.length);
    assert.equal(groups.length, c.phases.length);
  });

  it('places the first Monday of the year in Week 1', () => {
    const c = loadCurriculum(data);
    const at = calendarPosition(c, parseISODate(c.startDate));
    assert.equal(at.state === 'in_progress' && at.week.week, 1);
  });

  it('carries no per-user data', () => {
    const c = loadCurriculum(data);
    const withNotes = c.weeks.filter((w) => w.notes !== undefined && w.notes !== '');
    assert.deepEqual(withNotes.map((w) => w.week), []);
  });
});

describe('schemaVersion 2', () => {
  const c = loadCurriculum(data);

  it('is on schemaVersion 2', () => {
    assert.equal(c.schemaVersion, 2);
  });

  it('has no per-user field on any week', () => {
    // The repo is public. status, hours and notes are user state and belong in
    // Table Storage — this test is what stops them coming back.
    const offenders = c.weeks.filter(
      (w) => 'status' in w || 'hours' in w || 'notes' in w,
    );
    assert.deepEqual(offenders.map((w) => w.week), []);
  });

  it('gives every week a free option first', () => {
    const missing = c.weeks.filter((w) => !w.tooling.freeOption.trim());
    assert.deepEqual(missing.map((w) => w.week), []);
  });

  it('gives every week a trial field, even when it is null', () => {
    const missing = c.weeks.filter((w) => !('trial' in w.tooling));
    assert.deepEqual(missing.map((w) => w.week), []);
  });
});

describe('trial data', () => {
  const c = loadCurriculum(data);
  const withTrial = c.weeks.filter((w) => w.tooling.trial != null);

  it('exists on the weeks that need a time-limited path', () => {
    // Windows Server (17), the M365 dev tenant (19, 20) and AWS (29) are the
    // ones the year genuinely cannot proceed without.
    for (const week of [17, 19, 20, 29]) {
      assert.ok(
        getWeekTrial(week) != null,
        `Week ${week} should offer a trial`,
      );
    }
  });

  it('always states a name and a duration', () => {
    for (const w of withTrial) {
      assert.ok(w.tooling.trial!.name.trim(), `Week ${w.week} trial has no name`);
      assert.ok(w.tooling.trial!.duration.trim(), `Week ${w.week} trial has no duration`);
    }
  });

  it('records when each trial was last checked', () => {
    // Trial terms rot. Undated trial data is worse than none.
    for (const w of withTrial) {
      const checkedOn = w.tooling.trial!.checkedOn;
      assert.ok(checkedOn, `Week ${w.week} trial has no checkedOn date`);
      assert.doesNotThrow(() => parseISODate(checkedOn!), `Week ${w.week} checkedOn is malformed`);
    }
  });

  it('only ever links over https', () => {
    for (const w of withTrial) {
      const url = w.tooling.trial!.url;
      if (url) {
        assert.match(url, /^https:\/\//, `Week ${w.week} trial link is not https`);
      }
    }
  });

  function getWeekTrial(week: number) {
    return c.weeks.find((w) => w.week === week)?.tooling.trial ?? null;
  }
});
