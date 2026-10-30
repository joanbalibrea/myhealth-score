import { assessmentUrl, setupAvatar } from './assessment.js';

function read(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function save(key, value) {
  try {
    // A missing key is unanswered; prefer_not_to_say is an explicit answer.
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    document.querySelector('#mental-storage-status').textContent = 'Your browser could not save these answers for this session. You can still continue.';
  }
}

// Each group has one answer. Clicking it again clears the answer.
document.querySelectorAll('[data-mental-group]').forEach((group) => {
  const key = group.dataset.mentalGroup;
  const buttons = [...group.querySelectorAll('[data-value]')];
  const stored = read(key);
  let selected = buttons.some((button) => button.dataset.value === stored) ? stored : null;

  function render() {
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.value === selected));
    });
  }

  buttons.forEach((button) => button.addEventListener('click', () => {
    selected = selected === button.dataset.value ? null : button.dataset.value;
    save(key, selected);
    render();
  }));
  render();
});

setupAvatar();
document.querySelectorAll('[data-mental-back]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = assessmentUrl('sleep.html'); });
});
document.querySelector('#mental-form').addEventListener('submit', (event) => {
  event.preventDefault();
  window.location.href = assessmentUrl('lifestyle-habits.html');
});
