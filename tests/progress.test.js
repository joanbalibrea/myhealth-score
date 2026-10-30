import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssessment, DOMAIN_INFO } from '../src/scoring.js';
import { currentRecording, saveRecording } from '../src/result-history.js';
import { validatedHistory, buildProgress, scoreChange, signedChange, chartSegments, validScore, dateLabel } from '../src/progress-data.js';

function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
function record(id, score, date, scores = {}) {
  return { id, name: id, date, overallScore: score, domainScores: Object.fromEntries(DOMAIN_INFO.map((domain) => [domain.id, scores[domain.id] ?? null])) };
}
const now = '2026-10-30T12:00:00Z';
const previousDate = '2026-10-20T12:00:00Z';

test('history reads are safe for missing, malformed, blocked and non-array data', () => {
  assert.deepEqual(validatedHistory(storage()).records, []);
  for (const raw of ['{bad', '{}', '', 'null']) assert.equal(validatedHistory(storage({ myhealth_history: raw })).unavailable, true);
  assert.equal(validatedHistory({ getItem() { throw new Error('blocked'); } }).unavailable, true);
  assert.deepEqual(validatedHistory(storage({ myhealth_history: '[]' })).records, []);
});
test('invalid records and scores are omitted; valid history is sorted and deduplicated', () => {
  const values = [null, {}, { date: 'not a date', overallScore: 8 }, record('later', 8, now), record('earlier', 7, previousDate), record('later', 8, now), record('bad', '7', now), record('partial', null, now, { sleep: 0, diet: 12 })];
  const source = storage({ myhealth_history: JSON.stringify(values) });
  const before = source.getItem('myhealth_history');
  const result = validatedHistory(source);
  assert.equal(result.records.length, 3);
  assert.equal(result.records[0].id, 'earlier');
  assert.equal(result.records[2].domainScores.sleep, 0);
  assert.equal(result.records[2].domainScores.diet, null);
  assert.equal(source.getItem('myhealth_history'), before);
  for (const invalid of [null, undefined, '', '8', NaN, Infinity, -1, 11]) assert.equal(validScore(invalid), null);
});
test('no history yields current only and no invented change or improvement', () => {
  const current = record('current', 7.8, now, { sleep: 6 });
  const result = buildProgress([], current);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].current, true);
  assert.equal(result.previous, null);
  assert.equal(result.delta, null);
  assert.equal(result.improvement, null);
  assert.ok(result.changes.every((domain) => domain.delta === null));
  const segments = chartSegments(result.records, (entry) => entry.overallScore);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].length, 1);
  assert.equal(segments[0][0].score, 7.8);
});
test('previous comparison, largest improvement and no-comparison N/A are accurate', () => {
  const current = record('current', 7.8, now, { sleep: 7, diet: 8, body: 8 });
  const previous = record('previous', 7.1, previousDate, { sleep: 5.8, diet: 7.5 });
  const result = buildProgress([previous], current, 'October Week 3');
  assert.equal(result.delta, 0.7);
  assert.equal(result.improvement.id, 'sleep');
  assert.equal(result.improvement.delta, 1.2);
  assert.equal(result.changes.find((entry) => entry.id === 'body').delta, null);
  assert.equal(result.records.at(-1).name, 'October Week 3');
});
test('negative and rounded stable changes do not invent domain improvement', () => {
  assert.equal(scoreChange(7, 7.04), 0);
  assert.equal(signedChange(scoreChange(7, 7.04)), '0.0');
  assert.equal(signedChange(scoreChange(7.1, 7.8)), '−0.7');
  assert.equal(signedChange(scoreChange(8, 7.2)), '+0.8');
  const result = buildProgress([record('previous', 8, previousDate, { sleep: 8 })], record('current', 7, now, { sleep: 7 }));
  assert.equal(result.delta, -1);
  assert.equal(result.improvement, null);
});
test('N/A values split chart lines rather than producing zeros or bridges', () => {
  const records = [record('one', 6, previousDate), record('two', null, previousDate), record('three', 0, now), record('four', 8, now)];
  const segments = chartSegments(records, (entry) => entry.overallScore);
  assert.deepEqual(segments.map((segment) => segment.length), [1, 2]);
  assert.equal(segments[1][0].score, 0);
  assert.equal(segments[1][0].y, 210);
  assert.ok(segments.flat().every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
test('same current recording identity is reused across Results and Progress without history writes', () => {
  const session = storage({ myhealth_sleep_hours: '8' });
  const result = calculateAssessment(session);
  const first = currentRecording(result, 'Week 3', session, new Date(now));
  const again = currentRecording(result, 'Week 3', session, new Date('2026-10-30T12:05:00Z'));
  assert.equal(first.id, again.id);
  assert.equal(first.date, again.date);
  assert.equal(session.getItem('myhealth_history'), null);
  const history = storage();
  saveRecording(history, first);
  const model = buildProgress(validatedHistory(history).records, again);
  assert.equal(model.records.length, 1);
  assert.equal(model.previous, null);
  const changed = currentRecording(calculateAssessment(storage({ myhealth_sleep_hours: '5' })), 'Week 3', session, new Date(now));
  assert.notEqual(changed.id, first.id);
});
test('current already in history is not duplicated and prior comparison excludes itself', () => {
  const current = record('current', 7.8, now);
  const prior = record('prior', 7, previousDate);
  const result = buildProgress([prior, current], current);
  assert.equal(result.records.length, 2);
  assert.equal(result.previous.id, 'prior');
  assert.equal(result.delta, 0.8);
});
test('malformed session identity never prevents a new current record', () => {
  const session = storage({ myhealth_current_result_identity: '{bad' });
  const record = currentRecording(calculateAssessment(session), 'Current Recording', session, new Date(now));
  assert.equal(record.date, now.replace('Z', '.000Z'));
  assert.equal(typeof record.id, 'string');
  assert.equal(dateLabel(now), '30/10/2026');
});
