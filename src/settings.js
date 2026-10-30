import { assessmentMode, setupAvatar } from './assessment.js';
import { readProfile, saveProfile } from './profile.js';
import { getCurrentUser, updateCurrentUser } from './accounts.js';
const get = (id) => document.getElementById(id);
if (assessmentMode === 'quick') {
  get('settings-quick-message').hidden = false;
  get('settings-back').href = 'login.html';
  get('settings-back').textContent = 'Back to Login';
} else if (!getCurrentUser()) {
  window.location.replace('login.html');
} else {
  get('settings-main').hidden = false;
  setupAvatar();
  const user = getCurrentUser();
  get('display-name').value = user.username;
  get('profile-email').value = user.email;
  get('settings-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      updateCurrentUser({ username: get('display-name').value, email: get('profile-email').value });
      get('profile-status').textContent = 'Profile updated.';
    } catch (error) { get('profile-status').textContent = error.message || 'Profile changes could not be saved.'; }
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
