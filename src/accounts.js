import { clearAssessment } from './account-session.js';

// Browser-only demo authentication. Client-side SHA-256 is NOT production
// authentication security. A real app needs a backend, salted password hashing,
// authenticated server sessions/tokens, and server-side access control.
export function getUsers(storage = globalThis.localStorage) {
  const raw = storage.getItem('myhealth_users');
  if (raw === null) return [];
  const users = JSON.parse(raw);
  if (!Array.isArray(users)) throw new Error('The local account registry could not be read.');
  return users;
}
export function saveUsers(users, storage = globalThis.localStorage) {
  storage.setItem('myhealth_users', JSON.stringify(users));
}
export async function hashPassword(password) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function getCurrentUserId(session = globalThis.sessionStorage) {
  try { return session.getItem('myhealth_current_user_id'); } catch { return null; }
}
export function getCurrentUser(storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  const id = getCurrentUserId(session);
  if (!id) return null;
  try { return getUsers(storage).find((user) => user && user.id === id && typeof user.username === 'string') ?? null; }
  catch { return null; }
}
export function logoutUser(session = globalThis.sessionStorage) {
  session.removeItem('myhealth_current_user_id');
  clearAssessment(session);
}
function activateUser(user, session) {
  clearAssessment(session);
  session.setItem('myhealth_current_user_id', user.id);
  return user;
}
function normalized(value) { return String(value || '').trim().toLowerCase(); }
function checkUnique(users, username, email, exceptId = null) {
  if (users.some((user) => user?.id !== exceptId && normalized(user?.username) === normalized(username))) throw new Error('This username is already registered.');
  if (users.some((user) => user?.id !== exceptId && normalized(user?.email) === normalized(email))) throw new Error('An account with this email already exists.');
}
export async function registerUser(details, storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  logoutUser(session);
  const username = details.username.trim();
  const email = details.email.trim();
  if (!username || !email || !details.password.trim() || !details.confirmation.trim()) throw new Error('Please complete all required fields.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (details.password !== details.confirmation) throw new Error('Passwords do not match.');
  checkUnique(getUsers(storage), username, email);
  const passwordHash = await hashPassword(details.password);
  // Re-read after hashing so a concurrently added account is not overwritten.
  const users = getUsers(storage);
  checkUnique(users, username, email);
  const user = { id: `user_${crypto.randomUUID()}`, username, email, passwordHash, avatar: '', createdAt: new Date().toISOString() };
  saveUsers([...users, user], storage);
  return activateUser(user, session);
}
export async function loginUser(identifier, password, storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  logoutUser(session);
  if (!identifier.trim() || !password.trim()) throw new Error('Please complete all required fields.');
  const user = getUsers(storage).find((user) => user && (normalized(user.username) === normalized(identifier) || normalized(user.email) === normalized(identifier)));
  if (!user) throw new Error('Account not found. Check your username or email.');
  if (await hashPassword(password) !== user.passwordHash) throw new Error('Incorrect password.');
  return activateUser(user, session);
}
export function updateCurrentUser(changes, storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  const current = getCurrentUser(storage, session);
  if (!current) throw new Error('Please sign in before changing your profile.');
  const users = getUsers(storage);
  const username = (changes.username ?? current.username).trim();
  const email = (changes.email ?? current.email).trim();
  if (!username || !email) throw new Error('Username and email are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
  checkUnique(users, username, email, current.id);
  const avatar = changes.avatar ?? current.avatar;
  const updated = { ...current, username, email, avatar: typeof avatar === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(avatar) ? avatar : '' };
  saveUsers(users.map((user) => user?.id === current.id ? updated : user), storage);
  return updated;
}
export function getUserHistoryKey(userId) {
  if (!userId || typeof userId !== 'string') throw new Error('An authenticated user is required.');
  return `myhealth_history_${userId}`;
}
// Adapter keeps the existing history/scoring helpers unchanged, but redirects
// their logical history key to this authenticated account's physical key.
export function getUserHistoryStorage(storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  const user = getCurrentUser(storage, session);
  if (!user) throw new Error('Please sign in to view saved recordings.');
  const key = getUserHistoryKey(user.id);
  function authorize(logicalKey) {
    if (logicalKey !== 'myhealth_history' || getCurrentUserId(session) !== user.id) throw new Error('The signed-in account has changed. Please sign in again.');
  }
  return {
    getItem(logicalKey) { authorize(logicalKey); return storage.getItem(key); },
    setItem(logicalKey, value) { authorize(logicalKey); storage.setItem(key, value); },
  };
}
export function getCurrentUserHistory(storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  const raw = getUserHistoryStorage(storage, session).getItem('myhealth_history');
  if (raw === null) return [];
  const history = JSON.parse(raw);
  if (!Array.isArray(history)) throw new Error('Saved history could not be read.');
  return history;
}
