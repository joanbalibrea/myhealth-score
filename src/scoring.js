// Educational product heuristics supplied for MyHealth Score, not a clinical model.
export const DOMAIN_INFO = [
  { id: 'body', name: 'Body Composition', color: '#2563c4', baseWeight: 15 },
  { id: 'activity', name: 'Physical Activity', color: '#ad5425', baseWeight: 15 },
  { id: 'diet', name: 'Diet', color: '#357451', baseWeight: 15 },
  { id: 'sleep', name: 'Sleep', color: '#77509f', baseWeight: 15 },
  { id: 'mental', name: 'Mental Health', color: '#a55f77', baseWeight: 15 },
  { id: 'lifestyle', name: 'Lifestyle Habits', color: '#896b27', baseWeight: 15 },
  { id: 'vitals', name: 'Vitals', color: '#327c85', baseWeight: 10 },
];

const choices = {
  sex: ['female', 'male'],
  activity_intensity: ['light', 'moderate', 'vigorous'],
  fruit_vegetables: ['under-2', '2-3', '4-5', '6+'],
  sugary_drinks: ['never-rarely', 'occasionally', 'several-times', 'daily'],
  processed_meals: ['never-rarely', 'occasionally', '3-4-weekly', 'daily'],
  calorie_range: ['1400-1800', '1800-2200', '2200-2600', '2600+'],
  mood: ['positive_energized', 'balanced_steady', 'fluctuating_low', 'drained_down'],
  anxiety_frequency: ['rarely_never', 'few_days', 'most_days', 'prefer_not_to_say'],
  support_history: ['current_support', 'past_within_2_years', 'past_2_5_years', 'past_5_10_years', 'past_over_10_years', 'none', 'prefer_not_to_say'],
  smoking_status: ['never', 'passive', 'former', 'current'],
  cigarettes_day: ['less_than_1', '1_5', '6_10', '11_20', '21_30', 'more_than_30'],
  alcohol_week: ['0', '1_3', '4_7', '8_plus'],
  caffeine_day: ['0', 'less_than_1', '1', '2', '3', '4_plus'],
  other_substances: ['no', 'yes', 'prefer_not_to_say'],
  substance_frequency: ['less_than_weekly', '1_weekly', '2_3_weekly', '4_6_weekly', 'daily'],
};

export function numberAnswer(value, minimum = 0, maximum = Infinity, integer = false) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum && (!integer || Number.isInteger(number)) ? number : null;
}

// Read the real assessment keys. This function never writes to storage.
export function readAssessment(storage) {
  const answer = {};
  function read(name) {
    try { return storage.getItem(`myhealth_${name}`); }
    catch { return null; }
  }
  Object.entries(choices).forEach(([key, allowed]) => {
    const value = read(key);
    answer[key] = allowed.includes(value) ? value : null;
  });
  const numericFields = {
    age: [18, 100, true], height: [50, 300], weight: [10, 700], waist: [30, 300],
    bmi: [0.01], wthr: [0.01], steps_week: [0, 140000], active_days: [0, 7, true],
    calories_exact: [0, Infinity, true], sleep_hours: [0, 15], sleep_quality: [1, 5, true],
    phone_before_sleep: [0, 2], nap_hours: [0, 5], stress_level: [1, 5, true],
    resting_hr: [0], systolic_bp: [0], diastolic_bp: [0],
  };
  Object.entries(numericFields).forEach(([key, limits]) => {
    answer[key] = numberAnswer(read(key), ...limits);
  });
  ['main_sport', 'other_sport', 'substance_name'].forEach((key) => {
    answer[key] = read(key)?.trim() || null;
  });
  const maximumYears = answer.age ?? 100;
  answer.years_since_quit = numberAnswer(read('years_since_quit'), 0.1, maximumYears);
  answer.smoking_years = numberAnswer(read('smoking_years'), 0.1, maximumYears);
  // Prefer measurements over a possibly stale derived value.
  if (answer.height !== null && answer.weight !== null) answer.bmi = answer.weight / (answer.height / 100) ** 2;
  if (answer.height !== null && answer.waist !== null) answer.wthr = answer.waist / answer.height;
  return answer;
}

function mapped(value, mapping) {
  return Object.hasOwn(mapping, value) ? mapping[value] : null;
}
function scored(value, evaluate) { return value === null ? null : evaluate(value); }
const clamp = (value) => Math.min(10, Math.max(0, value));
const round = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

