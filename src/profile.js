// This prototype stores only display settings, never passwords or assessment data.
export function readProfile(storage) {
  try {
    const value = JSON.parse(storage.getItem('myhealth_profile'));
    return { name: typeof value?.name === 'string' ? value.name : '', avatar: safeAvatar(value?.avatar) };
  } catch { return { name: '', avatar: '' }; }
}
export function safeAvatar(value) {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value) ? value : '';
}
export function saveProfile(storage, profile) {
  storage.setItem('myhealth_profile', JSON.stringify({ name: String(profile.name || '').trim().slice(0, 100), avatar: safeAvatar(profile.avatar) }));
}

export const ASSESSMENT_KEYS = [
  'age', 'sex', 'height', 'weight', 'waist', 'height_unit', 'weight_unit', 'waist_unit', 'bmi', 'wthr',
  'steps_week', 'active_days', 'activity_intensity', 'main_sport', 'other_sport',
  'calorie_range', 'calories_exact', 'fruit_vegetables', 'sugary_drinks', 'processed_meals',
  'sleep_hours', 'sleep_quality', 'phone_before_sleep', 'nap_hours',
  'stress_level', 'mood', 'anxiety_frequency', 'support_history',
  'smoking_status', 'secondhand_smoke', 'years_since_quit', 'smoking_years', 'cigarettes_day',
  'alcohol_week', 'caffeine_day', 'other_substances', 'substance_name', 'substance_frequency',
  'resting_hr', 'systolic_bp', 'diastolic_bp', 'recording_name', 'current_result_identity', 'selected_record_id',
];
export function clearAssessment(session) {
  ASSESSMENT_KEYS.forEach((key) => session.removeItem(`myhealth_${key}`));
}
export function startRecording(session, name) {
  clearAssessment(session);
  if (name.trim()) session.setItem('myhealth_recording_name', name.trim());
  session.setItem('myhealth_registered_session', 'true');
}
export function exitRegistered(session) {
  session.removeItem('myhealth_registered_session');
  clearAssessment(session);
}
