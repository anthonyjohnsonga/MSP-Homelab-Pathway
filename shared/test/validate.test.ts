import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { errorsOnly, validateCurriculum } from '../src/validate.ts';
import { clone, makeCurriculum } from './fixtures.ts';

/** Assert that a specific issue code was raised. */
function hasCode(data: unknown, code: string): boolean {
  return validateCurriculum(data).some((i) => i.code === code);
}

describe('a well-formed curriculum', () => {
  it('produces no errors', () => {
    assert.deepEqual(errorsOnly(validateCurriculum(makeCurriculum())), []);
  });

  it('validates at 56 weeks without code changes', () => {
    // The consolidation-week variant. Nothing may hardcode 52.
    assert.deepEqual(errorsOnly(validateCurriculum(makeCurriculum(56))), []);
  });

  it('validates a single-week curriculum', () => {
    assert.deepEqual(errorsOnly(validateCurriculum(makeCurriculum(1))), []);
  });
});

describe('structural rejections', () => {
  it('rejects a non-object', () => {
    assert.ok(hasCode(null, 'not_an_object'));
    assert.ok(hasCode('nope', 'not_an_object'));
  });

  it('rejects an empty week list', () => {
    const c = clone(makeCurriculum());
    c.weeks = [];
    assert.ok(hasCode(c, 'no_weeks'));
  });

  it('rejects a missing schemaVersion', () => {
    const c = clone(makeCurriculum()) as Record<string, unknown>;
    delete c.schemaVersion;
    assert.ok(hasCode(c, 'schema_version'));
  });
});

describe('week numbering', () => {
  it('rejects a gap', () => {
    const c = clone(makeCurriculum(5));
    c.weeks[2]!.week = 9;
    assert.ok(hasCode(c, 'week_numbering'));
  });

  it('rejects a duplicate', () => {
    const c = clone(makeCurriculum(5));
    c.weeks[3]!.week = 3;
    assert.ok(hasCode(c, 'duplicate_week'));
  });
});

describe('dependencies', () => {
  it('accepts a strictly earlier dependency', () => {
    const c = clone(makeCurriculum(10));
    c.weeks[8]!.dependsOn = [2, 5];
    assert.deepEqual(errorsOnly(validateCurriculum(c)), []);
  });

  it('rejects a forward dependency', () => {
    const c = clone(makeCurriculum(10));
    c.weeks[2]!.dependsOn = [7];
    assert.ok(hasCode(c, 'forward_dependency'));
  });

  it('rejects a self-dependency', () => {
    const c = clone(makeCurriculum(10));
    c.weeks[4]!.dependsOn = [5];
    assert.ok(hasCode(c, 'forward_dependency'));
  });

  it('rejects a dependency on a week that does not exist', () => {
    const c = clone(makeCurriculum(10));
    c.weeks[9]!.dependsOn = [99];
    // 99 is not strictly earlier than 10, so it trips the forward check first.
    assert.ok(hasCode(c, 'forward_dependency'));
  });

  it('rejects a non-array dependsOn', () => {
    const c = clone(makeCurriculum(5)) as unknown as { weeks: { dependsOn: unknown }[] };
    c.weeks[1]!.dependsOn = 3;
    assert.ok(hasCode(c, 'depends_on_type'));
  });
});

describe('the calendar', () => {
  it('rejects a start date that is not a Monday', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[1]!.startDate = '2026-08-18'; // a Tuesday
    assert.ok(hasCode(c, 'not_monday'));
  });

  it('rejects a week that does not span seven days', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[1]!.endDate = '2026-08-21';
    assert.ok(hasCode(c, 'not_seven_days'));
  });

  it('rejects a gap between consecutive weeks', () => {
    const c = clone(makeCurriculum(4));
    // Push week 3 a full week later, leaving seven days unaccounted for.
    c.weeks[2]!.startDate = '2026-08-31';
    c.weeks[2]!.endDate = '2026-09-06';
    assert.ok(hasCode(c, 'gap_in_calendar'));
  });

  it('rejects a malformed date', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[1]!.startDate = 'next monday';
    assert.ok(hasCode(c, 'bad_date'));
  });

  it('rejects a header startDate that disagrees with week 1', () => {
    const c = clone(makeCurriculum(3));
    c.startDate = '2026-01-05';
    assert.ok(hasCode(c, 'start_date_mismatch'));
  });

  it('rejects a header endDate that disagrees with the last week', () => {
    const c = clone(makeCurriculum(3));
    c.endDate = '2027-01-03';
    assert.ok(hasCode(c, 'end_date_mismatch'));
  });
});

describe('content', () => {
  it('rejects a week with no topic', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[0]!.topic = '   ';
    assert.ok(hasCode(c, 'missing_field'));
  });

  it('rejects a week with no artifact', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[0]!.artifact = '';
    assert.ok(hasCode(c, 'missing_field'));
  });

  it('rejects a phase that is not declared', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[1]!.phase = 'Phase 9 — Invented';
    assert.ok(hasCode(c, 'unknown_phase'));
  });

  it('rejects an unrecognised legacy status', () => {
    const c = clone(makeCurriculum(3)) as unknown as { weeks: { status: string }[] };
    c.weeks[0]!.status = 'nearly_done';
    assert.ok(hasCode(c, 'bad_status'));
  });
});

describe('warnings rather than errors', () => {
  it('warns, but does not fail, when a week has no free option', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[1]!.tooling.freeOption = '';
    assert.ok(hasCode(c, 'no_free_option'));
    assert.deepEqual(errorsOnly(validateCurriculum(c)), []);
  });

  it('warns when per-user data is left inline in the repo', () => {
    const c = clone(makeCurriculum(3));
    c.weeks[0]!.notes = 'Finished the UEFI walkthrough';
    assert.ok(hasCode(c, 'inline_user_data'));
    assert.deepEqual(errorsOnly(validateCurriculum(c)), []);
  });

  it('warns about a declared phase no week uses', () => {
    const c = clone(makeCurriculum(3));
    c.phases.push('Phase 2 — Unused');
    assert.ok(hasCode(c, 'unused_phase'));
    assert.deepEqual(errorsOnly(validateCurriculum(c)), []);
  });
});

describe('reporting', () => {
  it('reports every problem at once rather than stopping at the first', () => {
    const c = clone(makeCurriculum(5));
    c.weeks[1]!.topic = '';
    c.weeks[2]!.dependsOn = [4];
    c.weeks[3]!.startDate = '2026-09-02';
    assert.ok(errorsOnly(validateCurriculum(c)).length >= 3);
  });
});
