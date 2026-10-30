import { assessmentUrl, setupAvatar } from './assessment.js';

const exactInput = document.querySelector('#calorie-exact');
const calorieGroup = document.querySelector('[data-diet-group="myhealth_calorie_range"]');
const calorieButtons = [...calorieGroup.querySelectorAll('[data-value]')];

function read(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function save(key, value) {
  try {
    // Absent keys mean unanswered; a genuine zero remains an answer.
    if (value === null || value === '') sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(value));
  } catch {
    document.querySelector('#diet-storage-status').textContent = 'Your browser could not save these answers for this session. You can still continue.';
  }
}

function select(buttons, value) {
  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.value === value));
  });
}

// Single-choice answers may be cleared by clicking the selected option again.
document.querySelectorAll('[data-diet-group]').forEach((group) => {
  const key = group.dataset.dietGroup;
  const buttons = [...group.querySelectorAll('[data-value]')];
  select(buttons, read(key));
  buttons.forEach((button) => button.addEventListener('click', () => {
    const value = button.getAttribute('aria-pressed') === 'true' ? null : button.dataset.value;
    select(buttons, value);
    save(key, value);
    if (group === calorieGroup) {
      exactInput.value = '';
      save('myhealth_calories_exact', null);
    }
  }));
});

const storedExact = read('myhealth_calories_exact');
if (storedExact !== null && storedExact.trim() !== '' && Number.isInteger(Number(storedExact)) && Number(storedExact) >= 0) {
  exactInput.value = storedExact;
  select(calorieButtons, null);
}
exactInput.addEventListener('input', () => {
  select(calorieButtons, null);
  save('myhealth_calorie_range', null);
  const value = exactInput.valueAsNumber;
  save('myhealth_calories_exact', Number.isInteger(value) && value >= 0 ? value : null);
});
document.querySelector('#skip-calories').addEventListener('click', () => {
  exactInput.value = '';
  select(calorieButtons, null);
  save('myhealth_calorie_range', null);
  save('myhealth_calories_exact', null);
});

document.querySelectorAll('[data-diet-back]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = assessmentUrl('physical-activity.html'); });
});
document.querySelector('#diet-form').addEventListener('submit', (event) => {
  event.preventDefault();
  window.location.href = assessmentUrl('sleep.html');
});
setupAvatar();
