import { assessmentMode, setupAvatar } from './assessment.js';
import { readProfile, saveProfile } from './profile.js';
const get = (id) => document.getElementById(id);
if (assessmentMode === 'quick') {
  get('settings-quick-message').hidden = false;
  get('settings-back').href = 'login.html';
  get('settings-back').textContent = 'Back to Login';
} else {
  get('settings-main').hidden = false;
  setupAvatar();
  try { get('display-name').value = readProfile(localStorage).name; } catch { /* Empty fallback. */ }
  get('settings-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      saveProfile(localStorage, { ...readProfile(localStorage), name: get('display-name').value });
      get('profile-status').textContent = 'Display name updated.';
    } catch { get('profile-status').textContent = 'Profile changes could not be saved. Please allow browser storage.'; }
  });
  get('choose-profile-image').addEventListener('click', () => get('avatar-input').click());
  get('remove-profile-image').addEventListener('click', () => {
    try {
      saveProfile(localStorage, { ...readProfile(localStorage), avatar: '' });
      get('avatar-preview').hidden = true;
      get('default-avatar').removeAttribute('hidden');
      get('profile-status').textContent = 'Default avatar selected.';
    } catch { get('profile-status').textContent = 'Profile changes could not be saved.'; }
  });
}
