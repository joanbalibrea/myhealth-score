import { assessmentMode, assessmentUrl, setupAvatar } from './assessment.js';
import { calculateAssessment, interpretScore } from './scoring.js';
import { currentRecording, readHistory, previousRecording, saveRecording } from './result-history.js';
import { loadResultContext, recordingLabel } from './result-context.js';
import { dateLabel } from './progress-data.js';
import { getCurrentUser, getUserHistoryStorage } from './accounts.js';

const quick = assessmentMode === 'quick';
if (!quick && !await getCurrentUser()) {
  window.location.replace('login.html');
} else {
const get = (id) => document.getElementById(id);
// Storage access can itself throw when browser storage is blocked.
let session;
try { session = window.sessionStorage; } catch { session = { getItem: () => null }; }
const recordId = quick ? null : new URLSearchParams(window.location.search).get('record');
let historyStorage;
try { historyStorage = quick ? null : await getUserHistoryStorage(); } catch { historyStorage = { getItem() { throw new Error('Storage unavailable'); } }; }
const context = loadResultContext(session, historyStorage, recordId);
const result = context.result;
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
get('recommendations-link').href = assessmentUrl('scores-and-recommendations.html');
if (context.historical && context.record) get('recommendations-link').href += `&record=${encodeURIComponent(context.record.id)}`;
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
  progress.href = assessmentUrl('progress.html');
  if (context.historical) progress.href += '&source=dashboard';
  get('trend-details').hidden = false;
  try {
    const previous = previousRecording(readHistory(historyStorage).filter((entry) => entry && String(entry.id) !== String(recording?.id) && (!context.historical || Date.parse(entry.date) < Date.parse(recording?.date))));
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
  } catch {
    get('trend-context').textContent = 'Saved history is unavailable';
  }
}
get('finish-results').textContent = context.historical ? 'Back to Dashboard' : quick ? 'Finish' : 'Finish & Save to Dashboard';
let finishing = false;
get('finish-results').addEventListener('click', async () => {
  if (finishing) return;
  if (context.historical) { window.location.href = assessmentUrl('dashboard.html'); return; }
  if (quick) { window.location.href = assessmentUrl('login.html'); return; }
  try {
    if (!await getCurrentUser()) { window.location.replace('login.html'); return; }
    saveRecording(historyStorage, recording);
    finishing = true;
    window.location.href = assessmentUrl('dashboard.html');
  } catch {
    get('results-status').textContent = 'This recording could not be saved. Your existing history has not been replaced. Please allow browser storage and try again.';
  }
});
document.querySelectorAll('[data-results-back]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = assessmentUrl(context.historical ? 'dashboard.html' : 'optional-health-data.html'); });
});
setupAvatar();
}
