import { clearAssessment } from './account-session.js';
export { ASSESSMENT_KEYS, clearAssessment } from './account-session.js';

// Avatars remain local display preferences, scoped to a verified Supabase user.
export function readProfile(storage, user) {
  if (!user?.id) return { name: '', avatar: '' };
  let avatar = '';
  try { avatar = safeAvatar(JSON.parse(storage.getItem(`myhealth_profile_${user.id}`))?.avatar); } catch { /* Default avatar. */ }
  return { name: user.user_metadata?.username?.trim() || user.email || '', avatar };
}
export function safeAvatar(value) {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value) ? value : '';
}
export function saveProfile(storage, profile, user) {
  if (!user?.id) throw new Error('Please sign in before changing your profile.');
  storage.setItem(`myhealth_profile_${user.id}`, JSON.stringify({ avatar: safeAvatar(profile.avatar) }));
}
export function startRecording(session, name) {
  clearAssessment(session);
  if (name.trim()) session.setItem('myhealth_recording_name', name.trim());
}
