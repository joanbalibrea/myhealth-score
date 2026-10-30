import { assessmentUrl, setupAvatar } from './assessment.js';

const stepsInput = document.querySelector('#steps-input');
const stepsDisplay = document.querySelector('#steps-display');
const stepsStatus = document.querySelector('#steps-status');
const metric = document.querySelector('.activity-metric');
const clearSteps = document.querySelector('#clear-steps');
const sportInput = document.querySelector('#sport-input');
const otherInput = document.querySelector('#other-sport-input');
const otherField = document.querySelector('#other-sport-field');

function read(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function save(key, value) {
  try {
    // Missing answers have no key; the string '0' is a genuine answer.
    if (value === null || value === '') sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(value));
  } catch {
    document.querySelector('#activity-storage-status').textContent = 'Your browser could not save these answers for this session. You can still continue.';
  }
}

function activityBand(steps) {
  if (steps < 35000) return ['Sedentary', 'sedentary'];
  if (steps < 52500) return ['Low active', 'low'];
  if (steps < 70000) return ['Somewhat active', 'somewhat'];
  if (steps < 87500) return ['Active', 'active'];
  return ['Highly active', 'high'];
}

function showSteps(steps) {
  const answered = steps !== null;
  const [label, tone] = answered ? activityBand(steps) : ['Move the slider to answer', 'unanswered'];
  stepsDisplay.value = answered ? steps.toLocaleString('en-US') : '—';
  stepsStatus.textContent = label;
  metric.dataset.tone = tone;
  stepsInput.value = answered ? steps : 0;
  stepsInput.setAttribute('aria-valuetext', answered ? `${steps.toLocaleString('en-US')} steps per week, ${label}` : 'Unanswered');
  clearSteps.hidden = !answered;
}

function answerSteps() {
  const steps = stepsInput.valueAsNumber;
  showSteps(steps);
  save('myhealth_steps_week', steps);
}
stepsInput.addEventListener('input', answerSteps);
// A click at the minimum is an explicit zero, even if the thumb did not move.
stepsInput.addEventListener('pointerup', answerSteps);
stepsInput.addEventListener('keydown', (event) => {
  if (['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.key)) {
    // The input event handles changes; keyup also captures Home at the minimum.
    stepsInput.addEventListener('keyup', answerSteps, { once: true });
  }
});
clearSteps.addEventListener('click', () => {
  showSteps(null);
  save('myhealth_steps_week', null);
});

function setupChoices(selector, attribute, key) {
  const buttons = [...document.querySelectorAll(selector)];
  let selected = read(key);
  function render() {
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === selected)));
  }
  buttons.forEach((button) => button.addEventListener('click', () => {
    const value = button.getAttribute(attribute);
    selected = selected === value ? null : value;
    render();
    save(key, selected);
  }));
  render();
}
setupChoices('[data-days]', 'data-days', 'myhealth_active_days');
setupChoices('[data-intensity]', 'data-intensity', 'myhealth_activity_intensity');

function showOther() {
  otherField.hidden = sportInput.value !== 'Other';
  otherInput.disabled = otherField.hidden;
}
sportInput.addEventListener('change', () => {
  save('myhealth_main_sport', sportInput.value);
  showOther();
  if (otherField.hidden) {
    otherInput.value = '';
    save('myhealth_other_sport', null);
  }
});
otherInput.addEventListener('input', () => save('myhealth_other_sport', otherInput.value.trim()));

const storedSteps = read('myhealth_steps_week');
const steps = storedSteps === null || storedSteps.trim() === '' ? null : Number(storedSteps);
showSteps(steps !== null && Number.isFinite(steps) && steps >= 0 && steps <= 140000 ? steps : null);
const storedSport = read('myhealth_main_sport');
if ([...sportInput.options].some((option) => option.value === storedSport)) sportInput.value = storedSport;
if (sportInput.value === 'Other') otherInput.value = read('myhealth_other_sport') || '';
showOther();
setupAvatar();

document.querySelectorAll('[data-activity-back]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = assessmentUrl('body-composition.html'); });
});
document.querySelector('#activity-form').addEventListener('submit', (event) => {
  event.preventDefault();
  window.location.href = assessmentUrl('diet.html');
});
