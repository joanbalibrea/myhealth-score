import { assessmentMode, assessmentUrl, setupAvatar } from './assessment.js';
import { calculateAssessment, DOMAIN_INFO } from './scoring.js';
import { currentRecording } from './result-history.js';
import { validatedHistory, buildProgress, dateLabel, signedChange, changeDirection, chartSegments } from './progress-data.js';

const get = (id) => document.getElementById(id);
const domainName = (domain) => domain.id === 'vitals' ? 'Cardiovascular & Vitals' : domain.name;
function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}
function svgNode(tag, attributes = {}, text) {
  const result = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([key, value]) => result.setAttribute(key, String(value)));
  if (text !== undefined) result.textContent = text;
  return result;
}
const recordLabel = (record) => record.name?.trim() || dateLabel(record.date);

document.querySelectorAll('[data-progress-results]').forEach((link) => { link.href = assessmentUrl('results.html'); });
document.querySelectorAll('[data-progress-dashboard]').forEach((link) => { link.href = assessmentUrl('dashboard.html'); });

// Guard before reading any history or current assessment in Quick Launcher mode.
if (assessmentMode === 'quick') {
  get('progress-quick-message').hidden = false;
  document.querySelectorAll('[data-progress-dashboard]').forEach((link) => { link.hidden = true; });
} else {
  setupAvatar();
  get('registered-progress').hidden = false;
  let session;
  try { session = window.sessionStorage; } catch { session = { getItem: () => null }; }
  let name = '';
  try { name = session.getItem('myhealth_recording_name')?.trim() || ''; } catch { /* Date fallback. */ }
  const savedOnly = new URLSearchParams(window.location.search).get('source') === 'dashboard';
  let history;
  try { history = validatedHistory(window.localStorage); }
  catch { history = { records: [], unavailable: true }; }
  const empty = { id: 'empty', name: '', date: new Date().toISOString(), overallScore: null, domainScores: Object.fromEntries(DOMAIN_INFO.map((domain) => [domain.id, null])) };
  const current = savedOnly ? history.records.at(-1) ?? empty : currentRecording(calculateAssessment(session), name, session);
  const displayName = savedOnly ? current.name : name;
  const model = buildProgress(history.records, current, displayName);
  if (savedOnly && !history.records.length) model.records = [];
  const currentDisplay = { ...current, name: displayName };
  if (history.unavailable) {
    get('history-status').hidden = false;
    get('history-status').textContent = 'Saved history could not be read. Your current assessment is shown; existing history has not been changed.';
  }
  get('current-progress-score').textContent = current.overallScore === null ? 'N/A' : current.overallScore.toFixed(1);
  get('latest-recording-name').textContent = savedOnly && !history.records.length ? 'No recordings yet' : recordLabel(currentDisplay);
  if (!model.previous) {
    get('growth-description').append(node('strong', '', 'No past recordings'), node('span', 'progress-first-description', savedOnly && !history.records.length ? 'Complete your first health recording to start tracking progress.' : 'This is your first recorded assessment. Future check-ins will appear here for comparison.'));
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
    container.replaceChildren();
    const width = Math.max(520, model.records.length * 110);
    const svg = svgNode('svg', { viewBox: `0 0 ${width} 290`, role: 'img', 'aria-label': chartName });
    svg.style.minWidth = `${width}px`;
    svg.append(svgNode('title', {}, chartName), svgNode('desc', {}, 'Scores range from zero to ten. Each point represents one recording. Missing measurements leave gaps. The final recording is the current assessment.'));
    for (let score = 0; score <= 10; score += 2) {
      const y = 210 - score * 18;
      svg.append(svgNode('line', { x1: 38, x2: width - 18, y1: y, y2: y, class: 'progress-grid-line' }));
      svg.append(svgNode('text', { x: 27, y: y + 4, 'text-anchor': 'end', class: 'progress-axis-label' }, score));
    }
    model.records.forEach((record, index) => {
      const x = model.records.length === 1 ? (38 + width - 18) / 2 : 38 + index * (width - 56) / (model.records.length - 1);
      // Keep labels inside the chart at either edge, including long names.
      const anchor = model.records.length === 1 ? 'middle' : index === 0 ? 'start' : index === model.records.length - 1 ? 'end' : 'middle';
      const text = svgNode('text', { x, y: 235, 'text-anchor': anchor, class: 'progress-axis-label' });
      const label = recordLabel(record);
      const chunks = label.match(/.{1,16}/g) || [''];
      chunks.slice(0, 2).forEach((chunk, line) => text.append(svgNode('tspan', { x, dy: line ? 14 : 0 }, line === 1 && chunks.length > 2 ? `${chunk.slice(0, 13)}…` : chunk)));
      text.append(svgNode('title', {}, label));
      svg.append(text);
      if (record.current) svg.append(svgNode('text', { x, y: 276, 'text-anchor': anchor, class: 'progress-current-label' }, 'CURRENT'));
    });
    series.forEach((entry) => {
      const group = svgNode('g', { 'data-series-id': entry.id, style: `color: ${entry.color}` });
      chartSegments(model.records, entry.select, width).forEach((segment) => {
        if (segment.length > 1) group.append(svgNode('polyline', { points: segment.map((point) => `${point.x},${point.y}`).join(' '), fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' }));
        segment.forEach((point) => {
          const label = `${recordLabel(point.record)}: ${entry.name} ${point.score.toFixed(1)} out of 10${point.record.current ? ', current assessment' : ''}`;
          const circle = svgNode('circle', { cx: point.x, cy: point.y, r: point.record.current ? 5.5 : 4, fill: 'white', stroke: 'currentColor', 'stroke-width': 2.5, tabindex: 0, 'aria-label': label });
          circle.append(svgNode('title', {}, label));
          group.append(circle);
        });
      });
      svg.append(group);
    });
    container.append(svg);
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
    const score = node('span', '', domain.score.toFixed(1));
    const change = node('span', 'progress-domain-change', domain.delta === null ? 'No previous comparison' : `(${signedChange(domain.delta)})`);
    change.dataset.direction = changeDirection(domain.delta);
    row.append(label, score, change);
    get('latest-domain-scores').append(row);
  });
}
