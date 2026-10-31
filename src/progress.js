import { renderScoreChart } from './score-chart.js';
import { uiIcon, categoryIcons } from './ui-icons.js';
import { assessmentMode, setupAvatar } from './assessment.js';
import { calculateAssessment, DOMAIN_INFO } from './scoring.js';
import { currentRecording } from './result-history.js';
import { buildProgress, buildHistoricalProgress, dateLabel, signedChange, changeDirection, domainComparison } from './progress-data.js';
import { getCurrentUser } from './accounts.js';
import { getRecordings } from './database.js';
import { resultUrl } from './result-navigation.js';

const get = (id) => document.getElementById(id);
const domainName = (domain) => domain.id === 'vitals' ? 'Cardiovascular & Vitals' : domain.name;
function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}
const recordLabel = (record) => record.name?.trim() || dateLabel(record.date);

const params = new URLSearchParams(window.location.search);
const recordId = assessmentMode === 'quick' ? null : params.get('record');
document.querySelectorAll('[data-progress-results]').forEach((link) => { link.href = resultUrl('results.html', assessmentMode, recordId); });

// Guard before reading any history or current assessment in Quick Launcher mode.
if (assessmentMode === 'quick') {
  get('progress-quick-message').hidden = false;
} else if (!await getCurrentUser()) {
  window.location.replace('login.html');
} else {
  setupAvatar();
  let session;
  try { session = window.sessionStorage; } catch { session = { getItem: () => null }; }
  let name = '';
  try { name = session.getItem('myhealth_recording_name')?.trim() || ''; } catch { /* Date fallback. */ }
  const savedOnly = recordId !== null || params.get('source') === 'dashboard';
  get('history-status').hidden = false;
  get('history-status').textContent = 'Loading recordings…';
  get('retry-progress').addEventListener('click', () => window.location.reload());
  let savedRecordings = null;
  let historicalModel = null;
  try {
    const history = await getRecordings();
    if (recordId !== null) historicalModel = buildHistoricalProgress(history, recordId);
    savedRecordings = history;
  }
  catch (error) {
    console.error('Unable to load Progress recordings:', error);
    get('history-status').textContent = recordId !== null
      ? "We couldn't load this recording. It may no longer be available or you may not have access. Please return to Results or try again."
      : "We couldn't load your recordings. Please try again.";
    get('retry-progress').hidden = false;
  }
  if (savedRecordings !== null) {
  get('history-status').hidden = true;
  get('registered-progress').hidden = false;
  const assessment = savedOnly ? null : calculateAssessment(session);
  const draft = assessment && assessment.overallScore !== null ? currentRecording(assessment, name, session) : null;
  const model = historicalModel ?? buildProgress(savedRecordings, draft);
  const current = model.current;
  get('current-progress-score').textContent = current?.overallScore == null ? 'N/A' : current.overallScore.toFixed(1);
  const overallDelta = node('span', 'progress-overall-delta', model.delta === null ? (!model.previous && current ? 'First measurement' : 'No previous comparison') : signedChange(model.delta) + ' pts');
  overallDelta.dataset.direction = changeDirection(model.delta);
  const getScoreElement = get('current-progress-score');
  const scoreStack = node('div', 'progress-score-stack');
  get('current-progress-score').replaceWith(scoreStack);
  scoreStack.append(getScoreElement, overallDelta);
  scoreStack.parentElement.after(node('p', 'ui-comparison-note', 'Points are the difference from the previous recording on the 0–10 score scale. Category changes use the same comparison.'));
  get('latest-recording-name').textContent = current ? recordLabel(current) : 'No recordings yet';
  if (!model.previous) {
    get('growth-description').append(node('strong', '', current ? 'No past recordings' : 'No recordings yet'), node('span', 'progress-first-description', !current ? 'Complete your first health recording to start tracking progress.' : 'This is your first recorded assessment. Future check-ins will appear here for comparison.'));
  } else if (model.delta === null) {
    get('growth-description').textContent = 'An overall comparison is not available because one of the assessments has no overall score.';
  } else {
    const badge = get('growth-trend');
    badge.hidden = false;
    badge.dataset.direction = changeDirection(model.delta);
    badge.textContent = model.delta > 0 ? 'Positive Trend' : model.delta < 0 ? 'Negative Trend' : 'Stable Trend';
    get('growth-description').textContent = model.delta === 0 ? 'Overall score unchanged since your last recording.' : `Overall score ${signedChange(model.delta)} points since your last recording.`;
  }
  if (model.improvement) {
    const improvement = get('growth-improvement');
    improvement.hidden = false;
    const label = node('strong', '', domainName(model.improvement));
    label.style.color = model.improvement.color;
    improvement.append(label, ` improved the most (${signedChange(model.improvement.delta)}).`);
  }

  function drawChart(container, series, chartName) {
    renderScoreChart(container, model.records, series, recordLabel, chartName, container.id === 'overall-chart');
  }

  drawChart(get('overall-chart'), [{ id: 'overall', name: 'Overall score', color: '#1557b9', select: (record) => record.overallScore }], 'Overall MyHealth Score across recordings');
  get('overall-empty').hidden = model.records.some((record) => record.overallScore !== null);
  const selected = new Set(DOMAIN_INFO.filter((domain) => model.records.some((record) => record.domainScores[domain.id] !== null)).map((domain) => domain.id));
  const chartSeries = DOMAIN_INFO.map((domain) => ({ ...domain, name: domainName(domain), select: (record) => record.domainScores[domain.id] }));
  function renderCategories() {
    drawChart(get('category-chart'), chartSeries.filter((domain) => selected.has(domain.id)), 'Category scores across recordings');
    get('category-selection-status').textContent = selected.size ? `${selected.size} categor${selected.size === 1 ? 'y' : 'ies'} shown.` : 'No categories selected. Select a category above to show its measurements.';
  }
  DOMAIN_INFO.forEach((domain) => {
    const available = model.records.some((record) => record.domainScores[domain.id] !== null);
    const button = node('button', 'progress-legend-pill', domainName(domain));
    button.prepend(uiIcon(categoryIcons[domain.id]));
    button.type = 'button';
    button.style.setProperty('--domain-color', domain.color);
    button.disabled = !available;
    if (!available) button.title = 'No measurements for this category';
    button.setAttribute('aria-pressed', String(selected.has(domain.id)));
    button.addEventListener('click', () => {
      if (selected.has(domain.id)) selected.delete(domain.id);
      else selected.add(domain.id);
      button.setAttribute('aria-pressed', String(selected.has(domain.id)));
      renderCategories();
    });
    get('domain-legend').append(button);
  });
  renderCategories();
  const available = model.changes.filter((domain) => domain.score !== null);
  if (!available.length) get('latest-domain-scores').append(node('p', 'progress-chart-note', 'No current category scores are available yet.'));
  available.forEach((domain) => {
    const row = node('div', 'progress-latest-row');
    const label = node('strong', '', domainName(domain));
    label.style.color = domain.color;
    label.prepend(uiIcon(categoryIcons[domain.id]));
    const score = node('span', '', domain.score.toFixed(1));
    const comparison = domainComparison(model.current, model.previous, domain.id);
    const change = node('span', 'progress-domain-change', comparison.delta === null ? comparison.text : signedChange(comparison.delta) + ' pts');
    change.dataset.direction = comparison.direction;
    row.append(label, score, change);
    get('latest-domain-scores').append(row);
  });
  }
}
