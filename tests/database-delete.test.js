import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseDeleter } from '../src/recording-persistence.js';
const id = '038342ad-0b62-4a8b-858b-07aa129470cd';
function fixture({ user = { id: 'verified' }, authError = null, error = null, rows = [{ id }] } = {}) {
  const calls = [];
  const client = {
    auth: { async getUser() { calls.push(['auth']); return { data: { user }, error: authError }; } },
    from(table) {
      calls.push(['from', table]);
      return { delete() { calls.push(['delete']); return { eq(column, value) { calls.push(['eq', column, value]); return { async select(columns) { calls.push(['select', columns]); return { data: rows, error }; } }; } }; } };
    },
  };
  return { calls, deleteRecording: createDatabaseDeleter(client) };
}
test('deletion authenticates then deletes exactly the selected UUID under RLS', async () => {
  const f = fixture();
  await f.deleteRecording(id);
  assert.deepEqual(f.calls, [['auth'], ['from', 'recordings'], ['delete'], ['eq', 'id', id], ['select', 'id']]);
});
test('invalid or missing IDs never reach the database', async () => {
  const f = fixture();
  for (const value of [undefined, null, '', ' ', 0, '0', 'not-a-uuid']) await assert.rejects(f.deleteRecording(value), /ID|UUID/);
  assert.deepEqual(f.calls, []);
});
test('unauthenticated users and auth errors never delete', async () => {
  for (const options of [{ user: null }, { authError: { message: 'expired' } }]) {
    const f = fixture(options);
    await assert.rejects(f.deleteRecording(id), /sign in/);
    assert.deepEqual(f.calls, [['auth']]);
  }
});
test('database errors and RLS-hidden or missing rows report failure', async () => {
  await assert.rejects(fixture({ error: { message: 'offline' } }).deleteRecording(id), /offline/);
  await assert.rejects(fixture({ rows: [] }).deleteRecording(id), /not deleted/);
  await assert.rejects(fixture({ rows: null }).deleteRecording(id), /not deleted/);
});
