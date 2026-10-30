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
    domainScores: Object.fromEntries(result.domains.map((domain) => [domain.id, domain.score === null ? null : Math.round(domain.score * 10) / 10])),
  };
}
