import { assessmentUrl, setupAvatar } from './assessment.js';

const inputs = [...document.querySelectorAll('[data-vitals-key]')];

function read(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function saveInput(input) {
  const value = input.valueAsNumber;
  try {
    // Empty or invalid values have no key; an explicitly entered zero is saved.
    if (input.value === '' || !Number.isFinite(value) || value < 0) {
      sessionStorage.removeItem(input.dataset.vitalsKey);
    } else {
      sessionStorage.setItem(input.dataset.vitalsKey, String(value));
    }
  } catch {
    document.querySelector('#vitals-storage-status').textContent = 'Your browser could not save these answers for this session. You can still continue.';
  }
}

inputs.forEach((input) => {
  const stored = read(input.dataset.vitalsKey);
  if (stored !== null && stored.trim() !== '' && Number.isFinite(Number(stored)) && Number(stored) >= 0) {
    input.value = stored;
  }
  input.addEventListener('input', () => saveInput(input));
});

setupAvatar();
document.querySelectorAll('[data-vitals-back]').forEach((button) => {
  button.addEventListener('click', () => {
    inputs.forEach(saveInput);
    window.location.href = assessmentUrl('lifestyle-habits.html');
  });
});
document.querySelector('#vitals-form').addEventListener('submit', (event) => {
  event.preventDefault();
  inputs.forEach(saveInput);
  // Results will use the existing assessment data; no score is computed here.
  window.location.href = assessmentUrl('results.html');
});
