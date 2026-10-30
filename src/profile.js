import { getCurrentUser, updateCurrentUser, logoutUser } from './accounts.js';
import { clearAssessment } from './account-session.js';
export { ASSESSMENT_KEYS, clearAssessment } from './account-session.js';

export function readProfile(storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  const user = getCurrentUser(storage, session);
  return { name: user?.username || '', avatar: safeAvatar(user?.avatar) };
}
export function safeAvatar(value) {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value) ? value : '';
}
export function saveProfile(storage, profile, session = globalThis.sessionStorage) {
  return updateCurrentUser({ username: String(profile.name || '').trim().slice(0, 100), avatar: safeAvatar(profile.avatar) }, storage, session);
}
export function startRecording(session, name) {
  clearAssessment(session);
  if (name.trim()) session.setItem('myhealth_recording_name', name.trim());
}
export function exitRegistered(session) { logoutUser(session); }
