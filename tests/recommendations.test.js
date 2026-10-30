import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssessment, readAssessment, domainRecommendation, domainHighlights } from '../src/scoring.js';

function profile(values = {}) {
  const storage = { getItem: (key) => values[key.replace('myhealth_', '')] === undefined ? null : String(values[key.replace('myhealth_', '')]), setItem() { throw new Error('Must not write'); } };
  const result = calculateAssessment(storage);
  const answers = readAssessment(storage);
  return { result, text: (id) => domainRecommendation(result.domains.find((domain) => domain.id === id), answers) };
}

test('empty profiles show seven N/A recommendations and no summary domain', () => {
  const { result, text } = profile();
  assert.equal(result.domains.length, 7);
  assert.deepEqual(domainHighlights(result.domains), { highest: null, lowest: null });
  result.domains.forEach((domain) => assert.match(text(domain.id), /Not enough information/));
});
test('highlights use actual available scores and ignore missing categories', () => {
  const { result } = profile({ active_days: 6, sleep_quality: 1, stress_level: 3 });
  const highlights = domainHighlights(result.domains);
  assert.equal(highlights.highest.id, 'activity');
  assert.equal(highlights.lowest.id, 'sleep');
  assert.deepEqual(result.focusTargets.map((domain) => domain.id), ['sleep']);
});
test('recommendations prioritize lowest scored component over fixed domain order', () => {
  assert.match(profile({ steps_week: 49000, active_days: 1 }).text('activity'), /Active-day frequency/);
  assert.match(profile({ steps_week: 0, active_days: 6 }).text('activity'), /movement volume/);
  assert.match(profile({ fruit_vegetables: '2-3', sugary_drinks: 'daily', processed_meals: 'occasionally' }).text('diet'), /Sugary-drink frequency/);
  assert.match(profile({ fruit_vegetables: '4-5', processed_meals: 'daily' }).text('diet'), /Ultra-processed meal frequency/);
  assert.match(profile({ fruit_vegetables: 'under-2' }).text('diet'), /fruit and vegetable/);
});
test('body guidance handles elevated BMI, waist ratio and low BMI without diagnoses', () => {
  assert.match(profile({ bmi: 28, wthr: 0.45 }).text('body'), /does not distinguish muscle/);
  assert.match(profile({ bmi: 22, wthr: 0.6 }).text('body'), /waist-to-height ratio is above/);
  assert.match(profile({ bmi: 17 }).text('body'), /below the standard reference/);
  assert.match(profile({ bmi: 22, wthr: 0.45 }).text('body'), /within favorable/);
});
test('sleep guidance does not invent missing duration or quality', () => {
  assert.match(profile({ sleep_hours: 5 }).text('sleep'), /below the usual adult target/);
  assert.match(profile({ sleep_hours: 13 }).text('sleep'), /above the usual adult target/);
  assert.match(profile({ sleep_hours: 8, sleep_quality: 1 }).text('sleep'), /duration is adequate/);
  assert.doesNotMatch(profile({ sleep_quality: 1 }).text('sleep'), /duration is adequate/);
  assert.match(profile({ phone_before_sleep: 2 }).text('sleep'), /Reducing screen use/);
  assert.match(profile({ nap_hours: 4 }).text('sleep'), /Long daytime sleep/);
  assert.doesNotMatch(profile({ nap_hours: 0 }).text('sleep'), /duration and quality/);
});
test('mental guidance prioritizes burden and respects professional support', () => {
  assert.match(profile({ stress_level: 5, support_history: 'current_support' }).text('mental'), /high current mental-wellbeing burden/);
  assert.match(profile({ stress_level: 5, support_history: 'current_support' }).text('mental'), /already receiving professional support/);
  assert.match(profile({ stress_level: 4, mood: 'positive_energized' }).text('mental'), /Stress is the main factor/);
  assert.match(profile({ stress_level: 1, anxiety_frequency: 'most_days' }).text('mental'), /Anxiety frequency/);
  assert.match(profile({ mood: 'drained_down', stress_level: 1 }).text('mental'), /emotional tone/);
  assert.match(profile({ support_history: 'current_support' }).text('mental'), /Not enough information/);
});
test('lifestyle guidance uses actual tobacco and frequency choices', () => {
  assert.match(profile({ smoking_status: 'current', cigarettes_day: '11_20' }).text('lifestyle'), /Current tobacco use/);
  assert.match(profile({ smoking_status: 'passive' }).text('lifestyle'), /secondhand smoke/);
  assert.match(profile({ smoking_status: 'former', years_since_quit: 1 }).text('lifestyle'), /time since quitting/);
  assert.match(profile({ caffeine_day: '4_plus' }).text('lifestyle'), /Caffeine intake/);
  assert.match(profile({ other_substances: 'yes', substance_frequency: 'daily' }).text('lifestyle'), /substance-use frequency/);
  assert.match(profile({ other_substances: 'prefer_not_to_say' }).text('lifestyle'), /Not enough information/);
  assert.match(profile({ alcohol_week: '8_plus', caffeine_day: '4_plus' }).text('lifestyle'), /Alcohol intake/);
});
test('vitals retain prominent high-priority alert and contextual low/outside references', () => {
  const high = profile({ systolic_bp: 181, diastolic_bp: 70, resting_hr: 68 });
  assert.equal(high.result.alerts[0].priority, 'high');
  assert.match(high.text('vitals'), /highlighted alert above/);
  assert.match(profile({ systolic_bp: 130, diastolic_bp: 80 }).text('vitals'), /single reading is not diagnostic/);
  assert.match(profile({ systolic_bp: 89, diastolic_bp: 59 }).text('vitals'), /low range/);
  assert.match(profile({ resting_hr: 110 }).text('vitals'), /outside the typical adult reference/);
  assert.match(profile({ systolic_bp: 118, diastolic_bp: 76, resting_hr: 68 }).text('vitals'), /within favorable reference/);
});
test('reading recommendations leaves scores and source data unchanged', () => {
  const data = { sleep_quality: 1, sugary_drinks: 'daily', other_substances: 'prefer_not_to_say' };
  const before = JSON.stringify(data);
  const { result, text } = profile(data);
  const scores = JSON.stringify(result);
  result.domains.forEach((domain) => {
    assert.equal(typeof text(domain.id), 'string');
    assert.doesNotMatch(text(domain.id), /NaN|undefined|Infinity/);
  });
  assert.equal(JSON.stringify(result), scores);
  assert.equal(JSON.stringify(data), before);
});
