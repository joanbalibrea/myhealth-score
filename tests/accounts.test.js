import test from 'node:test';
import assert from 'node:assert/strict';
import { registerUser, loginUser, logoutUser, getCurrentUser, getUsers, getUserHistoryKey, getUserHistoryStorage, getCurrentUserHistory, updateCurrentUser, hashPassword } from '../src/accounts.js';
import { readProfile } from '../src/profile.js';
import { saveRecording } from '../src/result-history.js';
import { loadResultContext } from '../src/result-context.js';

function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}
const joan = { username: 'joan', email: 'joan@test.com', password: 'test123', confirmation: 'test123' };
const maria = { username: 'maria', email: 'maria@test.com', password: 'example456', confirmation: 'example456' };

test('A–H: independent accounts, logout, wrong/correct login, duplicates and switching', async () => {
  const local = storage({ myhealth_profile: '{"name":"Legacy"}', myhealth_history: '[{"id":"legacy"}]' });
  const session = storage();
  const a = await registerUser(joan, local, session);
  assert.equal(getCurrentUser(local, session).username, 'joan');
  assert.deepEqual(getCurrentUserHistory(local, session), []);
  assert.equal(a.passwordHash, await hashPassword('test123'));
  assert.equal(a.passwordHash.length, 64);
  assert.doesNotMatch(local.getItem('myhealth_users'), /test123|example456/);
  updateCurrentUser({ avatar: 'data:image/png;base64,AAAA' }, local, session);
  const joanHistory = getUserHistoryStorage(local, session);
  const record = { id: 'joan-only', date: '2026-10-30T12:00:00Z', overallScore: 7, completeness: 90, domainScores: { sleep: 7 } };
  saveRecording(joanHistory, record); saveRecording(joanHistory, record);
  logoutUser(session);
  assert.equal(getCurrentUser(local, session), null);
  assert.equal(getUsers(local).length, 1);
  assert.equal(JSON.parse(local.getItem(getUserHistoryKey(a.id))).length, 1);
  await assert.rejects(loginUser('joan', 'wrongpassword', local, session), /Incorrect password\./);
  assert.equal(getCurrentUser(local, session), null);
  await loginUser('JOAN@TEST.COM', 'test123', local, session);
  assert.equal(getCurrentUser(local, session).id, a.id);
  await assert.rejects(registerUser({ ...joan, username: 'JOAN', email: 'new@test.com' }, local, session), /This username is already registered\./);
  await assert.rejects(registerUser({ ...joan, username: 'other', email: 'JOAN@Test.com' }, local, session), /An account with this email already exists\./);
  const b = await registerUser(maria, local, session);
  assert.notEqual(a.id, b.id);
  assert.deepEqual(readProfile(local, session), { name: 'maria', avatar: '' });
  assert.deepEqual(getCurrentUserHistory(local, session), []);
  assert.throws(() => joanHistory.getItem('myhealth_history'), /account has changed/);
  const mariaHistory = getUserHistoryStorage(local, session);
  assert.equal(loadResultContext(session, mariaHistory, record.id).record, null);
  saveRecording(mariaHistory, { ...record, id: 'maria-only', overallScore: 9 });
  logoutUser(session);
  await loginUser('joan', 'test123', local, session);
  assert.equal(getCurrentUserHistory(local, session)[0].id, 'joan-only');
  assert.equal(readProfile(local, session).avatar, 'data:image/png;base64,AAAA');
  logoutUser(session);
  await loginUser('maria', 'example456', local, session);
  assert.equal(getCurrentUserHistory(local, session)[0].id, 'maria-only');
  assert.equal(readProfile(local, session).avatar, '');
  assert.equal(local.getItem('myhealth_history'), '[{"id":"legacy"}]');
});

test('empty fields, mismatched confirmation and unknown users cannot authenticate', async () => {
  const local = storage(), session = storage();
  await assert.rejects(registerUser({ ...joan, username: ' ' }, local, session), /required fields/);
  await assert.rejects(registerUser({ ...joan, password: ' ' }, local, session), /required fields/);
  await assert.rejects(registerUser({ ...joan, confirmation: 'different' }, local, session), /Passwords do not match\./);
  await assert.rejects(loginUser('missing', 'password', local, session), /Account not found\. Check your username or email\./);
  assert.equal(local.getItem('myhealth_users'), null);
  assert.equal(session.getItem('myhealth_current_user_id'), null);
});

test('settings enforce case-insensitive username/email uniqueness without changing other accounts', async () => {
  const local = storage(), session = storage();
  const a = await registerUser(joan, local, session);
  const b = await registerUser(maria, local, session);
  assert.throws(() => updateCurrentUser({ username: 'JOAN' }, local, session), /username is already registered/);
  assert.throws(() => updateCurrentUser({ email: 'JOAN@TEST.COM' }, local, session), /email already exists/);
  updateCurrentUser({ username: 'Maria New', email: 'new@test.com', password: 'plaintext' }, local, session);
  assert.equal(getCurrentUser(local, session).username, 'Maria New');
  assert.equal(getUsers(local).find((user) => user.id === a.id).username, 'joan');
  assert.equal(getCurrentUser(local, session).id, b.id);
  assert.equal(getCurrentUser(local, session).passwordHash, b.passwordHash);
  assert.doesNotMatch(local.getItem('myhealth_users'), /plaintext/);
});

test('legacy profile/flag never authenticates; logout/quick reset preserves registry and histories', async () => {
  const local = storage({ myhealth_profile: '{"name":"Legacy"}' });
  const session = storage({ myhealth_registered_session: 'true' });
  assert.equal(getCurrentUser(local, session), null);
  assert.throws(() => getUserHistoryStorage(local, session), /sign in/);
  await registerUser(joan, local, session);
  session.setItem('myhealth_sleep_hours', '8');
  const before = local.getItem('myhealth_users');
  logoutUser(session);
  assert.equal(session.getItem('myhealth_sleep_hours'), null);
  assert.equal(session.getItem('myhealth_registered_session'), null);
  assert.equal(local.getItem('myhealth_users'), before);
  assert.deepEqual(readProfile(local, session), { name: '', avatar: '' });
});
