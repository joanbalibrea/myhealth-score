import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createAccountDeleter } from '../src/account-deletion.js';
const id = '038342ad-0b62-4a8b-858b-07aa129470cd';
function fixture({ wrong = false, failed = false, owner = id } = {}) {
  const calls = [];
  const values = new Map([['myhealth_assessment_owner', owner], ['myhealth_sleep_hours', '8'], ['unrelated', 'keep']]);
  const user = { id, email: 'test@example.com', email_confirmed_at: '2026-01-01' };
  const client = {
    auth: {
      async getUser() { return { data: { user } }; },
      async signInWithPassword(payload) { calls.push(['verify', payload]); return wrong ? { error: { code: 'invalid_credentials' } } : { data: { user, session: {} } }; },
      async signOut(options) { calls.push(['signOut', options]); return {}; },
    },
    functions: { async invoke(...args) { calls.push(['invoke', ...args]); return { data: { success: !failed } }; } },
  };
  return { calls, values, remove: createAccountDeleter(client, () => ({ getItem: key => values.get(key), removeItem: key => values.delete(key) })) };
}
test('password verification precedes body-free invocation, then only owned draft and local session are cleared', async () => {
  const f = fixture();
  await f.remove('password', 'DELETE');
  assert.deepEqual(f.calls, [['verify', { email: 'test@example.com', password: 'password' }], ['invoke', 'delete-account'], ['signOut', { scope: 'local' }]]);
  assert.deepEqual([...f.values], [['unrelated', 'keep']]);
});
test('wrong password and invalid confirmation cannot invoke deletion', async () => {
  const f = fixture({ wrong: true });
  await assert.rejects(f.remove('wrong', 'DELETE'), /Incorrect password/);
  await assert.rejects(f.remove('password', 'delete'), /type DELETE/);
  assert.ok(!f.calls.some(([kind]) => kind === 'invoke'));
});
test('failure preserves draft and session; Quick Launcher draft survives successful deletion', async () => {
  const failed = fixture({ failed: true });
  await assert.rejects(failed.remove('password', 'DELETE'), /couldn't delete/);
  assert.equal(failed.values.get('myhealth_sleep_hours'), '8');
  assert.ok(!failed.calls.some(([kind]) => kind === 'signOut'));
  const quick = fixture({ owner: 'quick' });
  await quick.remove('password', 'DELETE');
  assert.equal(quick.values.get('myhealth_sleep_hours'), '8');
});
// Exercise the actual Edge handler with an injected wrapper/context. JWT
// cryptography is Supabase's responsibility; these tests cover our operations.
const source = (await fs.readFile(new URL('../supabase/functions/delete-account/index.ts', import.meta.url), 'utf8'))
  .replace('import { withSupabase } from "npm:@supabase/server@^1";', 'const withSupabase = (config, handler) => { if (config.auth !== "user") throw new Error("Auth gate required"); return handler; };');
const { default: edge } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function edgeFixture({ listError = false, removeError = false, userId = id, count = 205, authError = false } = {}) {
  let files = Array.from({ length: count }, (_, i) => ({ id: String(i), name: `avatar-${i}.png` }));
  const calls = [];
  return {
    calls,
    ctx: { userClaims: userId ? { id: userId } : null, supabaseAdmin: {
      storage: { from(bucket) { assert.equal(bucket, 'avatars'); return {
        async list(prefix) { assert.equal(prefix, id); return listError ? { error: new Error('offline') } : { data: files.slice(0, 100) }; },
        async remove(paths) { calls.push(['remove', paths]); if (removeError) return { error: new Error('denied') }; files = files.slice(paths.length); return { data: paths }; },
      }; } },
      auth: { admin: { async deleteUser(...args) { calls.push(['deleteUser', ...args]); return { error: authError ? new Error('Auth unavailable') : null }; } } },
    } },
  };
}
test('Edge removes all paginated avatars before hard deletion, ignores body identity', async () => {
  const f = edgeFixture();
  const result = await edge.fetch(new Request('https://example.com', { method: 'POST', body: JSON.stringify({ userId: 'other' }) }), f.ctx);
  assert.deepEqual(await result.json(), { success: true });
  assert.equal(f.calls.filter(([kind]) => kind === 'remove').length, 3);
  assert.ok(f.calls.filter(([kind]) => kind === 'remove').flatMap(([, paths]) => paths).every(path => path.startsWith(id + '/')));
  assert.deepEqual(f.calls.at(-1), ['deleteUser', id, false]);
});
test('Edge permits no-avatar deletion, rejects missing identity and aborts on Storage errors', async () => {
  for (const options of [{ listError: true }, { removeError: true }]) {
    const f = edgeFixture(options);
    assert.equal((await edge.fetch(new Request('https://example.com', { method: 'POST' }), f.ctx)).status, 500);
    assert.ok(!f.calls.some(([kind]) => kind === 'deleteUser'));
  }
  const empty = edgeFixture({ count: 0 });
  assert.equal((await edge.fetch(new Request('https://example.com', { method: 'POST' }), empty.ctx)).status, 200);
  const anonymous = edgeFixture({ userId: null });
  assert.equal((await edge.fetch(new Request('https://example.com', { method: 'POST' }), anonymous.ctx)).status, 401);
});
test('Edge reports Auth deletion failure and rejects GET requests', async () => {
  const f = edgeFixture({ count: 0, authError: true });
  assert.equal((await edge.fetch(new Request('https://example.com', { method: 'POST' }), f.ctx)).status, 500);
  assert.equal((await edge.fetch(new Request('https://example.com'), f.ctx)).status, 405);
});
