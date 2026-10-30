import { assessmentMode, setupAvatar } from './assessment.js';
import { readProfile, saveProfile } from './profile.js';
import { getCurrentUser, updateCurrentUser } from './accounts.js';
const get = (id) => document.getElementById(id);
if (assessmentMode === 'quick') {
  get('settings-quick-message').hidden = false;
  get('settings-back').href = 'login.html';
  get('settings-back').textContent = 'Back to Login';
} else if (!await getCurrentUser()) {
  window.location.replace('login.html');
} else {
  get('settings-main').hidden = false;
  setupAvatar();
  const user = await getCurrentUser();
  get('display-name').value = user.user_metadata?.username || '';
  get('profile-email').value = user.email;
  get('settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await updateCurrentUser({ username: get('display-name').value, email: get('profile-email').value });
      get('profile-status').textContent = get('profile-email').value.trim() !== user.email ? 'Profile updated. Check your email to confirm the email change.' : 'Profile updated.';
    } catch (error) { get('profile-status').textContent = error.message || 'Profile changes could not be saved.'; }
  });
  get('choose-profile-image').addEventListener('click', () => get('avatar-input').click());
  get('remove-profile-image').addEventListener('click', async () => {
    try {
      const currentUser = await getCurrentUser();
      saveProfile(localStorage, { ...readProfile(localStorage, currentUser), avatar: '' }, currentUser);
      get('avatar-preview').hidden = true;
      get('default-avatar').removeAttribute('hidden');
      get('profile-status').textContent = 'Default avatar selected.';
    } catch { get('profile-status').textContent = 'Profile changes could not be saved.'; }
  });
}
