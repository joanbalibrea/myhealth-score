import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseReaders, normalizeRecordingRow } from '../src/recording-persistence.js';
import { loadDatabaseResultContext } from '../src/result-context.js';

const row = {
  id: '038342ad-0b62-4a8b-858b-07aa129470cd', name: 'Database week', recorded_at: '2026-10-31T12:00:00+00:00', created_at: '2026-10-31T12:01:00+00:00',
  overall_score: '7.8', completeness: '85', domain_scores: { body: '8.4', sleep: '5.8', diet: null }, domain_coverage: { sleep: '0.45' },
  focus_targets: ['sleep'], score_details: [{ id: 'sleep', score: '5.8', items: [{ name: 'Duration', score: 5 }] }], recommendations: { sleep: 'Saved recommendation' }, answers: { sleep_hours: 5 },
};
function fixture({ user = { id: 'authenticated' }, authError = null, error = null, rows = [row], single = row } = {}) {
  const calls = [];
  const client = {
    auth: { async getUser() { calls.push(['auth']); return { data: { user }, error: authError }; } },
    from(table) {
      calls.push(['from', table]);
      return { select() {
        calls.push(['select']);
        return {
          async order(column, options) { calls.push(['order', column, options]); return { data: rows, error }; },
          eq(column, id) { calls.push(['eq', column, id]); return { async maybeSingle() { calls.push(['maybeSingle']); return { data: single, error }; } }; },
        };
      } };
    },
  };
  return { calls, ...createDatabaseReaders(client) };
}

test('one normalization helper preserves snapshot and converts numeric strings without inventing zeros', () => {
  const recording = normalizeRecordingRow(row);
  assert.equal(recording.id, row.id);
  assert.equal(recording.name, 'Database week');
  assert.equal(recording.date, row.recorded_at);
  assert.equal(recording.overallScore, 7.8);
  assert.equal(recording.completeness, 85);
  assert.equal(recording.domainScores.body, 8.4);
  assert.equal(recording.domainScores.diet, null);
  assert.equal(recording.domainScores.mental, null);
  assert.equal(recording.domainCoverage.sleep, 0.45);
  assert.equal(recording.scoreDetails[0].score, 5.8);
  assert.equal(recording.recommendations, row.recommendations);
  assert.equal(recording.answers, row.answers);
  assert.equal(recording.focusTargets, row.focus_targets);
  const zeros = normalizeRecordingRow({ ...row, overall_score: 0, completeness: 0, domain_scores: { sleep: '0', body: '' } });
  assert.equal(zeros.overallScore, 0);
  assert.equal(zeros.completeness, 0);
  assert.equal(zeros.domainScores.sleep, 0);
  assert.equal(zeros.domainScores.body, null);
});
test('getRecordings authenticates and requests newest-first rows with RLS, no user-ID filter', async () => {
  const f = fixture();
  const records = await f.getRecordings();
  assert.equal(records[0].id, row.id);
  assert.equal(records[0].overallScore, 7.8);
  assert.deepEqual(f.calls, [['auth'], ['from', 'recordings'], ['select'], ['order', 'recorded_at', { ascending: false }]]);
});
test('genuinely empty history is an empty array; query errors are not treated as empty history', async () => {
  assert.deepEqual(await fixture({ rows: [] }).getRecordings(), []);
  await assert.rejects(fixture({ error: { message: 'Network unavailable' } }).getRecordings(), /Network unavailable/);
  await assert.rejects(fixture({ rows: null }).getRecordings(), /did not return a recording list/);
});
test('all read methods reject unauthenticated requests before querying', async () => {
  for (const options of [{ user: null }, { authError: { message: 'Expired' } }]) {
    const f = fixture(options);
    await assert.rejects(f.getRecordings(), /Please sign in/);
    await assert.rejects(f.getRecordingById(row.id), /Please sign in/);
    assert.ok(f.calls.every(([call]) => call === 'auth'));
  }
});
test('getRecordingById validates ID, filters by ID only and handles missing/RLS-inaccessible rows', async () => {
  const f = fixture();
  for (const id of [null, undefined, '', ' ']) await assert.rejects(f.getRecordingById(id), /recording ID is required/);
  assert.equal(f.calls.length, 0);
  assert.equal((await f.getRecordingById(row.id)).id, row.id);
  assert.deepEqual(f.calls, [['auth'], ['from', 'recordings'], ['select'], ['eq', 'id', row.id], ['maybeSingle']]);
  assert.equal(await fixture({ single: null }).getRecordingById(row.id), null);
  await assert.rejects(fixture({ error: { message: 'Database error' } }).getRecordingById(row.id), /Database error/);
});
test('historical context renders stored values and recommendations, with no active-assessment recalculation', async () => {
  const f = fixture();
  const context = await loadDatabaseResultContext(row.id, f.getRecordingById);
  assert.equal(context.historical, true);
  assert.equal(context.result.overallScore, 7.8);
  assert.equal(context.result.domains.find((domain) => domain.id === 'sleep').score, 5.8);
  assert.equal(context.result.recommendations.sleep, 'Saved recommendation');
  assert.equal(context.result.completeness.percent, 85);
  assert.equal(context.record.id, row.id);
  assert.deepEqual(context.result.focusTargets.map((domain) => domain.id), ['sleep']);
});
test('missing historical record remains historical with explicit access message, never active data', async () => {
  const context = await loadDatabaseResultContext(row.id, async () => null);
  assert.equal(context.historical, true);
  assert.equal(context.result.overallScore, null);
  assert.equal(context.record, null);
  assert.match(context.error, /could not be found or you do not have access/);
  await assert.rejects(loadDatabaseResultContext(row.id, async () => { throw new Error('offline'); }), /offline/);
});
