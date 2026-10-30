import { assessmentMode, assessmentUrl, setupAvatar } from './assessment.js';
import { calculateAssessment, readAssessment, domainHighlights, domainRecommendation, interpretScore } from './scoring.js';
import { loadResultContext, recordingLabel } from './result-context.js';
import { dateLabel } from './progress-data.js';
import { getCurrentUser, getUserHistoryStorage } from './accounts.js';

if (assessmentMode !== 'quick' && !await getCurrentUser()) {
  window.location.replace('login.html');
} else {

let storage;
try { storage = window.sessionStorage; } catch { storage = { getItem: () => null }; }
// Reuse the exact Screen 10 engine without saving history or modifying answers.
const recordId = assessmentMode === 'quick' ? null : new URLSearchParams(window.location.search).get('record');
let historyStorage;
try { historyStorage = assessmentMode === 'quick' ? null : await getUserHistoryStorage(); } catch { historyStorage = { getItem() { throw new Error('Storage unavailable'); } }; }
const context = loadResultContext(storage, historyStorage, recordId);
const result = context.result;
const answers = context.historical ? null : readAssessment(storage);
const focusIds = new Set(result.focusTargets.map((domain) => domain.id));
const get = (id) => document.getElementById(id);
const domainName = (domain) => domain.id === 'vitals' ? 'Cardiovascular & Vitals' : domain.name;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function scoreText(domain) {
  const value = element('p', 'recommendation-score');
  value.append(element('strong', '', domain.score === null ? 'N/A' : domain.score.toFixed(1)));
  if (domain.score !== null) value.append(element('span', '', ' / 10'));
  return value;
}
function bar(domain) {
  const progress = element('progress', 'recommendation-bar');
  progress.max = 10;
  progress.value = domain.score;
  progress.setAttribute('aria-label', `${domainName(domain)} score: ${domain.score.toFixed(1)} out of 10`);
  return progress;
}
function setTone(card, domain) {
  card.dataset.scoreTone = interpretScore(domain.score).tone;
}
function highlight(id, domain) {
  const card = get(id);
  const content = card.querySelector('[data-highlight-content]');
  if (!domain) {
    content.append(element('p', '', 'N/A'), element('p', 'recommendations-empty', 'No scored categories available yet.'));
    return;
  }
  setTone(card, domain);
  const title = element('p', 'recommendation-domain-name', domainName(domain));
  title.style.color = domain.color;
  content.append(title, scoreText(domain), bar(domain));
  if (id === 'focus-area') content.append(element('p', 'recommendations-empty', focusIds.has(domain.id) ? 'Key Focus' : 'Lowest available score; not an alert.'));
}
const highlights = domainHighlights(result.domains);
highlight('top-strength', highlights.highest);
highlight('focus-area', highlights.lowest);

result.domains.forEach((domain) => {
  const card = element('section', 'assessment-card recommendation-domain');
  const headingId = `domain-${domain.id}-heading`;
  card.setAttribute('aria-labelledby', headingId);
  setTone(card, domain);
  const header = element('div', 'recommendation-domain-header');
  const title = element('h2', '', domainName(domain));
  title.id = headingId;
  title.style.color = domain.color;
  header.append(title);
  if (focusIds.has(domain.id)) header.append(element('span', 'recommendation-focus', 'Key Focus'));
  header.append(scoreText(domain));
  card.append(header);
  if (domain.score !== null) {
    card.append(bar(domain));
    card.append(element('p', 'recommendation-status', interpretScore(domain.score).label));
  }
  const historicalComment = typeof result.recommendations?.[domain.id] === 'string' ? result.recommendations[domain.id] : domain.score === null ? 'Not enough information was provided to calculate this category.' : 'Detailed answers were not saved with this older recording. Its category score is shown without inventing personalized guidance.';
  card.append(element('p', 'recommendation-comment', context.historical ? historicalComment : domainRecommendation(domain, answers)));
  get('domain-cards').append(card);
});

result.alerts.filter((alert) => alert.priority === 'high').forEach((alert) => {
  get('recommendation-alerts').hidden = false;
  const card = element('div', 'assessment-card recommendation-high-alert');
  card.append(element('h2', '', 'High-priority blood-pressure reading'), element('p', '', alert.message));
  get('recommendation-alerts').append(card);
});

let name = 'Current Recording';
try { name = storage.getItem('myhealth_recording_name')?.trim() || name; } catch { /* Keep fallback. */ }
get('recording-name').textContent = context.historical ? recordingLabel(context.record) : assessmentMode === 'quick' ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : name === 'Current Recording' ? dateLabel(new Date()) : name;
if (context.error) get('domain-cards').prepend(element('p', 'assessment-error', context.error));
document.querySelectorAll('[data-return-results]').forEach((link) => { link.href = assessmentUrl('results.html') + (recordId ? `&record=${encodeURIComponent(recordId)}` : ''); });
setupAvatar();
}
