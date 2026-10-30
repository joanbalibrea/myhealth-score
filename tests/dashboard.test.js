import test from 'node:test';
import assert from 'node:assert/strict';
import { readProfile, saveProfile, startRecording, clearAssessment, ASSESSMENT_KEYS } from '../src/profile.js';
import { calculateAssessment } from '../src/scoring.js';
import { currentRecording, readHistory, saveRecording } from '../src/result-history.js';
import { loadResultContext, historicalResult, recordingLabel } from '../src/result-context.js';
import { validatedHistory, scoreChange } from '../src/progress-data.js';

function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}

test('new recording clears every assessment answer while retaining profile/session state', () => {
  const session = storage(Object.fromEntries(ASSESSMENT_KEYS.map((key) => [`myhealth_${key}`, 'old'])));
  session.setItem('myhealth_profile', '{"name":"Ada"}');
  session.setItem('myhealth_assessment_owner', 'ada');
  session.setItem('unrelated', 'keep');
  startRecording(session, '  November Week 1  ');
  assert.equal(session.getItem('myhealth_recording_name'), 'November Week 1');
  assert.equal(session.getItem('myhealth_assessment_owner'), 'ada');
  assert.equal(session.getItem('myhealth_profile'), '{"name":"Ada"}');
  assert.equal(session.getItem('unrelated'), 'keep');
  ASSESSMENT_KEYS.filter((key) => key !== 'recording_name').forEach((key) => assert.equal(session.getItem(`myhealth_${key}`), null));
  startRecording(session, '');
  assert.equal(session.getItem('myhealth_recording_name'), null);
});

test('exit clears active answers and registered session but never local profile/history', () => {
  const session = storage({ myhealth_registered_session: 'true', myhealth_sleep_hours: '8' });
  const local = storage({ myhealth_profile: '{"name":"Ada"}', myhealth_history: '[{"id":"one"}]' });
  clearAssessment(session);
  assert.equal(session.getItem('myhealth_registered_session'), null);
  assert.equal(session.getItem('myhealth_sleep_hours'), null);
  assert.equal(local.getItem('myhealth_profile'), '{"name":"Ada"}');
  assert.equal(local.getItem('myhealth_history'), '[{"id":"one"}]');
});

test('profile storage whitelists display fields and never passwords', () => {
  const local = storage();
  const user = { id: 'ada', email: 'ada@test.com', user_metadata: { username: 'Ada' } };
  saveProfile(local, { avatar: 'https://untrusted.example/image', password: 'secret', sleep_hours: 8 }, user);
  assert.deepEqual(readProfile(local, user), { name: 'Ada', avatar: '' });
  assert.doesNotMatch(local.getItem('myhealth_profile_ada'), /secret|sleep_hours/);
  saveProfile(local, { avatar: 'data:image/png;base64,AAAA' }, user);
  assert.equal(readProfile(local, user).avatar, 'data:image/png;base64,AAAA');
  assert.deepEqual(readProfile(local, null), { name: '', avatar: '' });
  assert.equal(readProfile(local, { id: 'other', email: 'other@test.com' }).name, 'other@test.com');
});

test('new history includes reproducible scores, recommendations and only recognized answers', () => {
  const session = storage({ myhealth_sleep_hours: '5', myhealth_recording_name: 'Week 1', myhealth_password: 'secret' });
  const result = calculateAssessment(session);
  const record = currentRecording(result, 'Week 1', session, new Date('2026-10-30T12:00:00Z'));
  assert.match(record.recommendations.sleep, /below the usual adult target/);
  assert.equal(record.answers.sleep_hours, 5);
  assert.equal(record.domainScores.sleep, 5);
  assert.equal(record.domainCoverage.sleep, 0.45);
  assert.doesNotMatch(JSON.stringify(record), /secret|password/);
  const local = storage();
  saveRecording(local, record); saveRecording(local, record);
  assert.equal(readHistory(local).length, 1);
});

test('historical results use selected scores and recommendations without touching active answers', () => {
  const oldSession = storage({ myhealth_sleep_hours: '5' });
  const record = currentRecording(calculateAssessment(oldSession), 'Old week', oldSession, new Date('2026-10-20T12:00:00Z'));
  const local = storage(); saveRecording(local, record);
  const active = storage({ myhealth_sleep_hours: '8', myhealth_recording_name: 'New week' });
  const before = local.getItem('myhealth_history');
  const context = loadResultContext(active, local, record.id);
  assert.equal(context.historical, true);
  assert.equal(context.result.overallScore, 5);
  assert.match(context.result.recommendations.sleep, /below the usual adult target/);
  assert.equal(recordingLabel(context.record), 'Old week');
  assert.equal(active.getItem('myhealth_sleep_hours'), '8');
  assert.equal(local.getItem('myhealth_history'), before);
  assert.equal(loadResultContext(active, local, null).result.overallScore, 10);
});

test('unknown historical ID never silently falls back to the active assessment', () => {
  const session = storage({ myhealth_sleep_hours: '8' });
  const context = loadResultContext(session, storage(), 'missing');
  assert.equal(context.historical, true);
  assert.equal(context.result.overallScore, null);
  assert.match(context.error, /unavailable/);
});

test('older minimal records preserve scores without invented detailed answers', () => {
  const old = { id: 'old', name: '', date: '2026-10-20T12:00:00Z', overallScore: 7.1, completeness: 75, domainScores: { sleep: 5.8, body: 8.4 } };
  const result = historicalResult(old);
  assert.equal(result.overallScore, 7.1);
  assert.equal(result.completeness.percent, 75);
  assert.equal(result.domains.find((entry) => entry.id === 'diet').score, null);
  assert.deepEqual(result.focusTargets.map((entry) => entry.id), ['sleep']);
  assert.deepEqual(result.recommendations, {});
  assert.equal(recordingLabel(old), '20/10/2026');
});

test('dashboard valid history handles zero, one and many saved records in order', () => {
  for (const count of [0, 1, 2, 4, 6]) {
    const entries = Array.from({ length: count }, (_, index) => ({ id: `id-${index}`, name: `Week ${index}`, date: `2026-10-${String(index + 1).padStart(2, '0')}T12:00:00Z`, overallScore: 6 + index * 0.2, completeness: 70, domainScores: { sleep: 7 } }));
    const records = validatedHistory(storage({ myhealth_history: JSON.stringify([...entries].reverse()) })).records;
    assert.equal(records.length, count);
    assert.equal([...records].reverse().slice(0, 4).length, Math.min(count, 4));
    if (count) assert.equal(records.at(-1).id, `id-${count - 1}`);
    if (count > 1) assert.equal(scoreChange(records.at(-1).overallScore, records.at(-2).overallScore), 0.2);
  }
});

test('saved N/A recording is not silently lost from dashboard history', () => {
  const record = { id: 'empty', date: '2026-10-20T12:00:00Z', overallScore: null, domainScores: {} };
  const records = validatedHistory(storage({ myhealth_history: JSON.stringify([record]) })).records;
  assert.equal(records.length, 1);
  assert.equal(records[0].overallScore, null);
});
