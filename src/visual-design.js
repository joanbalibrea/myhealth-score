import { uiIcon } from './ui-icons.js';
const file = location.pathname.split('/').pop();
const themes = {
  'basic-profile.html': ['profile', 'Your starting point'],
  'body-composition.html': ['scale', 'Understand your dimensions'],
  'physical-activity.html': ['activity', 'Movement that matters'],
  'diet.html': ['diet', 'Nourish your everyday'],
  'sleep.html': ['sleep', 'Make room for recovery'],
  'mental-health.html': ['mental', 'A moment to check in'],
  'lifestyle-habits.html': ['lifestyle', 'Small habits, lasting impact'],
  'optional-health-data.html': ['vitals', 'Listen to your heart'],
  'scores-and-recommendations.html': ['vitals', 'Your health profile'],
  'progress.html': ['progress', 'Your journey, over time'],
};
const theme = themes[file];
if (theme) {
  const intro = document.querySelector('.assessment-intro');
  if (intro) {
    intro.classList.add('ui-hero');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'ui-eyebrow';
    eyebrow.append(uiIcon(theme[0]), theme[1]);
    intro.prepend(eyebrow);
    const art = document.createElement('div');
    art.className = 'ui-illustration';
    art.setAttribute('aria-hidden', 'true');
    art.append(uiIcon(theme[0]));
    intro.append(art);
  }
}
const headings = { age: 'calendar', sex: 'identity', height: 'ruler', weight: 'scale', waist: 'tape', synthesis: 'synthesis', movement: 'activity', frequency: 'calendar', intensity: 'intensity', sport: 'sport', calorie: 'flame', fruit: 'leaf', drinks: 'drink', processed: 'meal', duration: 'sleep', quality: 'calm', phone: 'phone', nap: 'clock', stress: 'calm', mood: 'sun', anxiety: 'mental', support: 'support', tobacco: 'tobacco', alcohol: 'alcohol', caffeine: 'coffee', substances: 'substances', resting: 'vitals', pressure: 'pressure' };
Object.entries(headings).forEach(([id, name]) => {
  const heading = document.getElementById(`${id}-heading`);
  if (!heading) return;
  let wrapper = heading.querySelector('.assessment-section-icon, .mental-section-dot, .lifestyle-section-dot');
  if (!wrapper) { wrapper = document.createElement('span'); heading.prepend(wrapper); }
  wrapper.className = 'assessment-section-icon';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.replaceChildren(uiIcon(name));
});
document.querySelectorAll('.activity-option-icon').forEach((el, i) => el.replaceChildren(uiIcon(['leaf','activity','intensity'][i])));
document.querySelectorAll('.mental-mood-icon').forEach((el, i) => el.replaceChildren(uiIcon(['sun','calm','cloud','sleep'][i])));
for (const [key, names] of Object.entries({ sugary_drinks: ['water','drink','drink','drink'], processed_meals: ['plate','meal','meal','meal'] })) {
  document.querySelectorAll(`[data-diet-group="myhealth_${key}"] .diet-tile-top > span:first-child`).forEach((el, i) => { el.replaceChildren(uiIcon(names[i])); el.classList.add('ui-option-icon'); });
}
document.querySelectorAll('.sleep-rating-number').forEach((el, index) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 13q2 2 4 0m6 0q2 2 4 0M11 21q5 ${4-index*2} 10 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;
  el.replaceChildren(svg);
});
for (const [selector, name] of [['.dashboard-user-actions a','settings'], ['#dashboard-exit','exit'], ['#recordings-heading','history'], ['#recommendations-link','alerts'], ['#progress-link','progress']]) {
  const element = document.querySelector(selector);
  if (element) element.prepend(uiIcon(name));
}
