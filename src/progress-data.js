import { DOMAIN_INFO } from './scoring.js';

export function validScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
}
export function dateLabel(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function scoreChange(current, previous) {
  if (validScore(current) === null || validScore(previous) === null) return null;
  return Math.round((current - previous) * 10) / 10 || 0;
}
export function signedChange(value) {
  if (value === null) return 'No previous comparison';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`;
}
export function changeDirection(value) {
  return value === null || value === 0 ? 'flat' : value > 0 ? 'up' : 'down';
}

export function domainComparison(current, previous, domainId) {
  const delta = scoreChange(current?.domainScores?.[domainId], previous?.domainScores?.[domainId]);
  return { delta, text: delta === null ? 'No previous comparison' : `(${signedChange(delta)})`, direction: changeDirection(delta) };
}

// History arrives newest-first from Supabase. Use UUID position for the cutoff,
// including tied timestamps; reverse a copy so stable sorting keeps ties in
// chronological history order and the selected record remains the endpoint.
export function buildHistoricalProgress(history, recordingId) {
  const index = history.findIndex((record) => record.id === recordingId);
  if (index === -1) throw new Error('The selected recording is unavailable in the authenticated user history.');
  return buildProgress(history.slice(index).reverse());
}

export function buildProgress(history, draft = null, currentName = draft?.name ?? '') {
  // Database queries are newest-first. Sort a copy for oldest-to-newest graphs.
  const records = [...history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const alreadySaved = draft && (draft.savedRecordId || records.some((record) => record.id === draft.id || (
    Date.parse(record.date) === Date.parse(draft.date) && record.name === draft.name &&
    record.overallScore === draft.overallScore && answerSignature(record.answers) === answerSignature(draft.answers)
  )));
  if (draft && !alreadySaved && validScore(draft.overallScore) !== null) records.push({ ...draft, name: currentName, current: true });
  const current = records.at(-1) ?? null;
  const previous = records.at(-2) ?? null;
  const delta = previous && current ? scoreChange(current.overallScore, previous.overallScore) : null;
  const changes = DOMAIN_INFO.map((domain) => ({
    ...domain, score: validScore(current?.domainScores[domain.id]),
    delta: domainComparison(current, previous, domain.id).delta,
  }));
  const improvement = changes.filter((domain) => domain.delta !== null && domain.delta > 0).sort((a, b) => b.delta - a.delta)[0] ?? null;
  return { records, current, previous, delta, changes, improvement };
}

function answerSignature(answers) {
  // PostgreSQL jsonb may return object keys in a different order.
  return JSON.stringify(Object.entries(answers ?? {}).sort(([left], [right]) => left.localeCompare(right)));
}

// Split at missing values rather than drawing across an unanswered category.
export function chartSegments(records, select, width = 600) {
  const left = 38, right = width - 18;
  const x = (index) => records.length === 1 ? (left + right) / 2 : left + index * (right - left) / (records.length - 1);
  const segments = [];
  let segment = [];
  records.forEach((record, index) => {
    const score = validScore(select(record));
    if (score === null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else {
      segment.push({ x: x(index), y: 210 - score * 18, score, record, index });
    }
  });
  if (segment.length) segments.push(segment);
  return segments;
}
