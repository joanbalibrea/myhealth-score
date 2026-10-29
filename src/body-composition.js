import { assessmentUrl, setupAvatar } from './assessment.js';

const form = document.querySelector('#body-form');
const heightInput = document.querySelector('#height-input');
const feetInput = document.querySelector('#height-feet');
const inchesInput = document.querySelector('#height-inches');
const weightInput = document.querySelector('#weight-input');
const waistInput = document.querySelector('#waist-input');
const error = document.querySelector('#body-error');
const continueButton = document.querySelector('#body-continue');
let heightUnit = 'cm';
let weightUnit = 'kg';
let heightCm = NaN;
let weightKg = NaN;
let waistCm = NaN;

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validHeight() {
  return inRange(heightCm, 50, 300);
}

function validWeight() {
  return inRange(weightKg, 10, 700);
}

function validWaist() {
  return inRange(waistCm, 30, 300);
}

function complete() {
  return validHeight() && validWeight() && validWaist();
}

function bmiStatus(value) {
  if (value < 16) return ['Very low', 'extreme'];
  if (value < 18.5) return ['Low', 'caution'];
  if (value < 25) return ['Optimal', 'optimal'];
  if (value < 30) return ['Mid', 'mid'];
  if (value < 35) return ['High', 'caution'];
  return ['Very high', 'extreme'];
}

function wthrStatus(value) {
  if (value < 0.4) return ['Very low', 'extreme'];
  if (value < 0.5) return ['Optimal', 'optimal'];
  if (value < 0.6) return ['Mid', 'mid'];
  if (value < 0.7) return ['High', 'caution'];
  return ['Very high', 'extreme'];
}

function showResult(name, value, places, interpret) {
  const output = document.querySelector(`#calculated-${name}`);
  const badge = document.querySelector(`#${name}-status`);
  const [label, tone] = Number.isFinite(value) ? interpret(value) : ['Pending', 'pending'];
  output.value = Number.isFinite(value) ? value.toFixed(places) : '—';
  badge.textContent = label;
  badge.dataset.tone = tone;
}

function saveValue(key, value) {
  if (Number.isFinite(value)) sessionStorage.setItem(key, String(value));
  else sessionStorage.removeItem(key);
}

function update() {
  const bmi = validHeight() && validWeight() ? weightKg / (heightCm / 100) ** 2 : NaN;
  const wthr = validHeight() && validWaist() ? waistCm / heightCm : NaN;
  showResult('bmi', bmi, 1, bmiStatus);
  showResult('wthr', wthr, 2, wthrStatus);
  continueButton.setAttribute('aria-disabled', String(!complete()));
  error.textContent = '';
  try {
    // Measurements always use cm and kg in storage; unit keys record display preferences.
    saveValue('myhealth_height', validHeight() ? heightCm : NaN);
    saveValue('myhealth_weight', validWeight() ? weightKg : NaN);
    saveValue('myhealth_waist', validWaist() ? waistCm : NaN);
    sessionStorage.setItem('myhealth_height_unit', heightUnit);
    sessionStorage.setItem('myhealth_weight_unit', weightUnit);
    sessionStorage.setItem('myhealth_waist_unit', 'cm');
    saveValue('myhealth_bmi', bmi);
    saveValue('myhealth_wthr', wthr);
    return true;
  } catch {
    error.textContent = 'Please allow session storage in your browser before continuing.';
    return false;
  }
}

function displayNumber(value) {
  return Number.isFinite(value) ? String(Number(value.toFixed(4))) : '';
}

function displayHeight() {
  const metric = heightUnit === 'cm';
  document.querySelector('#height-cm-field').hidden = !metric;
  document.querySelector('#height-imperial-fields').hidden = metric;
  heightInput.disabled = !metric;
  feetInput.disabled = metric;
  inchesInput.disabled = metric;
  feetInput.required = !metric;
  inchesInput.required = !metric;
  heightInput.value = displayNumber(heightCm);
  // Separate feet and inches avoid interpreting 5 ft 10 in as 5.10 feet.
  const totalInches = Number.isFinite(heightCm) ? Number((heightCm / 2.54).toFixed(4)) : NaN;
  feetInput.value = Number.isFinite(totalInches) ? Math.floor(totalInches / 12) : '';
  inchesInput.value = Number.isFinite(totalInches) ? displayNumber(totalInches % 12) : '';
  document.querySelectorAll('[data-height-unit]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.heightUnit === heightUnit));
  });
}

function displayWeight() {
  weightInput.value = displayNumber(weightUnit === 'kg' ? weightKg : weightKg / 0.45359237);
  weightInput.min = weightUnit === 'kg' ? '10' : String(10 / 0.45359237);
  weightInput.max = weightUnit === 'kg' ? '700' : String(700 / 0.45359237);
  weightInput.setAttribute('aria-label', weightUnit === 'kg' ? 'Weight in kilograms' : 'Weight in pounds');
  document.querySelector('#weight-unit-label').textContent = weightUnit;
  document.querySelectorAll('[data-weight-unit]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.weightUnit === weightUnit));
  });
}

heightInput.addEventListener('input', () => {
  heightCm = heightInput.valueAsNumber;
  update();
});
[feetInput, inchesInput].forEach((input) => {
  input.addEventListener('input', () => {
    const feet = feetInput.valueAsNumber;
    const inches = inchesInput.valueAsNumber;
    const valid = Number.isInteger(feet) && inRange(feet, 1, 9) && inRange(inches, 0, 11.999);
    heightCm = valid ? (feet * 12 + inches) * 2.54 : NaN;
    update();
  });
});
weightInput.addEventListener('input', () => {
  weightKg = weightInput.valueAsNumber * (weightUnit === 'kg' ? 1 : 0.45359237);
  update();
});
waistInput.addEventListener('input', () => {
  waistCm = waistInput.valueAsNumber;
  update();
});
document.querySelectorAll('[data-height-unit]').forEach((button) => {
  button.addEventListener('click', () => {
    heightUnit = button.dataset.heightUnit;
    displayHeight();
    update();
  });
});
document.querySelectorAll('[data-weight-unit]').forEach((button) => {
  button.addEventListener('click', () => {
    weightUnit = button.dataset.weightUnit;
    displayWeight();
    update();
  });
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!complete()) {
    error.textContent = 'Please complete all required body composition fields before continuing.';
    return;
  }
  if (update()) window.location.href = assessmentUrl('physical-activity.html');
});
document.querySelectorAll('[data-profile-back]').forEach((button) => {
  button.addEventListener('click', () => {
    window.location.href = assessmentUrl('basic-profile.html');
  });
});

// Restore this step when the user returns during the same browser session.
try {
  heightCm = parseFloat(sessionStorage.getItem('myhealth_height'));
  weightKg = parseFloat(sessionStorage.getItem('myhealth_weight'));
  waistCm = parseFloat(sessionStorage.getItem('myhealth_waist'));
  if (sessionStorage.getItem('myhealth_height_unit') === 'ft-in') heightUnit = 'ft-in';
  if (sessionStorage.getItem('myhealth_weight_unit') === 'lbs') weightUnit = 'lbs';
} catch {
  // update() below provides an inline message if storage is unavailable.
}
displayHeight();
displayWeight();
waistInput.value = displayNumber(waistCm);
setupAvatar();
update();
