import { calculateAssessment, DOMAIN_INFO, interpretScore } from './scoring.js';
import { readHistory } from './result-history.js';
import { validScore, dateLabel } from './progress-data.js';

// Historical views use saved scores only. Older records need no answer snapshot.
export function historicalResult(record) {
  const domains = DOMAIN_INFO.map((info) => {
    const detail = Array.isArray(record.scoreDetails) ? record.scoreDetails.find((domain) => domain?.id === info.id) : null;
    const score = validScore(detail?.score) ?? validScore(record.domainScores?.[info.id]);
    return { ...info, score, coverage: typeof record.domainCoverage?.[info.id] === 'number' ? record.domainCoverage[info.id] : 0, items: Array.isArray(detail?.items) ? detail.items : [] };
  });
  const available = domains.filter((domain) => domain.score !== null).sort((a, b) => a.score - b.score);
  const overallScore = validScore(record.overallScore);
  const percent = typeof record.completeness === 'number' && Number.isFinite(record.completeness) ? Math.round(Math.max(0, Math.min(100, record.completeness))) : null;
  return {
    overallScore, domains,
    completeness: { percent, label: percent === null ? 'Not recorded' : percent < 40 ? 'Limited data' : percent < 70 ? 'Moderate' : percent < 85 ? 'Good' : 'High' },
    interpretation: interpretScore(overallScore),
    focusTargets: available.filter((domain) => domain.score < 6),
    insight: { strong: available.length > 0 && available.every((domain) => domain.score >= 8), domains: available.filter((domain) => domain.score < 8).slice(0, 2) },
    alerts: Array.isArray(record.alerts) ? record.alerts.filter((alert) => alert && typeof alert.message === 'string' && ['high', 'context'].includes(alert.priority)) : [],
    recommendations: record.recommendations && typeof record.recommendations === 'object' ? record.recommendations : {},
  };
}
export function loadResultContext(session, historyStorage, recordId) {
  if (!recordId) return { historical: false, result: calculateAssessment(session), record: null, error: null };
  try {
    const record = readHistory(historyStorage).find((record) => record && String(record.id) === recordId && typeof record.date === 'string' && Number.isFinite(Date.parse(record.date)));
    if (record) return { historical: true, result: historicalResult(record), record, error: null };
  } catch { /* Use an explicit unavailable view, never the active assessment. */ }
  return { historical: true, result: historicalResult({}), record: null, error: 'This saved recording is unavailable. Return to the Dashboard to choose another recording.' };
}
export function recordingLabel(record) {
  return typeof record?.name === 'string' && record.name.trim() ? record.name.trim() : record?.date ? dateLabel(record.date) : 'Recording unavailable';
}
