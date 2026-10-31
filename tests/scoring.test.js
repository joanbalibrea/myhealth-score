import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssessment, readAssessment, numberAnswer, scoreBloodPressure, interpretScore } from '../src/scoring.js';
import { createRecording, previousRecording } from '../src/result-history.js';

function storage(values = {}) {
  const data = new Map(Object.entries(values).map(([key, value]) => [key.startsWith('myhealth_') ? key : `myhealth_${key}`, String(value)]));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}
const assess = (values) => calculateAssessment(storage(values));
const domain = (values, id) => assess(values).domains.find((entry) => entry.id === id);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('empty, blocked and malformed storage produce N/A, never zero or NaN', () => {
  for (const source of [storage(), storage({ sleep_hours: 'NaN', resting_hr: 'Infinity', alcohol_week: 'unknown', nap_hours: '', active_days: -1 }), { getItem() { throw new Error('blocked'); } }]) {
    const result = calculateAssessment(source);
    assert.equal(result.overallScore, null);
    assert.equal(result.completeness.percent, 0);
    assert.equal(result.completeness.total, 27);
    assert.ok(result.domains.every((entry) => entry.score === null && entry.coverage === 0));
    assert.ok(!JSON.stringify(result).includes('NaN'));
  }
  assert.equal(numberAnswer(''), null);
  assert.equal(numberAnswer(null), null);
  assert.equal(numberAnswer('0'), 0);
});

test('real zeros score and count as answers; missing items reduce coverage', () => {
  const result = assess({ nap_hours: 0 });
  const sleep = result.domains.find((entry) => entry.id === 'sleep');
  assert.equal(result.overallScore, 10);
  assert.equal(result.completeness.answered, 1);
  close(sleep.coverage, 0.15);
  close(domain({ active_days: 0 }, 'activity').score, 0);
  assert.equal(domain({ sleep_hours: 0 }, 'sleep').score, 1);
});

test('overall score uses base weight times coverage without premature rounding', () => {
  const result = assess({ nap_hours: 0, active_days: 0 });
  assert.equal(result.overallScore, 3.3); // 10*(15*.15) / ((15*.15)+(15*.30))
});

test('body components and thresholds use metric measurements and ignore age/sex scores', () => {
  const source = storage({ height: 200, weight: 80, waist: 90, bmi: 99, wthr: 99 });
  const answers = readAssessment(source);
  assert.equal(answers.bmi, 20);
  assert.equal(answers.wthr, 0.45);
  assert.equal(calculateAssessment(source).overallScore, 10);
  for (const [bmi, score] of [[18.4, 6], [18.5, 10], [24.99, 10], [25, 7], [30, 4], [35, 2], [40, 1]]) assert.equal(domain({ bmi }, 'body').score, score);
  for (const [wthr, score] of [[0.39, 8], [0.4, 10], [0.5, 5], [0.6, 2]]) assert.equal(domain({ wthr }, 'body').score, score);
  assert.equal(assess({ age: 34, sex: 'female' }).overallScore, null);
});

test('activity uses daily steps converted from weekly values and actual intensity values', () => {
  for (const [daily, score] of [[0, 2], [2999, 2], [3000, 5], [5000, 8], [7000, 10], [10000, 10]]) assert.equal(domain({ steps_week: daily * 7 }, 'activity').score, score);
  close(domain({ steps_week: 49000, active_days: 4, activity_intensity: 'light' }, 'activity').score, 9.1);
  assert.equal(assess({ main_sport: 'Walking' }).overallScore, null);
});

test('diet maps real keys and calories count once without changing score', () => {
  close(domain({ fruit_vegetables: '2-3', sugary_drinks: 'occasionally', processed_meals: '3-4-weekly' }, 'diet').score, 6);
  const result = assess({ calorie_range: '1800-2200', calories_exact: 2100 });
  assert.equal(result.overallScore, null);
  assert.equal(result.completeness.answered, 1);
});