// Missing components remove their weight from the score, but reduce coverage.
export function weightedDomain(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const available = items.filter((item) => item.score !== null && Number.isFinite(item.score));
  const answeredWeight = available.reduce((sum, item) => sum + item.weight, 0);
  return {
    // Remove floating-point noise (e.g. 5.999999999999999) before band checks.
    // Keep twelve decimals here; presentation rounding happens only at the end.
    score: answeredWeight ? Number(clamp(available.reduce((sum, item) => sum + item.score * item.weight, 0) / answeredWeight).toFixed(12)) : null,
    coverage: totalWeight ? Number((answeredWeight / totalWeight).toFixed(12)) : 0,
    items,
  };
}

export function scoreBloodPressure(systolic, diastolic) {
  if (systolic === null || diastolic === null) return { score: null, alerts: [] };
  if (systolic > 180 || diastolic > 120) return { score: 0, alerts: [{ priority: 'high', message: 'High-priority blood-pressure reading. Review this measurement with a healthcare professional; this wellness index does not provide a diagnosis.' }] };
  if (systolic >= 140 || diastolic >= 90) return { score: 2, alerts: [] };
  // The low-reading rule here means both measurements are below 90/60.
  if (systolic < 90 && diastolic < 60) return { score: 6, alerts: [{ priority: 'context', message: 'This is a low blood-pressure reading. Symptoms and measurement context matter; no diagnosis is inferred.' }] };
  if (systolic >= 130 || diastolic >= 80) return { score: 5, alerts: [] };
  if (systolic >= 120) return { score: 8, alerts: [] };
  return { score: 10, alerts: [] };
}

function tobaccoScore(a) {
  if (a.smoking_status === 'never') return 10;
  if (a.smoking_status === 'passive') return 7;
  // Duration is needed for the former-smoker formula, not assumed to be zero.
  if (a.smoking_status === 'former') return scored(a.years_since_quit, (years) => Math.min(10, 7 + 0.3 * years));
  if (a.smoking_status !== 'current') return null;
  const base = mapped(a.cigarettes_day, { less_than_1: 6, '1_5': 5, '6_10': 4, '11_20': 2.5, '21_30': 1.5, more_than_30: 0.5 });
  return base === null ? null : Math.max(0, base - (a.smoking_years === null ? 0 : Math.min(2, a.smoking_years * 0.1)));
}
function substanceScore(a) {
  if (a.other_substances === 'no') return 10;
  if (a.other_substances !== 'yes') return null;
  // Ranges use midpoint scores: 2–3/week = 5.5; 4–6/week = 3.
  return mapped(a.substance_frequency, { less_than_weekly: 8, '1_weekly': 7, '2_3_weekly': 5.5, '4_6_weekly': 3, daily: 1 });
}

