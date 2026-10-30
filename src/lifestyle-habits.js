import { assessmentUrl, setupAvatar } from './assessment.js';

function read(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function save(key, value) {
  try {
    // Missing keys mean unanswered. '0' and prefer_not_to_say are real answers.
    if (value === null || value === '') sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(value));
  } catch {
    document.querySelector('#lifestyle-storage-status').textContent = 'Your browser could not save these answers for this session. You can still continue.';
  }
}

const selections = {};
const groups = {};
const yearControls = {};
const substanceName = document.querySelector('#substance-name');

// A selection can be cleared by clicking the same option again.
document.querySelectorAll('[data-lifestyle-group]').forEach((group) => {
  const key = group.dataset.lifestyleGroup;
  const buttons = [...group.querySelectorAll('[data-value]')];
  const stored = read(key);
  selections[key] = buttons.some((button) => button.dataset.value === stored) ? stored : null;
  function render() {
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === selections[key])));
  }
  groups[key] = {
    clear() {
      selections[key] = null;
      save(key, null);
      render();
    },
  };
  buttons.forEach((button) => button.addEventListener('click', () => {
    selections[key] = selections[key] === button.dataset.value ? null : button.dataset.value;
    save(key, selections[key]);
    render();
    if (key === 'myhealth_smoking_status' || key === 'myhealth_other_substances') updateConditionals(true);
  }));
  render();
});

const age = Number(read('myhealth_age'));
const maximumYears = Number.isFinite(age) && age >= 0.1 && age <= 120 ? Math.floor(age * 10) / 10 : 100;
document.querySelectorAll('[data-years-control]').forEach((control) => {
  const key = control.dataset.yearsControl;
  const slider = control.querySelector('input');
  const output = control.querySelector('output');
  const clear = control.querySelector('[data-clear-years]');
  slider.max = maximumYears;
  control.querySelector('[data-age-limit]').textContent = `${maximumYears.toFixed(1)} years`;
  const stored = read(key);
  const value = stored === null || stored.trim() === '' ? NaN : Number(stored);
  let answered = Number.isFinite(value) && value >= 0.1 && value <= maximumYears && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
  if (answered) slider.value = value;

  function render() {
    output.value = answered ? slider.valueAsNumber.toFixed(1) : '—';
    slider.setAttribute('aria-valuetext', answered ? `${slider.valueAsNumber.toFixed(1)} ${control.dataset.suffix}` : 'Unanswered');
    clear.hidden = !answered;
  }
  function answer() {
    answered = true;
    save(key, slider.valueAsNumber);
    render();
  }
  function reset() {
    answered = false;
    slider.value = '0.1';
    save(key, null);
    render();
  }
  yearControls[key] = { clear: reset };
  slider.addEventListener('input', answer);
  slider.addEventListener('pointerup', answer);
  slider.addEventListener('keyup', (event) => {
    if (['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.key)) answer();
  });
  clear.addEventListener('click', reset);
  render();
});

// Remove inapplicable detail answers when the parent answer changes.
function updateConditionals(clearHidden) {
  const smoking = selections.myhealth_smoking_status;
  const substanceUse = selections.myhealth_other_substances === 'yes';
  const panels = [
    [document.querySelector('#former-fields'), smoking === 'former'],
    [document.querySelector('#current-fields'), smoking === 'current'],
    [document.querySelector('#substance-fields'), substanceUse],
  ];
  panels.forEach(([panel, visible]) => {
    panel.hidden = !visible;
    panel.querySelectorAll('input, button').forEach((input) => { input.disabled = !visible; });
  });
  if (!clearHidden) return;
  if (smoking !== 'former') yearControls.myhealth_years_since_quit.clear();
  if (smoking !== 'current') {
    yearControls.myhealth_smoking_years.clear();
    groups.myhealth_cigarettes_day.clear();
  }
  if (!substanceUse) {
    substanceName.value = '';
    save('myhealth_substance_name', null);
    groups.myhealth_substance_frequency.clear();
  }
}
substanceName.value = read('myhealth_substance_name') || '';
substanceName.addEventListener('input', () => save('myhealth_substance_name', substanceName.value.trim()));
updateConditionals(false);
setupAvatar();
document.querySelectorAll('[data-lifestyle-back]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = assessmentUrl('mental-health.html'); });
});
document.querySelector('#lifestyle-form').addEventListener('submit', (event) => {
  event.preventDefault();
  window.location.href = assessmentUrl('optional-health-data.html');
});
