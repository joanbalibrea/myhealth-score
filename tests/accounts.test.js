import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/auth-service.js';

function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}
function fixture() {
  const session = storage(), local = storage();
  let user = null;
  let listener = () => {};
  const calls = [];
  const state = { signUpError: null, loginError: null, logoutError: null, signupSession: null, updateError: null };
  const client = { auth: {
    onAuthStateChange(callback) { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
    async getUser() { calls.push(['getUser']); return { data: { user }, error: null }; },
    async signUp(payload) { calls.push(['signUp', payload]); return { data: { user: { id: 'unconfirmed', user_metadata: payload.options.data }, session: state.signupSession }, error: state.signUpError }; },
    async signInWithPassword(payload) { calls.push(['signInWithPassword', payload]); if (state.loginError) return { data: {}, error: state.loginError }; user = { id: 'supabase-joan', email: payload.email, user_metadata: { username: 'joan' } }; listener('SIGNED_IN', { user }); return { data: { user, session: { user } }, error: null }; },
    async signOut() { calls.push(['signOut']); if (state.logoutError) return { error: state.logoutError }; user = null; listener('SIGNED_OUT', null); return { error: null }; },
    async updateUser(payload) { calls.push(['updateUser', payload]); if (state.updateError) return { data: {}, error: state.updateError }; user = { ...user, user_metadata: { ...user.user_metadata, ...payload.data } }; return { data: { user }, error: null }; },
  } };
  return { auth: createAuthService(client, { sessionStorage: session }), state, calls, session, local, setUser(value) { user = value; listener(value ? 'SIGNED_IN' : 'SIGNED_OUT', value ? { user: value } : null); } };
}
const details = { username: ' joan ', email: ' joan@test.com ', password: 'test12345', confirmation: 'test12345' };

test('registration delegates credentials and username metadata to Supabase; confirmation has no session', async () => {
  const f = fixture();
  const result = await f.auth.registerUser(details);
  assert.equal(result.session, null);
  assert.deepEqual(f.calls[0], ['signUp', { email: 'joan@test.com', password: 'test12345', options: { data: { username: 'joan' } } }]);
  assert.equal(await f.auth.getCurrentUser(), null);
});
test('frontend validation rejects empty, mismatched and short passwords before API calls', async () => {
  const f = fixture();
  await assert.rejects(f.auth.registerUser({ ...details, username: ' ' }), /required fields/);
  await assert.rejects(f.auth.registerUser({ ...details, confirmation: 'different' }), /Passwords do not match/);
  await assert.rejects(f.auth.registerUser({ ...details, password: '1234567', confirmation: '1234567' }), /at least 8/);
  assert.equal(f.calls.length, 0);
});
test('login uses Supabase email/password; failed and unconfirmed logins never authenticate', async () => {
  const f = fixture();
  f.state.loginError = { code: 'invalid_credentials' };
  await assert.rejects(f.auth.loginUser('joan@test.com', 'wrong'), /Incorrect email or password/);
  assert.equal(await f.auth.getCurrentUser(), null);
  f.state.loginError = { code: 'email_not_confirmed' };
  await assert.rejects(f.auth.loginUser('joan@test.com', 'password'), /confirm your email/);
  f.state.loginError = null;
  const user = await f.auth.loginUser(' joan@test.com ', 'test12345');
  assert.equal(user.id, 'supabase-joan');
  assert.equal((await f.auth.getCurrentUser()).user_metadata.username, 'joan');
});
test('assessment ownership never establishes authentication', async () => {
  const f = fixture();
  f.session.setItem('myhealth_assessment_owner', 'unverified');
  f.session.setItem('myhealth_sleep_hours', '8');
  assert.equal(await f.auth.getCurrentUser(), null);
  assert.equal(f.session.getItem('myhealth_sleep_hours'), '8');
});
test('logout awaits Supabase success and preserves unrelated preferences', async () => {
  const f = fixture();
  await f.auth.loginUser('joan@test.com', 'test12345');
  f.local.setItem('myhealth_ui_preference', 'compact');
  f.session.setItem('myhealth_sleep_hours', '8');
  f.state.logoutError = { message: 'Try again' };
  await assert.rejects(f.auth.logoutUser(), /Try again/);
  assert.notEqual(await f.auth.getCurrentUser(), null);
  f.state.logoutError = null;
  await f.auth.logoutUser();
  assert.equal(await f.auth.getCurrentUser(), null);
  assert.equal(f.session.getItem('myhealth_sleep_hours'), null);
  assert.equal(f.local.getItem('myhealth_ui_preference'), 'compact');
});
test('authentication switches clear draft answers without removing preferences', async () => {
  const f = fixture();
  f.setUser({ id: 'joan', email: 'joan@test.com' }); await f.auth.getCurrentUser();
  f.session.setItem('myhealth_sleep_hours', '8');
  f.local.setItem('myhealth_ui_preference', 'compact');
  f.setUser({ id: 'maria', email: 'maria@test.com' }); await f.auth.getCurrentUser();
  assert.equal(f.session.getItem('myhealth_sleep_hours'), null);
  assert.equal(f.local.getItem('myhealth_ui_preference'), 'compact');
});


test('email update changes only Auth email and retains confirmed address while pending', async () => {
  const f = fixture(); await f.auth.loginUser('joan@test.com', 'test12345');
  const user = await f.auth.changeEmail(' new@test.com ');
  assert.deepEqual(f.calls.at(-1), ['updateUser', { email: 'new@test.com' }]);
  assert.equal(user.email, 'joan@test.com');
  assert.equal(user.user_metadata.username, 'joan');
  for (const email of ['', 'bad-email', ' JOAN@test.com ']) await assert.rejects(f.auth.changeEmail(email), /valid email|different/);
  assert.equal(f.calls.filter(([kind]) => kind === 'updateUser').length, 1);
});
test('email errors map duplicate and invalid addresses to useful messages', async () => {
  const f = fixture(); await f.auth.loginUser('joan@test.com', 'test12345');
  f.state.updateError = { code: 'email_exists' };
  await assert.rejects(f.auth.changeEmail('new@test.com'), /already in use/);
  f.state.updateError = { code: 'email_address_invalid' };
  await assert.rejects(f.auth.changeEmail('new@test.com'), /valid email/);
});
test('password update sends current and new passwords only to Auth and preserves session', async () => {
  const f = fixture(); await f.auth.loginUser('joan@test.com', 'test12345');
  await f.auth.changePassword('test12345', 'newPassword123', 'newPassword123');
  assert.deepEqual(f.calls.at(-1), ['updateUser', { current_password: 'test12345', password: 'newPassword123' }]);
  assert.equal((await f.auth.getCurrentUser()).email, 'joan@test.com');
  assert.equal(f.session.getItem('myhealth_assessment_owner'), 'supabase-joan');
  for (const key of ['password', 'current_password', 'newPassword123']) {
    assert.equal(f.local.getItem(key), null);
    assert.equal(f.session.getItem(key), null);
  }
});
test('password validation prevents invalid requests', async () => {
  const f = fixture(); await f.auth.loginUser('joan@test.com', 'test12345');
  for (const args of [['', 'newPassword123', 'newPassword123'], ['old', 'short', 'short'], ['old', 'newPassword123', 'different'], ['test12345', 'test12345', 'test12345']]) {
    await assert.rejects(f.auth.changePassword(...args));
  }
  assert.ok(!f.calls.some(([kind]) => kind === 'updateUser'));
});
test('wrong current password returns an error without signing out or updating profile metadata', async () => {
  const f = fixture(); await f.auth.loginUser('joan@test.com', 'test12345');
  f.state.updateError = { code: 'current_password_mismatch', status: 400 };
  await assert.rejects(f.auth.changePassword('wrong', 'newPassword123', 'newPassword123'), /current password is incorrect/);
  const user = await f.auth.getCurrentUser();
  assert.equal(user.user_metadata.username, 'joan');
  assert.ok(!f.calls.some(([kind]) => kind === 'signOut'));
});
test('account changes require authenticated user before update', async () => {
  const f = fixture();
  await assert.rejects(f.auth.changeEmail('new@test.com'), /sign in/);
  await assert.rejects(f.auth.changePassword('old', 'newPassword123', 'newPassword123'), /sign in/);
  assert.ok(!f.calls.some(([kind]) => kind === 'updateUser'));
});
