import { DOMAIN_INFO } from './scoring.js';
import { readHistory } from './result-history.js';

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

export function validatedHistory(storage) {
  let raw;
  try { raw = readHistory(storage); }
  catch { return { records: [], unavailable: true }; }
  const seen = new Set();
  const records = [];
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || typeof entry.date !== 'string' || !Number.isFinite(Date.parse(entry.date))) return;
    const domainScores = Object.fromEntries(DOMAIN_INFO.map(({ id }) => [id, validScore(entry.domainScores?.[id])]));
    const overallScore = validScore(entry.overallScore);
    if (overallScore === null && Object.values(domainScores).every((score) => score === null)) return;
    const id = typeof entry.id === 'string' || typeof entry.id === 'number' ? String(entry.id) : `historical-${index}`;
    if (seen.has(id)) return;
    seen.add(id);
    records.push({ id, name: typeof entry.name === 'string' ? entry.name.trim() : '', date: entry.date, overallScore, domainScores });
  });
  records.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return { records, unavailable: false };
}

export function buildProgress(history, current, currentName = '') {
  // The current ID is shared with Results. Do not compare a recording with itself.
  const previousRecords = history.filter((record) => record.id !== current.id && Date.parse(record.date) <= Date.parse(current.date));
  const previous = previousRecords.at(-1) ?? null;
  const records = [...previousRecords, { ...current, name: currentName, current: true }];
  const delta = previous ? scoreChange(current.overallScore, previous.overallScore) : null;
  const changes = DOMAIN_INFO.map((domain) => ({
    ...domain, score: validScore(current.domainScores[domain.id]),
    delta: previous ? scoreChange(current.domainScores[domain.id], previous.domainScores[domain.id]) : null,
  }));
  const improvement = changes.filter((domain) => domain.delta !== null && domain.delta > 0).sort((a, b) => b.delta - a.delta)[0] ?? null;
  return { records, previous, delta, changes, improvement };
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
