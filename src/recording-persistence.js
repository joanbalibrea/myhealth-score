// Map the existing snapshot to PostgreSQL columns, keeping JSON values structured.
export function recordingRow(recording, userId, now = new Date()) {
  const date = recording.date;
  const validTimestamp = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(date) && Number.isFinite(Date.parse(date));
  return {
    user_id: userId,
    name: recording.name || '',
    recorded_at: validTimestamp ? new Date(date).toISOString() : now.toISOString(),
    overall_score: recording.overallScore ?? null,
    completeness: recording.completeness ?? null,
    domain_scores: recording.domainScores ?? {},
    domain_coverage: recording.domainCoverage ?? {},
    focus_targets: recording.focusTargets ?? [],
    score_details: recording.scoreDetails ?? [],
    recommendations: recording.recommendations ?? {},
    answers: recording.answers ?? {},
  };
}

export function createDatabaseSaver(client) {
  return async function saveRecording(recording) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData?.user) {
      throw new Error('Please sign in before saving this recording.', { cause: authError });
    }
    const row = recordingRow(recording, authData.user.id);
    // The old local snapshot ID is not a UUID. Use a database-compatible ID.
    row.id = crypto.randomUUID();
    const { data, error } = await client.from('recordings').insert(row).select().single();
    if (error) throw new Error(`Unable to save recording: ${error.message || 'Database request failed.'}`, { cause: error });
    if (!data) throw new Error('The database did not return the saved recording.');
    return data;
  };
}

// One controller per snapshot: repeated clicks share one database request.
export function createRecordingFinisher(recording, saveToDatabase) {
  let databaseRecord = null;
  let pending = null;
  let completed = false;
  return function finish() {
    if (completed) return Promise.resolve(databaseRecord);
    if (pending) return pending;
    pending = (async () => {
      if (!databaseRecord) databaseRecord = await saveToDatabase(recording);
      completed = true;
      return databaseRecord;
    })().finally(() => { pending = null; });
    return pending;
  };
}

function numericValue(value, maximum = Infinity) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= maximum ? number : null;
}
const domainIds = ['body', 'activity', 'diet', 'sleep', 'mental', 'lifestyle', 'vitals'];

// One shared database-to-UI mapping for Dashboard and saved result views.
export function normalizeRecordingRow(row) {
  const scores = row.domain_scores ?? {};
  const coverage = row.domain_coverage ?? {};
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    date: row.recorded_at,
    createdAt: row.created_at,
    overallScore: numericValue(row.overall_score, 10),
    completeness: numericValue(row.completeness, 100),
    domainScores: Object.fromEntries(domainIds.map((id) => [id, numericValue(scores[id], 10)])),
    domainCoverage: Object.fromEntries(domainIds.map((id) => [id, numericValue(coverage[id], 1)])),
    focusTargets: Array.isArray(row.focus_targets) ? row.focus_targets : [],
    scoreDetails: Array.isArray(row.score_details) ? row.score_details.map((detail) => detail && typeof detail === 'object' ? { ...detail, score: numericValue(detail.score, 10) } : detail) : [],
    recommendations: row.recommendations ?? {},
    answers: row.answers ?? {},
  };
}

export function createDatabaseReaders(client) {
  async function requireUser() {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) throw new Error('Please sign in to view saved recordings.', { cause: error });
  }
  async function getRecordings() {
    await requireUser();
    // RLS limits rows to the authenticated user; no browser-supplied user filter.
    const { data, error } = await client.from('recordings').select().order('recorded_at', { ascending: false });
    if (error) throw new Error(`Unable to load recordings: ${error.message || 'Database request failed.'}`, { cause: error });
    if (!Array.isArray(data)) throw new Error('The database did not return a recording list.');
    return data.map(normalizeRecordingRow);
  }
  async function getRecordingById(recordingId) {
    if (typeof recordingId !== 'string' || !recordingId.trim()) throw new Error('A recording ID is required.');
    await requireUser();
    const { data, error } = await client.from('recordings').select().eq('id', recordingId.trim()).maybeSingle();
    if (error) throw new Error(`Unable to load recording: ${error.message || 'Database request failed.'}`, { cause: error });
    return data ? normalizeRecordingRow(data) : null;
  }
  return { getRecordings, getRecordingById };
}
