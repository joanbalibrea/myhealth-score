import { assessmentUrl, setupAvatar } from './assessment.js';

function read(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function save(key, value) {
  try {
    // Missing means unanswered. Zero is saved as a real answer.
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(value));
  } catch {
    document.querySelector('#sleep-storage-status').textContent = 'Your browser could not save these answers for this session. You can still continue.';
  }
}

// Each slider and its buttons share one value and one answered state.
document.querySelectorAll('[data-sleep-control]').forEach((card) => {
  const key = card.dataset.sleepControl;
  const slider = card.querySelector('input[type="range"]');
  const output = card.querySelector('[data-hours-display]');
  const status = card.querySelector('[data-answer-state]');
  const clear = card.querySelector('[data-clear]');
  const minimum = Number(slider.min);
  const maximum = Number(slider.max);
  const step = Number(slider.step);
  const initial = slider.valueAsNumber;
  const stored = read(key);
  const restored = stored === null || stored.trim() === '' ? NaN : Number(stored);
  // Allow tiny floating-point differences when checking decimal increments.
  const restoredSteps = (restored - minimum) / step;
  let answered = Number.isFinite(restored) && restored >= minimum && restored <= maximum && Math.abs(restoredSteps - Math.round(restoredSteps)) < 1e-8;
  if (answered) slider.value = restored;

  function render() {
    const value = slider.valueAsNumber;
    output.value = String(value);
    status.textContent = answered ? '' : 'Not answered yet';
    status.hidden = answered;
    clear.hidden = !answered;
    card.dataset.answered = String(answered);
    slider.setAttribute('aria-valuetext', answered ? `${value} hours` : `Unanswered; preview ${value} hours`);
    if (card.classList.contains('sleep-phone')) {
      const colors = ['#397551', '#65792e', '#946f22', '#ae602b', '#a34e50'];
      card.style.setProperty('--phone-color', answered ? colors[Math.round(value / maximum * 4)] : '#756582');
    }
  }

  function answer() {
    answered = true;
    save(key, slider.valueAsNumber);
    render();
  }
  slider.addEventListener('input', answer);
  // Clicking a thumb already at zero still explicitly answers zero.
  slider.addEventListener('pointerup', answer);
  slider.addEventListener('keyup', (event) => {
    if (['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.key)) answer();
  });
  card.querySelectorAll('[data-adjust]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = Number((slider.valueAsNumber + Number(button.dataset.adjust) * step).toFixed(1));
      slider.value = Math.min(maximum, Math.max(minimum, next));
      answer();
    });
  });
  clear.addEventListener('click', () => {
    answered = false;
    slider.value = initial;
    save(key, null);
    render();
  });
  render();
});

const qualityButtons = [...document.querySelectorAll('[data-quality]')];
let quality = read('myhealth_sleep_quality');
function renderQuality() {
  qualityButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.quality === quality)));
}
qualityButtons.forEach((button) => button.addEventListener('click', () => {
  quality = quality === button.dataset.quality ? null : button.dataset.quality;
  save('myhealth_sleep_quality', quality);
  renderQuality();
}));
renderQuality();
setupAvatar();
document.querySelectorAll('[data-sleep-back]').forEach((button) => {
  button.addEventListener('click', () => { window.location.href = assessmentUrl('diet.html'); });
});
document.querySelector('#sleep-form').addEventListener('submit', (event) => {
  event.preventDefault();
  window.location.href = assessmentUrl('mental-health.html');
});
