import { clearAssessment } from './account-session.js';
export { ASSESSMENT_KEYS, clearAssessment } from './account-session.js';

export function startRecording(session, name) {
  clearAssessment(session);
  if (name.trim()) session.setItem('myhealth_recording_name', name.trim());
}
