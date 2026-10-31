import { assessmentMode, setupAvatar, renderAvatar } from './assessment.js';
import { getProfile, updateUsername, removeAvatar } from './database.js';
import { getCurrentUser, changeEmail, changePassword } from './accounts.js';
const get = (id) => document.getElementById(id);
if (assessmentMode === 'quick') {
  get('settings-quick-message').hidden = false;
  get('settings-back').href = 'login.html';
  get('settings-back').textContent = 'Back to Login';
} else {
  const user = await getCurrentUser();
  if (!user) window.location.replace('login.html');
  else {
    get('settings-main').hidden = false;
    setupAvatar();
    get('profile-email').value = user.email || '';
    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = get(button.dataset.passwordToggle);
        const visible = input.type === 'password';
        input.type = visible ? 'text' : 'password';
        button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
        button.setAttribute('aria-pressed', String(visible));
        button.querySelector('.password-eye-slash').toggleAttribute('hidden', !visible);
      });
    });
    function accountForm(id, statusId, action) {
      const form = get(id);
      let busy = false;
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;
        busy = true;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        form.setAttribute('aria-busy', 'true');
        get(statusId).textContent = 'Saving…';
        try { await action(); }
        catch (error) {
          console.error('Account update failed:', { form: id, message: error.message, code: error.cause?.code, status: error.cause?.status });
          get(statusId).textContent = error.message || 'Your changes could not be saved. Please try again.';
        } finally { busy = false; button.disabled = false; form.removeAttribute('aria-busy'); }
      });
    }
    accountForm('email-form', 'email-status', async () => {
      await changeEmail(get('new-email').value);
      get('new-email').value = '';
      get('email-status').textContent = 'Email change requested. Check your new email address and confirm the change.';
      // Only a fresh authenticated user response can change the displayed email.
      const refreshed = await getCurrentUser();
      if (refreshed) get('profile-email').value = refreshed.email || '';
    });
    accountForm('password-form', 'password-status', async () => {
      await changePassword(get('current-password').value, get('new-password').value, get('confirm-new-password').value);
      get('password-form').reset();
      document.querySelectorAll('[data-password-toggle]').forEach((button) => {
        get(button.dataset.passwordToggle).type = 'password';
        button.setAttribute('aria-label', 'Show password');
        button.setAttribute('aria-pressed', 'false');
        button.querySelector('.password-eye-slash').setAttribute('hidden', '');
      });
      get('password-status').textContent = 'Password changed successfully.';
    });
    let savedUsername = '';
    try { savedUsername = (await getProfile()).username; get('display-name').value = savedUsername; }
    catch (error) { console.error('Unable to load Settings profile:', error); get('profile-status').textContent = 'Your profile could not be loaded. Please try again.'; }
    get('settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.submitter;
      if (button) button.disabled = true;
      try {
        const profile = await updateUsername(get('display-name').value);
        savedUsername = profile.username;
        get('display-name').value = savedUsername;
        get('profile-status').textContent = 'Username updated.';
      } catch (error) {
        console.error('Unable to update username:', error);
        get('display-name').value = savedUsername;
        get('profile-status').textContent = error.message || 'Your username could not be saved.';
      } finally { if (button) button.disabled = false; }
    });
    get('choose-profile-image').addEventListener('click', () => get('avatar-input').click());
    get('remove-profile-image').addEventListener('click', async () => {
      const controls = ['remove-profile-image', 'choose-profile-image', 'profile-avatar', 'avatar-input'].map(get);
      controls.forEach((control) => { control.disabled = true; });
      try { await removeAvatar(); renderAvatar(); get('profile-status').textContent = 'Default avatar selected.'; }
      catch (error) { console.error('Unable to remove profile image:', error); get('profile-status').textContent = error.message || 'Your image could not be removed.'; }
      finally { controls.forEach((control) => { control.disabled = false; }); }
    });
  }
}
