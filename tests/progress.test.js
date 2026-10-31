import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssessment, DOMAIN_INFO } from '../src/scoring.js';
import { currentRecording, markRecordingSaved } from '../src/result-history.js';
import { buildProgress, scoreChange, signedChange, chartSegments, validScore, dateLabel } from '../src/progress-data.js';
function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
function record(id, score, date, scores = {}) {
  return { id, name: id, date, overallScore: score, domainScores: Object.fromEntries(DOMAIN_INFO.map((domain) => [domain.id, scores[domain.id] ?? null])) };
}
const now = '2026-10-30T12:00:00Z', before = '2026-10-20T12:00:00Z';
test('database newest-first records plot chronologically without mutation', () => {
  const history = [record('new', 8, now), record('old', 7, before)];
  const original = JSON.stringify(history);
  const model = buildProgress(history);
  assert.deepEqual(model.records.map((entry) => entry.id), ['old', 'new']);
  assert.equal(model.delta, 1);
  assert.equal(model.current.id, 'new');
  assert.equal(JSON.stringify(history), original);
});
test('empty successful query has no fabricated current score', () => {
  const model = buildProgress([]);
  assert.equal(model.current, null);
  assert.deepEqual(model.records, []);
  assert.equal(model.delta, null);
  assert.equal(model.improvement, null);
});
test('unsaved scorable draft appends exactly one current point without writing history', () => {
  const current = record('draft', 7.8, now, { sleep: 6 });
  const model = buildProgress([], current, 'October Week 3');
  assert.equal(model.records.length, 1);
  assert.equal(model.current.current, true);
  assert.equal(model.current.name, 'October Week 3');
  assert.equal(model.previous, null);
  assert.equal(chartSegments(model.records, (entry) => entry.overallScore)[0].length, 1);
});
test('invalid unscored draft is omitted in favor of saved data', () => {
  const saved = record('saved', 8, before);
  const model = buildProgress([saved], record('draft', null, now));
  assert.equal(model.records.length, 1);
  assert.equal(model.current.id, 'saved');
  assert.equal(buildProgress([], record('draft', null, now)).current, null);
});
test('largest improvement uses comparable domains and missing domains have no false delta', () => {
  const model = buildProgress([record('old', 7.1, before, { sleep: 5.8, diet: 7.5 })], record('draft', 7.8, now, { sleep: 7, diet: 8, body: 8 }));
  assert.equal(model.delta, 0.7);
  assert.equal(model.improvement.id, 'sleep');
  assert.equal(model.improvement.delta, 1.2);
  assert.equal(model.changes.find((entry) => entry.id === 'body').delta, null);
});
test('stable/negative trends do not invent improvements', () => {
  assert.equal(scoreChange(7, 7.04), 0);
  assert.equal(signedChange(scoreChange(7.1, 7.8)), '−0.7');
  assert.equal(signedChange(scoreChange(8, 7.2)), '+0.8');
  assert.equal(buildProgress([record('old', 8, before, { sleep: 8 })], record('draft', 7, now, { sleep: 7 })).improvement, null);
});
test('N/A values split chart lines; explicit zero remains a point', () => {
  const records = [record('one', 6, before), record('two', null, before), record('three', 0, now), record('four', 8, now)];
  const segments = chartSegments(records, (entry) => entry.overallScore);
  assert.deepEqual(segments.map((segment) => segment.length), [1, 2]);
  assert.equal(segments[1][0].score, 0);
  assert.equal(segments[1][0].y, 210);
  for (const value of [null, undefined, '', '8', NaN, Infinity, -1, 11]) assert.equal(validScore(value), null);
});
test('saved database UUID marks the draft and prevents duplicate points after reload', () => {
  const session = storage({ myhealth_sleep_hours: '8' });
  const result = calculateAssessment(session);
  const current = currentRecording(result, 'Week 3', session, new Date(now));
  const saved = { ...current, id: 'database-uuid' };
  markRecordingSaved(current, saved, session);
  const reloaded = currentRecording(result, 'Week 3', session);
  assert.equal(reloaded.savedRecordId, 'database-uuid');
  const model = buildProgress([saved], reloaded);
  assert.equal(model.records.length, 1);
  assert.equal(model.current.id, 'database-uuid');
  assert.equal(model.previous, null);
  const changed = currentRecording(calculateAssessment(storage({ myhealth_sleep_hours: '5' })), 'Week 3', session);
  assert.equal(changed.savedRecordId, undefined);
  assert.equal(buildProgress([saved], changed).records.length, 2);
});
test('pre-migration saved snapshot also deduplicates by exact date/name/answers', () => {
  const draft = { ...record('local', 8, now), answers: { sleep_hours: 8 } };
  const saved = { ...draft, id: 'database' };
  assert.equal(buildProgress([saved], draft).records.length, 1);
});
test('session metadata errors never create persistent recording history', () => {
  const session = storage({ myhealth_current_result_identity: '{bad' });
  const record = currentRecording(calculateAssessment(session), 'Current Recording', session, new Date(now));
  assert.equal(dateLabel(record.date), '30/10/2026');
  assert.equal(typeof record.id, 'string');
});
