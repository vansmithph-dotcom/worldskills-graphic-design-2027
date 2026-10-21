import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const timeline = JSON.parse(fs.readFileSync(path.join(root, 'content/timeline.json'), 'utf8'));

test('timeline_totals_are_228_168_60_and_ends_on_january_31', () => {
  assert.equal(timeline.totalHours, 228);
  assert.equal(timeline.guidedHours, 168);
  assert.equal(timeline.selfStudyHours, 60);
  assert.equal(timeline.phases.length, 4);
  assert.equal(timeline.phases.at(-1).endDate, '2027-01-31');
  assert.equal(timeline.phases.reduce((sum, phase) => sum + phase.totalHours, 0), 228);
  assert.equal(timeline.phases.reduce((sum, phase) => sum + phase.guidedHours, 0), 168);
  assert.equal(timeline.phases.reduce((sum, phase) => sum + phase.selfStudyHours, 0), 60);
});

test('timed_case_practice_is_included_in_the_228_hour_allocation', () => {
  assert.equal(timeline.timedPractice.guidedMinutes, 404);
  assert.equal(timeline.timedPractice.independentMinutes, 283);
  assert.equal(timeline.timedPractice.totalMinutes, 687);
  assert.equal(timeline.timedPractice.includedInCourseHours, true);
  assert.equal(timeline.timedPractice.guidedRemainingMinutes, 168 * 60 - 404);
  assert.equal(timeline.timedPractice.independentRemainingMinutes, 60 * 60 - 283);
  assert.equal(timeline.timedPractice.remainingMinutes, 228 * 60 - 687);
  assert.ok(timeline.timedPractice.remainingUse.guided.length >= 2);
  assert.ok(timeline.timedPractice.remainingUse.independent.length >= 2);
});

test('post_publication_adaptation_has_a_trigger_but_no_guessed_calendar_date', () => {
  assert.ok(timeline.postPublication.trigger);
  assert.ok(timeline.postPublication.week1);
  assert.ok(timeline.postPublication.weeks2to4);
  assert.ok(timeline.postPublication.untilContest);
  assert.equal('startDate' in timeline.postPublication, false);
  assert.equal('date' in timeline.postPublication, false);
});
