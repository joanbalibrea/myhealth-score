import test from 'node:test';
import assert from 'node:assert/strict';
import { startRecording, clearAssessment, ASSESSMENT_KEYS } from '../src/profile.js';
import { calculateAssessment } from '../src/scoring.js';
import { currentRecording } from '../src/result-history.js';
import { loadResultContext, loadDatabaseResultContext, historicalResult, recordingLabel } from '../src/result-context.js';
function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}
test('new assessment resets draft answers while preserving unrelated state', () => {
  const session = storage(Object.fromEntries(ASSESSMENT_KEYS.map((key) => [`myhealth_${key}`, 'old'])));
  session.setItem('myhealth_assessment_owner', 'ada'); session.setItem('unrelated', 'keep');
  startRecording(session, ' November Week 1 ');
  assert.equal(session.getItem('myhealth_recording_name'), 'November Week 1');
  assert.equal(session.getItem('myhealth_assessment_owner'), 'ada');
  assert.equal(session.getItem('unrelated'), 'keep');
  ASSESSMENT_KEYS.filter((key) => key !== 'recording_name').forEach((key) => assert.equal(session.getItem(`myhealth_${key}`), null));
  clearAssessment(session); assert.equal(session.getItem('myhealth_recording_name'), null);
});
test('snapshot contains reproducible recommendations and no credentials', () => {
  const session = storage({ myhealth_sleep_hours: '5', myhealth_password: 'secret' });
  const record = currentRecording(calculateAssessment(session), 'Week 1', session);
  assert.match(record.recommendations.sleep, /below the usual adult target/);
  assert.equal(record.answers.sleep_hours, 5);
  assert.doesNotMatch(JSON.stringify(record), /secret|password/);
});
test('historical database view does not use or overwrite current answers', async () => {
  const session = storage({ myhealth_sleep_hours: '8' });
  const old = { id: 'db-id', name: 'Old week', date: '2026-10-20T12:00:00Z', overallScore: 5, completeness: 75, domainScores: { sleep: 5 }, recommendations: { sleep: 'Saved guidance' } };
  const context = await loadDatabaseResultContext(old.id, async () => old);
  assert.equal(context.result.overallScore, 5);
  assert.equal(context.result.recommendations.sleep, 'Saved guidance');
  assert.equal(session.getItem('myhealth_sleep_hours'), '8');
  assert.equal(loadResultContext(session).result.overallScore, 10);
});
test('missing database record stays historical; older saved records retain N/A domains', async () => {
  const missing = await loadDatabaseResultContext('missing', async () => null);
  assert.equal(missing.historical, true);
  assert.equal(missing.result.overallScore, null);
  const record = { id: 'db-id', name: '', date: '2026-10-20T12:00:00Z', overallScore: 7.1, completeness: 75, domainScores: { sleep: 5.8 } };
  const result = historicalResult(record);
  assert.equal(result.domains.find((entry) => entry.id === 'diet').score, null);
  assert.deepEqual(result.focusTargets.map((entry) => entry.id), ['sleep']);
  assert.equal(recordingLabel(record), '20/10/2026');
});