export function calculateDomains(a) {
  const bp = scoreBloodPressure(a.systolic_bp, a.diastolic_bp);
  const item = (name, weight, score) => ({ name, weight, score });
  const components = {
    body: [
      item('BMI', 0.4, scored(a.bmi, (n) => n < 18.5 ? 6 : n < 25 ? 10 : n < 30 ? 7 : n < 35 ? 4 : n < 40 ? 2 : 1)),
      item('Waist-to-height ratio', 0.6, scored(a.wthr, (n) => n < 0.4 ? 8 : n < 0.5 ? 10 : n < 0.6 ? 5 : 2)),
    ],
    activity: [
      item('Steps', 0.6, scored(a.steps_week, (n) => n / 7 < 3000 ? 2 : n / 7 < 5000 ? 5 : n / 7 < 7000 ? 8 : 10)),
      item('Active days', 0.3, scored(a.active_days, (n) => [0, 3, 5, 7, 8, 9, 10, 10][n])),
      item('Intensity', 0.1, mapped(a.activity_intensity, { light: 7, moderate: 10, vigorous: 10 })),
    ],
    diet: [
      item('Fruit & vegetables', 0.4, mapped(a.fruit_vegetables, { 'under-2': 2, '2-3': 6, '4-5': 10, '6+': 10 })),
      item('Sugary drinks', 0.3, mapped(a.sugary_drinks, { 'never-rarely': 10, occasionally: 8, 'several-times': 4, daily: 1 })),
      item('Ultra-processed meals', 0.3, mapped(a.processed_meals, { 'never-rarely': 10, occasionally: 7, '3-4-weekly': 4, daily: 1 })),
    ],
    sleep: [
      item('Duration', 0.45, scored(a.sleep_hours, (n) => n >= 7 && n <= 9 ? 10 : n >= 6 && n <= 10 ? 8 : n >= 5 && n <= 11 ? 5 : n >= 4 && n <= 12 ? 3 : 1)),
      item('Quality', 0.3, scored(a.sleep_quality, (n) => n * 2)),
      item('Phone use', 0.1, scored(a.phone_before_sleep, (n) => n === 0 ? 10 : n <= 0.5 ? 9 : n <= 1 ? 7 : n <= 1.5 ? 4 : 2)),
      item('Naps', 0.15, scored(a.nap_hours, (n) => n <= 0.5 ? 10 : n <= 1 ? 8 : n <= 2 ? 6 : n <= 3 ? 3 : 1)),
    ],
    mental: [
      item('Stress', 0.4, mapped(a.stress_level, { 1: 10, 2: 8, 3: 6, 4: 3, 5: 1 })),
      // Four actual mood choices: lowest=1, fluctuating=6, balanced=8, positive=10.
      item('Mood', 0.35, mapped(a.mood, { drained_down: 1, fluctuating_low: 6, balanced_steady: 8, positive_energized: 10 })),
      // The UI combines Rarely/Never: use 9, halfway between 8 and 10.
      // A few days maps to Sometimes (6); Most days maps to Often (3).
      item('Anxiety', 0.25, mapped(a.anxiety_frequency, { rarely_never: 9, few_days: 6, most_days: 3 })),
    ],
    lifestyle: [
      item('Tobacco', 0.45, tobaccoScore(a)),
      item('Alcohol', 0.25, mapped(a.alcohol_week, { 0: 10, '1_3': 8, '4_7': 6, '8_plus': 3 })),
      item('Caffeine', 0.1, mapped(a.caffeine_day, { 0: 10, less_than_1: 10, 1: 10, 2: 10, 3: 8, '4_plus': 5 })),
      item('Other substances', 0.2, substanceScore(a)),
    ],
    vitals: [
      item('Blood pressure', 0.75, bp.score),
      item('Resting heart rate', 0.25, scored(a.resting_hr, (n) => n < 40 ? 4 : n < 50 ? 7 : n < 60 ? 9 : n <= 80 ? 10 : n <= 90 ? 8 : n <= 100 ? 6 : 3)),
    ],
  };
  const domains = DOMAIN_INFO.map((info) => ({ ...info, ...weightedDomain(components[info.id]) }));
  return { domains, alerts: bp.alerts };
}

export function calculateCompleteness(a) {
  const answered = (value) => value !== null && value !== undefined && value !== '';
  const questions = [
    a.age, a.sex, a.height, a.weight, a.waist,
    a.steps_week, a.active_days, a.activity_intensity, a.main_sport,
    a.calorie_range ?? a.calories_exact, a.fruit_vegetables, a.sugary_drinks, a.processed_meals,
    a.sleep_hours, a.sleep_quality, a.phone_before_sleep, a.nap_hours,
    a.stress_level, a.mood, a.anxiety_frequency, a.support_history,
    a.smoking_status, a.alcohol_week, a.caffeine_day, a.other_substances,
    a.resting_hr, a.systolic_bp !== null && a.diastolic_bp !== null ? true : null,
  ];
  if (a.smoking_status === 'former') questions.push(a.years_since_quit);
  if (a.smoking_status === 'current') questions.push(a.smoking_years, a.cigarettes_day);
  if (a.other_substances === 'yes') questions.push(a.substance_name, a.substance_frequency);
  const count = questions.filter(answered).length;
  const percent = Math.round(count / questions.length * 100);
  const label = percent < 40 ? 'Limited data' : percent < 70 ? 'Moderate' : percent < 85 ? 'Good' : 'High';
  return { answered: count, total: questions.length, percent, label };
}

export function interpretScore(score) {
  if (score === null) return { label: 'Insufficient data', tone: 'neutral', description: 'Answer at least one scorable question to calculate your wellness index.' };
  if (score >= 8) return { label: 'Strong', tone: 'strong', description: 'Most reported indicators are within favorable wellness ranges.' };
  if (score >= 6) return { label: 'Good', tone: 'good', description: 'Your overall profile is favorable, with some areas that could still improve.' };
  if (score >= 4) return { label: 'Needs attention', tone: 'attention', description: 'Several reported indicators fall outside favorable ranges and offer clear opportunities for improvement.' };
  return { label: 'Priority area', tone: 'priority', description: 'Multiple reported indicators warrant closer attention. Review your recommendations and consider professional advice where appropriate.' };
}

