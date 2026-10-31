import { assessmentMode, setupAvatar } from './assessment.js';
import { startRecording } from './profile.js';
import { dateLabel, scoreChange, signedChange, changeDirection, chartSegments, domainComparison } from './progress-data.js';
import { DOMAIN_INFO, interpretScore } from './scoring.js';
import { recordingLabel } from './result-context.js';
import { getCurrentUser, logoutUser } from './accounts.js';
import { getProfile, getRecordings } from './database.js';

const get = (id) => document.getElementById(id);
function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}
function svgNode(tag, attributes = {}, text) {
  const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([key, value]) => item.setAttribute(key, value));
  if (text !== undefined) item.textContent = text;
  return item;
}
if (assessmentMode === 'quick') {
  get('dashboard-quick-message').hidden = false;
} else if (!await getCurrentUser()) {
  window.location.replace('login.html');
} else {
  get('dashboard-main').hidden = false;
  setupAvatar();
  let profile = { username: '' };
  try { profile = await getProfile(); } catch (error) { console.error('Unable to load Dashboard profile:', error); }
  get('dashboard-greeting').textContent = `Hello, ${profile.username || 'there'}`;
  get('new-recording-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      startRecording(sessionStorage, get('new-recording-name').value);
      window.location.href = 'basic-profile.html?mode=registered';
    } catch { get('dashboard-status').textContent = 'Please allow session storage before starting a new recording.'; }
  });
  get('dashboard-exit').addEventListener('click', async () => {
    get('dashboard-exit').disabled = true;
    try { await logoutUser(); window.location.href = 'login.html'; }
    catch (error) { get('dashboard-status').textContent = error.message || 'Unable to sign out. Please try again.'; }
    finally { get('dashboard-exit').disabled = false; }
  });
  get('retry-recordings').addEventListener('click', () => window.location.reload());
  get('dashboard-status').textContent = 'Loading recordings…';
  get('recording-count').setAttribute('aria-busy', 'true');
  let records = null;
  try {
    records = await getRecordings(); // Database order: newest first.
    get('dashboard-status').textContent = '';
    get('recording-count').textContent = `${records.length} recording${records.length === 1 ? '' : 's'} completed`;
    document.querySelectorAll('[data-saved-recordings]').forEach((section) => { section.hidden = false; });
  } catch (error) {
    console.error('Unable to load Dashboard recordings:', error);
    get('dashboard-status').textContent = "We couldn't load your recordings. Please try again.";
    get('recording-count').textContent = 'Recording count unavailable';
    get('retry-recordings').hidden = false;
  } finally { get('recording-count').removeAttribute('aria-busy'); }
  if (records !== null) {
  const latest = records[0];
  const chronological = [...records].reverse();
  const summary = get('dashboard-score-summary');
  if (!latest) summary.append(node('strong', '', 'No recordings yet'), node('p', '', 'Complete your first health recording to start tracking progress.'));
  else {
    const score = node('strong', 'dashboard-current-score', latest.overallScore === null ? 'N/A' : `${latest.overallScore.toFixed(1)} / 10`);
    score.dataset.scoreTone = interpretScore(latest.overallScore).tone;
    summary.append(score);
    const delta = records.length > 1 ? scoreChange(latest.overallScore, records[1].overallScore) : null;
    const change = node('span', 'dashboard-change', records.length === 1 ? 'First measurement' : delta === null ? 'No previous comparison' : `${signedChange(delta)} pts`);
    change.dataset.direction = changeDirection(delta);
    summary.append(change);
  }
  // Reuse Progress's geometry and missing-value segmentation with saved data only.
  const width = Math.max(460, records.length * 105);
  const chart = svgNode('svg', { viewBox: `0 0 ${width} 270`, role: 'img', 'aria-label': 'Overall scores of saved recordings, from zero to ten' });
  chart.style.minWidth = `${width}px`;
  for (let value = 0; value <= 10; value += 2) {
    const y = 210 - value * 18;
    chart.append(svgNode('line', { x1: 38, x2: width - 18, y1: y, y2: y, class: 'progress-grid-line' }), svgNode('text', { x: 27, y: y + 4, 'text-anchor': 'end', class: 'progress-axis-label' }, value));
  }
  chronological.forEach((record, index) => {
    const x = records.length === 1 ? (38 + width - 18) / 2 : 38 + index * (width - 56) / (records.length - 1);
    const anchor = records.length === 1 ? 'middle' : index === 0 ? 'start' : index === records.length - 1 ? 'end' : 'middle';
    const label = recordingLabel(record);
    const text = svgNode('text', { x, y: 237, 'text-anchor': anchor, class: 'progress-axis-label' }, label.length > 16 ? `${label.slice(0, 14)}…` : label);
    text.append(svgNode('title', {}, label));
    chart.append(text);
  });
  chartSegments(chronological, (record) => record.overallScore, width).forEach((segment) => {
    if (segment.length > 1) chart.append(svgNode('polyline', { points: segment.map((point) => `${point.x},${point.y}`).join(' '), stroke: '#1557b9', fill: 'none', 'stroke-width': 3 }));
    segment.forEach((point) => {
      const label = `${recordingLabel(point.record)}: ${point.score.toFixed(1)} out of 10`;
      const circle = svgNode('circle', { cx: point.x, cy: point.y, r: 5, stroke: '#1557b9', fill: 'white', 'stroke-width': 3, tabindex: 0, 'aria-label': label });
      circle.append(svgNode('title', {}, label)); chart.append(circle);
    });
  });
  get('dashboard-chart').append(chart);
  if (!latest) get('dashboard-categories').append(node('p', 'assessment-card dashboard-empty', 'Complete your first assessment to see your category scores.'));
  else DOMAIN_INFO.forEach((domain) => {
    const score = latest.domainScores[domain.id];
    const card = node('article', 'assessment-card dashboard-category');
    const title = node('h3', '', domain.id === 'vitals' ? 'Cardiovascular & Vitals' : domain.name);
    title.style.color = domain.color;
    card.append(title, node('strong', '', score === null ? 'N/A' : `${score.toFixed(1)} / 10`), node('p', '', score === null ? 'Not enough data' : score >= 8 ? 'Strong range' : interpretScore(score).label === 'Good' ? 'Good range' : interpretScore(score).label));
    const comparison = domainComparison(latest, records[1], domain.id);
    const change = node('p', 'progress-domain-change', comparison.text);
    change.dataset.direction = comparison.direction;
    card.append(change);
    get('dashboard-categories').append(card);
  });
  let expanded = false;
  function renderRecordings() {
    const list = get('dashboard-recordings-list'); list.replaceChildren();
    if (!records.length) list.append(node('p', 'assessment-card dashboard-empty', 'Your completed recordings will appear here.'));
    records.slice(0, expanded ? records.length : 4).forEach((record, index) => {
      const link = node('a', 'assessment-card dashboard-history-card');
      link.href = `results.html?record=${encodeURIComponent(record.id)}&mode=registered`;
      const text = node('div', 'dashboard-history-title');
      text.append(node('strong', '', recordingLabel(record)), node('small', '', `Completed ${dateLabel(record.date)}`));
      if (index === 0) text.append(node('span', 'dashboard-latest-badge', 'Latest'));
      const badge = node('span', 'dashboard-score-badge', record.overallScore === null ? 'N/A' : `${record.overallScore.toFixed(1)} / 10`);
      badge.dataset.scoreTone = interpretScore(record.overallScore).tone;
      link.append(text, badge, node('span', 'dashboard-history-arrow', '›'));
      list.append(link);
    });
    get('view-all-recordings').textContent = expanded ? 'Show Less' : 'View All';
    get('view-all-recordings').setAttribute('aria-expanded', String(expanded));
  }
  get('view-all-recordings').hidden = records.length <= 4;
  get('view-all-recordings').addEventListener('click', () => { expanded = !expanded; renderRecordings(); });
  renderRecordings();
  }
}
