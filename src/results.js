import { uiIcon } from './ui-icons.js';
import { assessmentMode, assessmentUrl, setupAvatar } from './assessment.js';
import { calculateAssessment, interpretScore } from './scoring.js';
import { currentRecording, previousRecording, markRecordingSaved } from './result-history.js';
import { saveRecording as saveDatabaseRecording, getRecordings, getRecordingById } from './database.js';
import { createRecordingFinisher } from './recording-persistence.js';
import { loadResultContext, loadDatabaseResultContext, historicalResult, recordingLabel } from './result-context.js';
import { dateLabel } from './progress-data.js';
import { getCurrentUser } from './accounts.js';
import { resultUrl } from './result-navigation.js';

const quick = assessmentMode === 'quick';
if (!quick && !await getCurrentUser()) {
  window.location.replace('login.html');
} else {
const get = (id) => document.getElementById(id);
for (const [id, icon] of [['completeness-heading', 'checklist'], ['insight-heading', 'insight']]) {
  const wrapper = document.createElement('span');
  wrapper.className = 'assessment-section-icon';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.append(uiIcon(icon));
  get(id).prepend(wrapper);
}
// Storage access can itself throw when browser storage is blocked.
let session;
try { session = window.sessionStorage; } catch { session = { getItem: () => null }; }
const recordId = quick ? null : new URLSearchParams(window.location.search).get('record');
let context;
if (recordId !== null) {
  get('results-status').textContent = 'Loading recording…';
  get('finish-results').disabled = true;
  try { context = await loadDatabaseResultContext(recordId, getRecordingById); }
  catch (error) {
    console.error('Unable to load historical recording:', error);
    context = { historical: true, record: null, result: historicalResult({}), error: "We couldn't load this recording. Please return to the Dashboard and try again." };
  }
  get('results-status').textContent = '';
  get('finish-results').disabled = false;
} else {
  context = loadResultContext(session);
}
const result = context.result;
get('dashboard-without-saving').hidden = quick || context.historical;
if (context.historical) {
  document.querySelectorAll('[data-results-back], [aria-label="Exit assessment"]').forEach((control) => { control.hidden = true; });
}
let recordingName = '';
try { recordingName = session.getItem('myhealth_recording_name')?.trim() || recordingName; } catch { /* Use the fallback. */ }
get('recording-name').textContent = context.historical ? recordingLabel(context.record) : quick ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : recordingName || dateLabel(new Date());
const recording = context.historical ? context.record : currentRecording(result, recordingName, session);
if (context.error) get('results-status').textContent = context.error;
const score = result.overallScore;
get('overall-card').dataset.scoreTone = result.interpretation.tone;
get('overall-score').value = score === null ? '—' : score.toFixed(1);
get('score-denominator').hidden = score === null;
get('score-circle').style.strokeDashoffset = score === null ? 100 : 100 - score * 10;
get('score-interpretation').textContent = result.interpretation.label;
get('score-description').textContent = result.interpretation.description;
get('completeness-value').textContent = result.completeness.percent === null ? 'N/A' : `${result.completeness.percent}%`;
get('completeness-progress').value = result.completeness.percent ?? 0;
get('completeness-label').textContent = context.historical ? result.completeness.label : `${result.completeness.label} · ${result.completeness.answered} of ${result.completeness.total} applicable questions answered`;

function domainLabel(domain) {
  const span = document.createElement('span');
  span.className = 'results-domain-label';
  span.style.color = domain.color;
  span.textContent = domain.name;
  return span;
}
const insight = get('key-insight');
if (score === null) {
  insight.textContent = 'There is not enough scored information yet. You can return to the assessment to add answers.';
} else if (result.insight.strong) {
  insight.textContent = 'Your reported wellness profile is strong overall, with no major priority areas identified.';
} else {
  insight.append('Among your reported domains, ');
  result.insight.domains.forEach((domain, index) => {
    if (index) insight.append(' and ');
    insight.append(domainLabel(domain));
  });
  insight.append(result.insight.domains.length === 1 ? ' offers the clearest opportunity for improvement.' : ' offer the clearest opportunities for improvement.');
}
if (result.alerts.length) {
  get('reading-notes').hidden = false;
  result.alerts.forEach((alert) => {
    const note = document.createElement('p');
    note.className = 'assessment-card';
    note.dataset.priority = alert.priority;
    note.textContent = alert.message;
    get('reading-notes').append(note);
  });
}
get('recommendations-link').href = resultUrl('scores-and-recommendations.html', assessmentMode, context.historical ? recordId : null);
if (context.historical && !context.record) get('recommendations-link').hidden = true;
get('focus-summary').textContent = score === null ? 'No scored domains available yet' : result.focusTargets.length ? `${result.focusTargets.length} focus target${result.focusTargets.length === 1 ? '' : 's'} highlighted` : 'No priority focus targets';
result.focusTargets.slice(0, 3).forEach((domain) => {
  const chip = document.createElement('span');
  chip.className = 'results-chip';
  chip.style.setProperty('--domain-color', domain.color);
  chip.append(domainLabel(domain));
  const value = document.createElement('strong');
  value.textContent = domain.score.toFixed(1);
  value.dataset.scoreTone = interpretScore(domain.score).tone;
  chip.append(value);
  get('focus-chips').append(chip);
});

const progress = get('progress-link');
if (quick) {
  progress.removeAttribute('href');
  progress.setAttribute('aria-disabled', 'true');
  progress.setAttribute('role', 'link');
  get('progress-arrow').hidden = true;
  get('quick-progress-message').hidden = false;
} else {
  progress.href = resultUrl('progress.html', assessmentMode, context.historical ? recordId : null);
  get('trend-details').hidden = false;
  try {
    const previous = previousRecording((await getRecordings()).filter((entry) => String(entry.id) !== String(recording?.id) && (!context.historical || Date.parse(entry.date) < Date.parse(recording?.date))));
    if (score === null) {
      get('trend-delta').textContent = '—';
      get('trend-context').textContent = 'Add scored answers to compare recordings';
    } else if (previous) {
      const delta = Math.round((score - previous.overallScore) * 10) / 10;
      get('trend-delta').textContent = `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(1)} pts`;
      get('trend-details').dataset.direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
      get('trend-context').textContent = 'Compared with your most recent saved recording';
      // Two real observations, with the same 0–10 vertical scale.
      const startY = 42 - previous.overallScore * 3.6;
      const endY = 42 - score * 3.6;
      get('trend-line').setAttribute('d', `M 8 ${startY} L 132 ${endY}`);
      get('trend-end').setAttribute('cx', '132');
      get('trend-end').setAttribute('cy', String(endY));
      get('trend-visual').hidden = false;
    }
  } catch (error) {
    console.error('Unable to load the Results trend preview:', error);
    get('trend-context').textContent = 'Saved history is unavailable';
  }
}
get('finish-results').textContent = context.historical ? 'Back to Dashboard' : quick ? 'Finish' : 'Finish & Save to Dashboard';
let finishing = false;
const finishRecording = createRecordingFinisher(recording, saveDatabaseRecording);
get('finish-results').addEventListener('click', async () => {
  if (finishing) return;
  if (context.historical) { window.location.href = assessmentUrl('dashboard.html'); return; }
  if (quick) { window.location.href = assessmentUrl('login.html'); return; }
  if (recording.savedRecordId) { window.location.href = assessmentUrl('dashboard.html'); return; }
  finishing = true;
  get('finish-results').disabled = true;
  get('finish-results').setAttribute('aria-busy', 'true');
  get('results-status').textContent = '';
  try {
    if (!await getCurrentUser()) { window.location.replace('login.html'); return; }
    const saved = await finishRecording();
    markRecordingSaved(recording, saved, session);
    window.location.href = assessmentUrl('dashboard.html');
  } catch (error) {
    console.error('Failed to finish saving the recording:', error);
    get('results-status').textContent = "We couldn't save this recording. Please try again.";
    finishing = false;
    get('finish-results').disabled = false;
    get('finish-results').removeAttribute('aria-busy');
  }
});
document.querySelectorAll('[data-results-back]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = assessmentUrl(context.historical ? 'dashboard.html' : 'optional-health-data.html'); });
});
setupAvatar();
}