test('sleep duration boundaries, phone and naps follow supplied bands', () => {
  for (const [hours, score] of [[3.9, 1], [4, 3], [5, 5], [6, 8], [7, 10], [9, 10], [9.1, 8], [10, 8], [10.1, 5], [11.1, 3], [12.1, 1]]) assert.equal(domain({ sleep_hours: hours }, 'sleep').score, score);
  for (const [hours, score] of [[0, 10], [0.5, 9], [0.6, 7], [1, 7], [1.1, 4], [1.6, 2]]) assert.equal(domain({ phone_before_sleep: hours }, 'sleep').score, score);
  for (const [hours, score] of [[0.5, 10], [0.6, 8], [1.1, 6], [2.1, 3], [3.1, 1]]) assert.equal(domain({ nap_hours: hours }, 'sleep').score, score);
  assert.equal(domain({ sleep_quality: 5 }, 'sleep').score, 10);
});

test('actual mental UI mappings and support history do not penalize help seeking', () => {
  assert.equal(domain({ mood: 'positive_energized' }, 'mental').score, 10);
  assert.equal(domain({ mood: 'balanced_steady' }, 'mental').score, 8);
  assert.equal(domain({ mood: 'fluctuating_low' }, 'mental').score, 6);
  assert.equal(domain({ mood: 'drained_down' }, 'mental').score, 1);
  assert.equal(domain({ anxiety_frequency: 'rarely_never' }, 'mental').score, 9);
  assert.equal(domain({ anxiety_frequency: 'few_days' }, 'mental').score, 6);
  assert.equal(domain({ anxiety_frequency: 'most_days' }, 'mental').score, 3);
  assert.equal(assess({ support_history: 'current_support' }).overallScore, null);
  const a = assess({ stress_level: 3 });
  const b = assess({ stress_level: 3, support_history: 'current_support' });
  assert.equal(a.overallScore, b.overallScore);
});

test('prefer not to say counts toward completeness but never health scores', () => {
  const result = assess({ anxiety_frequency: 'prefer_not_to_say', support_history: 'prefer_not_to_say', other_substances: 'prefer_not_to_say' });
  assert.equal(result.overallScore, null);
  assert.equal(result.completeness.answered, 3);
  assert.equal(result.completeness.total, 27);
});

test('tobacco formulas, optional duration, and stale conditional answers', () => {
  assert.equal(domain({ smoking_status: 'never' }, 'lifestyle').score, 10);
  assert.equal(domain({ smoking_status: 'passive' }, 'lifestyle').score, 7);
  close(domain({ smoking_status: 'former', years_since_quit: 5 }, 'lifestyle').score, 8.5);
  assert.equal(domain({ smoking_status: 'former' }, 'lifestyle').score, null);
  assert.equal(domain({ smoking_status: 'current' }, 'lifestyle').score, null);
  close(domain({ smoking_status: 'current', cigarettes_day: '11_20', smoking_years: 30 }, 'lifestyle').score, 0.5);
  assert.equal(domain({ smoking_status: 'current', cigarettes_day: 'more_than_30', smoking_years: 30 }, 'lifestyle').score, 0);
  assert.equal(domain({ smoking_status: 'never', cigarettes_day: 'more_than_30' }, 'lifestyle').score, 10);
});

test('lifestyle ranges, caffeine and substance-name neutrality', () => {
  close(domain({ other_substances: 'yes', substance_frequency: '2_3_weekly' }, 'lifestyle').score, 5.5);
  assert.equal(domain({ other_substances: 'yes', substance_frequency: '4_6_weekly' }, 'lifestyle').score, 3);
  assert.equal(domain({ other_substances: 'no', substance_frequency: 'daily' }, 'lifestyle').score, 10);
  assert.equal(domain({ other_substances: 'yes', substance_name: 'Example' }, 'lifestyle').score, null);
  assert.equal(domain({ caffeine_day: '4_plus' }, 'lifestyle').score, 5);
  assert.equal(domain({ alcohol_week: '0' }, 'lifestyle').score, 10);
});

