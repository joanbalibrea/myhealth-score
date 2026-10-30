import { domainRecommendation } from './scoring.js';

// History is separate from scoring so viewing results never saves a recording.
export function readHistory(storage) {
  const raw = storage.getItem('myhealth_history');
  if (raw === null) return [];
  const history = JSON.parse(raw);
  if (!Array.isArray(history)) throw new Error('Recording history is not a list.');
  return history;
}

export function previousRecording(history) {
  return history.filter((record) => record && typeof record.overallScore === 'number' && Number.isFinite(record.overallScore) && record.overallScore >= 0 && record.overallScore <= 10 && Number.isFinite(Date.parse(record.date)))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null;
}

export function saveRecording(storage, record) {
  // Re-read on click to preserve records added after this page was opened.
  const history = readHistory(storage);
  if (!history.some((entry) => entry?.id === record.id)) {
    storage.setItem('myhealth_history', JSON.stringify([...history, record]));
  }
}

export function createRecording(result, name, date = new Date(), id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`) {
  return {
    id, name, date: date.toISOString(), overallScore: result.overallScore,
    completeness: result.completeness.percent,
    domainScores: Object.fromEntries(result.domains.map((domain) => [domain.id, domain.score])),
    domainCoverage: Object.fromEntries(result.domains.map((domain) => [domain.id, domain.coverage])),
    scoreDetails: result.domains,
    focusTargets: result.focusTargets.map((domain) => domain.id),
    insight: result.insight,
    alerts: result.alerts,
    recommendations: result.answers ? Object.fromEntries(result.domains.map((domain) => [domain.id, domainRecommendation(domain, result.answers)])) : {},
    answers: result.answers,
  };
}

// Share the unsaved result's identity across Results and Progress. Only session
// metadata is written here; saveRecording remains the only history writer.
export function currentRecording(result, name, session, now = new Date()) {
  const record = createRecording(result, name, now);
  const signature = JSON.stringify([name, record.overallScore, record.completeness, record.domainScores, record.answers]);
  try {
    const previous = JSON.parse(session.getItem('myhealth_current_result_identity'));
    if (previous?.signature === signature && typeof previous.id === 'string' && Number.isFinite(Date.parse(previous.date))) {
      record.id = previous.id;
      record.date = previous.date;
    } else {
      session.setItem('myhealth_current_result_identity', JSON.stringify({ signature, id: record.id, date: record.date }));
    }
  } catch {
    // Unavailable storage or malformed metadata must not prevent viewing results.
    try { session.setItem('myhealth_current_result_identity', JSON.stringify({ signature, id: record.id, date: record.date })); } catch { /* Keep this in-memory identity. */ }
  }
  return record;
}
