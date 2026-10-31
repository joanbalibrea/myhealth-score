import test from 'node:test';
import assert from 'node:assert/strict';
import { createPasswordRecovery, recoveryRequestMessage } from '../src/password-recovery.js';
function fixture({ session = { access_token: 'test-token' }, user = { id: 'verified' }, requestError = null, updateError = null, logoutError = null } = {}) {
  const calls = [];
  const auth = {
    async getSession() { calls.push(['session']); return { data: { session } }; },
    async getUser() { calls.push(['user']); return { data: { user } }; },
    async resetPasswordForEmail(email, options) { calls.push(['request', email, options]); return { error: requestError }; },
    async updateUser(attributes) { calls.push(['update', attributes]); return { error: updateError }; },
    async signOut() { calls.push(['signOut']); return { error: logoutError }; },
  };
  return { ...createPasswordRecovery({ auth }), calls };
}
test('request trims email, uses deployment origin and gives generic success', async () => {
  const f = fixture();
  for (const email of [' existing@example.com ', 'unknown@example.com']) assert.equal(await f.requestReset(email, 'https://myhealth.example'), recoveryRequestMessage);
  assert.deepEqual(f.calls[0], ['request', 'existing@example.com', { redirectTo: 'https://myhealth.example/screens/reset-password.html' }]);
});
test('invalid email is rejected before contacting Auth', async () => {
  const f = fixture();
  for (const email of ['', ' ', 'invalid', 'a@b']) await assert.rejects(f.requestReset(email, 'https://example.com'), /valid email/);
  assert.deepEqual(f.calls, []);
});
test('request failures never expose raw account existence errors', async () => {
  const f = fixture({ requestError: { code: 'user_not_found', message: 'Account not found', status: 400 } });
  await assert.rejects(f.requestReset('unknown@example.com', 'https://example.com'), /Unable to send a reset link/);
});
test('missing session or unverified user cannot update a password', async () => {
  for (const options of [{ session: null }, { user: null }]) {
    const f = fixture(options);
    await assert.rejects(f.updatePassword('newPassword123', 'newPassword123'), /invalid or has expired/);
    assert.ok(!f.calls.some(([kind]) => kind === 'update'));
  }
});
test('initialized session fallback verifies Auth user and updates without current password', async () => {
  const f = fixture();
  assert.equal(await f.hasSession(), true);
  await f.updatePassword('newPassword123', 'newPassword123');
  assert.deepEqual(f.calls.at(-1), ['update', { password: 'newPassword123' }]);
  await f.signOut();
  assert.deepEqual(f.calls.at(-1), ['signOut']);
});
test('password validation prevents empty, short or mismatched updates', async () => {
  const f = fixture();
  for (const values of [['', ''], ['short', 'short'], ['longPassword', 'differentPassword']]) await assert.rejects(f.updatePassword(...values));
  assert.deepEqual(f.calls, []);
});
test('update and sign-out failures are reported separately', async () => {
  await assert.rejects(fixture({ updateError: { code: 'weak_password' } }).updatePassword('longPassword', 'longPassword'), /could not be updated/);
  await assert.rejects(fixture({ logoutError: { message: 'offline' } }).signOut(), /sign out failed/);
});
