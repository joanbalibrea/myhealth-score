import { assessmentUrl, setupAvatar } from './assessment.js';

const form = document.querySelector('#profile-form');
const ageDisplay = document.querySelector('#age-display');
const decrease = document.querySelector('#decrement-age');
const increase = document.querySelector('#increment-age');
const continueButton = document.querySelector('#profile-continue');
const error = document.querySelector('#profile-error');
let age = 34;
let sex = '';

// Each new recording starts with age 34 and no sex selected.
function saveProfile() {
  try {
    sessionStorage.setItem('myhealth_age', String(age));
    if (sex) sessionStorage.setItem('myhealth_sex', sex);
    else sessionStorage.removeItem('myhealth_sex');
    return true;
  } catch {
    error.textContent = 'Please allow session storage in your browser before continuing.';
    return false;
  }
}

function isComplete() {
  return Number.isInteger(age) && age >= 18 && age <= 100 && (sex === 'female' || sex === 'male');
}

function updateProfile() {
  ageDisplay.value = String(age);
  decrease.disabled = age <= 18;
  increase.disabled = age >= 100;
  continueButton.setAttribute('aria-disabled', String(!isComplete()));
  error.textContent = '';
  saveProfile();
}

decrease.addEventListener('click', () => {
  age = Math.max(18, age - 1);
  updateProfile();
});
increase.addEventListener('click', () => {
  age = Math.min(100, age + 1);
  updateProfile();
});
form.querySelectorAll('input[name="sex"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    sex = radio.value;
    updateProfile();
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isComplete()) {
    error.textContent = 'Please complete all required information before continuing.';
    return;
  }
  if (saveProfile()) window.location.href = assessmentUrl('body-composition.html');
});

document.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'login.html';
  });
});

setupAvatar();

updateProfile();
