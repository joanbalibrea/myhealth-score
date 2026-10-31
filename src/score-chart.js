import { chartSegments } from './progress-data.js';
const ns = 'http://www.w3.org/2000/svg';
function svgNode(tag, attributes = {}, text) {
  const el = document.createElementNS(ns, tag);
  Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
  if (text !== undefined) el.textContent = text;
  return el;
}
// Measure actual rendered font widths, including long names without spaces.
export function wrapChartLabel(label, measure, maxWidth = 120) {
  const text = String(label).trim().replace(/\s+/g, ' ');
  if (measure(text) <= maxWidth) return [text];
  const lines = [];
  let rest = text;
  for (let line = 0; line < 2 && rest; line++) {
    let length = 0;
    while (length < rest.length && measure(rest.slice(0, length + 1)) <= maxWidth) length++;
    length = Math.max(1, length);
    if (length < rest.length && line === 0) {
      const space = rest.lastIndexOf(' ', length);
      if (space > 0) length = space;
    }
    let chunk = rest.slice(0, length).trim();
    rest = rest.slice(length).trim();
    if (line === 1 && rest) {
      while (chunk.length && measure(chunk + '…') > maxWidth) chunk = chunk.slice(0, -1);
      chunk = chunk.trimEnd() + '…';
    }
    lines.push(chunk);
  }
  return lines;
}
function curve(points) {
  let d = `M ${points[0].x} ${points[0].y}`;
  points.slice(1).forEach((point, i) => {
    const previous = points[i];
    const third = (point.x - previous.x) / 3;
    // Horizontal tangents interpolate smoothly without overshooting real scores.
    d += ` C ${previous.x + third} ${previous.y}, ${point.x - third} ${point.y}, ${point.x} ${point.y}`;
  });
  return d;
}
let chartId = 0;
export function renderScoreChart(container, records, series, labelFor, name, overall = false) {
  container.replaceChildren();
  const width = Math.max(440, records.length * 144);
  const padding = 48;
  const svg = svgNode('svg', { viewBox: `0 0 ${width + padding * 2} 296`, role: 'img', 'aria-label': name, class: 'mhs-chart' });
  svg.style.minWidth = `${width + padding * 2}px`;
  svg.append(svgNode('title', {}, name), svgNode('desc', {}, 'Scores range from zero to ten. Missing measurements leave gaps. Recording labels are centered beneath their points; full names are available in tooltips.'));
  const plot = svgNode('g', { transform: `translate(${padding} 0)` });
  svg.append(plot);
  for (let score = 0; score <= 10; score += 2) {
    const y = 210 - score * 18;
    plot.append(svgNode('line', { x1: 38, x2: width - 18, y1: y, y2: y, class: 'progress-grid-line' }), svgNode('text', { x: 24, y: y + 4, 'text-anchor': 'end', class: 'progress-axis-label' }, score));
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `11px ${getComputedStyle(container).fontFamily}`;
  const measure = text => context.measureText(text).width;
  records.forEach((record, index) => {
    const x = records.length === 1 ? (38 + width - 18) / 2 : 38 + index * (width - 56) / (records.length - 1);
    const label = labelFor(record);
    const text = svgNode('text', { x, y: 245, 'text-anchor': 'middle', class: 'progress-axis-label mhs-chart-recording' });
    wrapChartLabel(label, measure).forEach((line, i) => text.append(svgNode('tspan', { x, dy: i ? 16 : 0 }, line)));
    text.append(svgNode('title', {}, label));
    plot.append(text);
    if (record.current) plot.append(svgNode('text', { x, y: 284, 'text-anchor': 'middle', class: 'progress-current-label' }, 'CURRENT'));
  });
  series.forEach(entry => {
    const group = svgNode('g', { 'data-series-id': entry.id, style: `color: ${entry.color}` });
    const segments = chartSegments(records, entry.select, width);
    if (overall) {
      const gradientId = `score-fill-${++chartId}`;
      const defs = svgNode('defs');
      const gradient = svgNode('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 });
      gradient.append(svgNode('stop', { offset: '0%', 'stop-color': entry.color, 'stop-opacity': .16 }), svgNode('stop', { offset: '100%', 'stop-color': entry.color, 'stop-opacity': 0 }));
      defs.append(gradient); svg.prepend(defs);
      segments.filter(segment => segment.length > 1).forEach(segment => group.append(svgNode('path', { d: `${curve(segment)} L ${segment.at(-1).x} 210 L ${segment[0].x} 210 Z`, fill: `url(#${gradientId})` })));
    }
    segments.forEach(segment => {
      if (segment.length > 1) group.append(svgNode('path', { d: curve(segment), fill: 'none', stroke: 'currentColor', 'stroke-width': overall ? 3 : 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      segment.forEach(point => {
        const latest = point.index === records.length - 1;
        if (overall && latest) group.append(svgNode('circle', { cx: point.x, cy: point.y, r: 10, fill: 'currentColor', opacity: .12 }));
        const label = `${labelFor(point.record)}: ${entry.name} ${point.score.toFixed(1)} out of 10${point.record.current ? ', current assessment' : ''}`;
        const circle = svgNode('circle', { cx: point.x, cy: point.y, r: overall ? latest ? 5.5 : 4 : 3, fill: overall && latest ? 'currentColor' : 'white', stroke: 'currentColor', 'stroke-width': 2, tabindex: 0, 'aria-label': label });
        circle.append(svgNode('title', {}, label)); group.append(circle);
        if (overall) group.append(svgNode('text', { x: point.x, y: point.y - 17, 'text-anchor': 'middle', class: 'mhs-chart-value' }, point.score.toFixed(1)));
      });
    });
    plot.append(group);
  });
  container.append(svg);
}
