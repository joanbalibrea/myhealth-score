import test from 'node:test';
import assert from 'node:assert/strict';
import { recordingRow, createDatabaseSaver, createRecordingFinisher } from '../src/recording-persistence.js';

const recording = {
  id: 'local-timestamp-id', user_id: 'untrusted-user', name: 'Week 1', date: '2026-10-31T12:34:56.000Z', overallScore: 7.8, completeness: 85,
  domainScores: { sleep: 7 }, domainCoverage: { sleep: 0.45 }, focusTargets: ['diet'], scoreDetails: [{ id: 'sleep', score: 7 }], recommendations: { sleep: 'Example' }, answers: { sleep_hours: 8 },
};
function fixture({ user = { id: 'verified-user' }, authError = null, dbError = null } = {}) {
  const calls = [];
  const client = {
    auth: { async getUser() { calls.push('auth'); return { data: { user }, error: authError }; } },
    from(table) { calls.push(table); return { insert(row) { calls.push(row); return { select() { calls.push('select'); return { async single() { calls.push('single'); return { data: dbError ? null : { ...row, created_at: recording.date }, error: dbError }; } }; } }; } }; },
  };
  return { calls, save: createDatabaseSaver(client) };
}
test('database insert uses verified identity, correct columns, native JSON and ISO date', async () => {
  const f = fixture(); const saved = await f.save(recording);
  assert.equal(saved.user_id, 'verified-user');
  assert.equal(saved.recorded_at, recording.date);
  assert.match(saved.id, /^[0-9a-f-]{36}$/i);
  assert.notEqual(saved.id, recording.id);
  assert.equal(saved.overall_score, 7.8);
  assert.equal(saved.completeness, 85);
  assert.equal(saved.domain_scores, recording.domainScores);
  assert.equal(saved.domain_coverage, recording.domainCoverage);
  assert.equal(saved.focus_targets, recording.focusTargets);
  assert.equal(saved.score_details, recording.scoreDetails);
  assert.equal(saved.recommendations, recording.recommendations);
  assert.equal(saved.answers, recording.answers);
  assert.deepEqual(f.calls.filter((entry) => typeof entry === 'string'), ['auth', 'recordings', 'select', 'single']);
});
test('missing or invalid dates use a real timestamp rather than parsing display dates', () => {
  const now = new Date('2026-10-31T12:00:00Z');
  for (const date of [undefined, '31/10/2026', '10/31/2026', 'bad']) assert.equal(recordingRow({ date }, 'verified', now).recorded_at, now.toISOString());
  assert.equal(recordingRow({ date: '2026-10-31T14:00:00+02:00' }, 'verified', now).recorded_at, now.toISOString());
  assert.equal(recordingRow({ overallScore: 0 }, 'verified', now).overall_score, 0);
  assert.equal(recordingRow({}, 'verified', now).overall_score, null);
});
test('unauthenticated and failed-auth requests never insert', async () => {
  for (const options of [{ user: null }, { authError: { message: 'Expired' } }]) {
    const f = fixture(options); await assert.rejects(f.save(recording), /Please sign in/);
    assert.deepEqual(f.calls, ['auth']);
  }
});
test('Supabase insert errors retain useful details', async () => {
  const error = { message: 'RLS denied this insert', code: '42501' };
  const f = fixture({ dbError: error });
  await assert.rejects(f.save(recording), (failure) => failure.message.includes('RLS denied') && failure.cause === error);
});
test('database failure is retryable without browser history writes', async () => {
  const sequence = []; let attempts = 0;
  const finish = createRecordingFinisher(recording, async () => { sequence.push('database'); if (++attempts === 1) throw new Error('offline'); return { id: 'saved' }; });
  await assert.rejects(finish(), /offline/);
  assert.deepEqual(sequence, ['database']);
  await finish();
  assert.deepEqual(sequence, ['database', 'database']);
});
test('double clicks share one insert; completed saves are not repeated', async () => {
  let release; let inserts = 0;
  const finish = createRecordingFinisher(recording, () => { inserts++; return new Promise((resolve) => { release = resolve; }); });
  const first = finish(); const second = finish();
  assert.equal(first, second);
  release({ id: 'saved' }); await Promise.all([first, second]); await finish();
  assert.equal(inserts, 1);
});
