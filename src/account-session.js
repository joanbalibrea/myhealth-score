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