test('BP pair is required, severe readings override other bands, low context is retained', () => {
  for (const [sys, dia, score] of [[118, 76, 10], [120, 79, 8], [129, 79, 8], [130, 79, 5], [118, 80, 5], [140, 80, 2], [118, 90, 2], [180, 120, 2], [181, 70, 0], [110, 121, 0], [89, 59, 6]]) assert.equal(scoreBloodPressure(sys, dia).score, score);
  assert.equal(scoreBloodPressure(null, 80).score, null);
  assert.equal(scoreBloodPressure(181, 70).alerts[0].priority, 'high');
  assert.equal(scoreBloodPressure(89, 59).alerts[0].priority, 'context');
  assert.equal(assess({ systolic_bp: 118 }).overallScore, null);
  assert.equal(assess({ systolic_bp: 118 }).completeness.answered, 0);
  close(domain({ resting_hr: 68 }, 'vitals').coverage, 0.25);
});

test('heart rate boundaries', () => {
  for (const [hr, score] of [[39, 4], [40, 7], [50, 9], [60, 10], [80, 10], [80.5, 8], [90, 8], [91, 6], [100, 6], [101, 3]]) assert.equal(domain({ resting_hr: hr }, 'vitals').score, score);
});

const complete = {
  age: 34, sex: 'female', height: 170, weight: 65, waist: 78,
  steps_week: 49000, active_days: 6, activity_intensity: 'moderate', main_sport: 'Walking',
  calorie_range: '1800-2200', fruit_vegetables: '4-5', sugary_drinks: 'never-rarely', processed_meals: 'never-rarely',
  sleep_hours: 8, sleep_quality: 5, phone_before_sleep: 0, nap_hours: 0,
  stress_level: 1, mood: 'positive_energized', anxiety_frequency: 'rarely_never', support_history: 'none',
  smoking_status: 'never', alcohol_week: '0', caffeine_day: '0', other_substances: 'no', resting_hr: 68, systolic_bp: 118, diastolic_bp: 76,
};

test('full assessment, skipped vitals and conditional denominators', () => {
  const result = assess(complete);
  assert.equal(result.completeness.percent, 100);
  assert.equal(result.completeness.total, 27);
  assert.equal(result.completeness.answered, 27);
  assert.equal(result.insight.strong, true);
  assert.equal(result.focusTargets.length, 0);
  const noVitals = { ...complete };
  delete noVitals.resting_hr; delete noVitals.systolic_bp; delete noVitals.diastolic_bp;
  const skipped = assess(noVitals);
  assert.equal(skipped.completeness.percent, 93);
  assert.equal(skipped.domains.at(-1).score, null);
  assert.notEqual(skipped.overallScore, null);
  assert.equal(assess({ ...complete, smoking_status: 'former' }).completeness.total, 28);
  assert.equal(assess({ ...complete, smoking_status: 'current', other_substances: 'yes' }).completeness.total, 31);
  assert.equal(assess({ ...complete, smoking_status: 'current', smoking_years: 5, cigarettes_day: '1_5', other_substances: 'yes', substance_name: 'Example', substance_frequency: '1_weekly' }).completeness.percent, 100);
});

test('interpretation and focus targets use raw domain thresholds and rounded overall', () => {
  for (const [score, label] of [[0, 'Priority area'], [3.9, 'Priority area'], [4, 'Needs attention'], [6, 'Good'], [8, 'Strong'], [10, 'Strong']]) assert.equal(interpretScore(score).label, label);
  const result = assess({ sleep_hours: 2, active_days: 1, mood: 'fluctuating_low' });
  assert.deepEqual(result.focusTargets.map((entry) => entry.id), ['sleep', 'activity']);
  assert.equal(result.insight.domains[0].id, 'sleep');
});

test('record snapshot and previous-record selection use data without browser persistence', () => {
  const result = assess(complete);
  const record = createRecording(result, 'Morning', new Date('2026-10-30T10:00:00Z'), 'id-1');
  const records = [record, { ...record, id: 'id-2', date: '2026-11-01T10:00:00Z', overallScore: 8 }];
  assert.equal(previousRecording(records).id, 'id-2');
  assert.equal(previousRecording([null, { overallScore: null, date: record.date }]), null);
  assert.equal(record.completeness, 100);
  assert.equal(record.domainScores.sleep, 10);
});