export function calculateAssessment(storage) {
  const answers = readAssessment(storage);
  const { domains, alerts } = calculateDomains(answers);
  const available = domains.filter((domain) => domain.score !== null);
  const weight = available.reduce((sum, domain) => sum + domain.baseWeight * domain.coverage, 0);
  const overallScore = weight ? round(clamp(available.reduce((sum, domain) => sum + domain.score * domain.baseWeight * domain.coverage, 0) / weight)) : null;
  const weakest = [...available].sort((a, b) => a.score - b.score);
  const focusTargets = weakest.filter((domain) => domain.score < 6);
  return {
    overallScore, domains, alerts, focusTargets, answers,
    completeness: calculateCompleteness(answers),
    interpretation: interpretScore(overallScore),
    insight: { strong: available.length > 0 && available.every((domain) => domain.score >= 8), domains: weakest.filter((domain) => domain.score < 8).slice(0, 2) },
  };
}

// Recommendations use existing scored components; they never alter a score.
export function domainHighlights(domains) {
  const available = domains.filter((domain) => domain.score !== null && Number.isFinite(domain.score));
  const sorted = [...available].sort((a, b) => a.score - b.score);
  return { highest: sorted.at(-1) ?? null, lowest: sorted[0] ?? null };
}

export function domainRecommendation(domain, a) {
  if (domain.score === null) return 'Not enough information was provided to calculate this category.';
  const available = domain.items.filter((item) => item.score !== null);
  const weakest = [...available].sort((left, right) => left.score - right.score)[0];
  const name = weakest.name;
  const allFavorable = available.every((item) => item.score >= 8);

  if (domain.id === 'body') {
    if (name === 'Waist-to-height ratio' && a.wthr >= 0.5) return 'Your waist-to-height ratio is above the reference range. Gradually reducing waist circumference relative to height may improve your body-composition profile.';
    if (a.bmi >= 25 && a.wthr !== null && a.wthr >= 0.4 && a.wthr < 0.5) return 'Your BMI is above the standard reference range, while your waist-to-height ratio remains favorable. BMI is a screening measure and does not distinguish muscle from body fat.';
    if (allFavorable) return 'Your reported body-composition indicators are within favorable reference ranges.';
    if (name === 'BMI' && a.bmi < 18.5) return 'Your reported BMI is below the standard reference range. BMI is a screening measure; nutrition, body composition, and your personal context may be worth reviewing with a qualified professional.';
    if (name === 'BMI') return 'Your reported BMI is above the standard reference range. BMI does not distinguish muscle from body fat; review it alongside waist measurements and personal context.';
    return 'Your reported waist-to-height ratio is below the reference band used by this wellness index. Interpret this screening measure alongside your other measurements and personal context.';
  }
  if (domain.id === 'activity') {
    if (allFavorable) return 'Your current movement pattern shows a strong activity profile across the indicators provided. Maintaining regular movement across the week will help preserve this score.';
    if (name === 'Steps') return 'Your movement volume is the main opportunity in this category. Gradually increasing walking and everyday activity could improve your score.';
    if (name === 'Active days') return 'Active-day frequency is the main opportunity in this category. Try spreading physical activity across more days of the week rather than concentrating it into only one or two days.';
    return 'Light intensity is the lowest-scoring activity indicator you reported. If comfortable and appropriate for you, gradually adding some moderate-intensity movement could improve this category.';
  }
  if (domain.id === 'diet') {
    if (allFavorable) return 'Your reported dietary pattern is generally favorable across the scored indicators.';
    if (name === 'Sugary drinks') return 'Sugary-drink frequency is the main factor reducing this score. Replacing some sugary drinks with water or unsweetened alternatives could improve your diet profile.';
    if (name === 'Ultra-processed meals') return 'Ultra-processed meal frequency is the main opportunity for improvement. Choosing more minimally processed meals when practical could improve this category.';
    return 'Increasing fruit and vegetable intake is the clearest opportunity in this category.';
  }
  if (domain.id === 'sleep') {
    if (allFavorable) return 'Your reported sleep indicators are generally favorable across the answers provided.';
    if (name === 'Duration') return a.sleep_hours < 7 ? 'Your reported sleep duration is below the usual adult target. Increasing sleep opportunity toward 7–9 hours may improve recovery.' : 'Your reported sleep duration is above the usual adult target of 7–9 hours. Sleep regularity and your personal recovery needs may be worth reviewing.';
    if (name === 'Phone use') return 'Phone use before sleep is the main opportunity in this category. Reducing screen use close to bedtime may help create a more consistent wind-down routine.';
    if (name === 'Naps') return 'Long daytime sleep is the lowest-scoring sleep indicator you reported. Long daytime sleep may make it harder to fall asleep or maintain a regular sleep schedule at night.';
    if (a.sleep_hours !== null && a.sleep_hours >= 7 && a.sleep_hours <= 9) return 'Your sleep duration is adequate, but perceived sleep quality is lower. Sleep regularity and factors that interrupt sleep may be worth reviewing.';
    return 'Perceived sleep quality is the main opportunity in this category. Sleep regularity and factors that interrupt sleep may be worth reviewing.';
  }
  if (domain.id === 'mental') {
    let message;
    if (domain.score <= 3) message = 'Your responses indicate a high current mental-wellbeing burden. If these feelings are persistent, worsening, or interfering with daily life, consider seeking professional support.';
    else if (allFavorable) message = 'Your reported mental-wellbeing indicators suggest a favorable current profile across the answers provided.';
    else if (name === 'Stress') message = 'Stress is the main factor lowering this score. Regular physical activity, relaxation techniques, social support, and time for activities you enjoy may help.';
    else if (name === 'Anxiety') message = 'Anxiety frequency is contributing to this score. If it persists or interferes with daily functioning, consider discussing it with a mental-health professional.';
    else message = 'Your reported emotional tone is the main factor lowering this category. Time for restorative activities and connection with people you trust may help support your wellbeing.';
    if (a.support_history === 'current_support') message += ' You indicated that you are already receiving professional support; consider continuing to discuss persistent symptoms with your provider.';
    return message;
  }
  if (domain.id === 'lifestyle') {
    if (allFavorable) return 'Your reported lifestyle habits are generally favorable across the scored indicators.';
    if (name === 'Tobacco') {
      if (a.smoking_status === 'current') return 'Current tobacco use is the main factor reducing this score. Reducing or stopping smoking can substantially improve long-term health; professional cessation support can help.';
      if (a.smoking_status === 'passive') return 'Regular secondhand smoke exposure is contributing to this score. Reducing exposure where possible may improve your lifestyle profile.';
      return 'Your time since quitting smoking contributes to this category. Maintaining your smoke-free routine supports your lifestyle profile.';
    }
    if (name === 'Alcohol') return 'Alcohol intake is one of the main factors reducing this category. Reducing weekly intake would improve the score.';
    if (name === 'Caffeine') return 'Caffeine intake is contributing to this score. Reducing intake may be particularly useful if it affects sleep, anxiety, or restlessness.';
    return 'Recreational substance-use frequency is lowering this category score. Reducing frequency may improve the profile; seek professional advice if use is difficult to control or causes problems.';
  }
  if (domain.id === 'vitals') {
    if (name === 'Blood pressure') {
      const bp = scoreBloodPressure(a.systolic_bp, a.diastolic_bp);
      if (bp.alerts.some((alert) => alert.priority === 'high')) return 'Your reported blood-pressure measurement triggered the high-priority reading rule. Review the highlighted alert above; this score is not a diagnosis.';
      if (a.systolic_bp < 90 && a.diastolic_bp < 60) return 'Your reported blood pressure is in a low range. A single low reading may not be problematic, but symptoms and clinical context matter.';
      if (a.systolic_bp >= 120 || a.diastolic_bp >= 80) return 'Your reported blood-pressure values are above the normal reference category. A single reading is not diagnostic; repeated measurements and clinical context are important.';
    }
    if (name === 'Resting heart rate' && (a.resting_hr < 60 || a.resting_hr > 100)) return 'Your resting heart rate is outside the typical adult reference range. Fitness level, medications, symptoms, and other factors can affect resting heart rate.';
    if (allFavorable) return 'Your reported resting cardiovascular measurements are within favorable reference ranges across the values provided.';
    return 'Your resting heart rate is within the typical adult reference range, but outside the highest-scoring band used by this wellness index. Interpret it alongside fitness level and measurement context.';
  }
  return 'Review the indicators you provided for this category in the context of your usual routine.';
}
