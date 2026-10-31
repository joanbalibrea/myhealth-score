import { supabase } from './supabase.js';
import { createPasswordRecovery, invalidRecoveryMessage } from './password-recovery.js';
const recovery = createPasswordRecovery(supabase);
const get = (id) => document.getElementById(id);
const status = get('recovery-status');
const form = get('recovery-form');
const submit = form.querySelector('button[type="submit"]');
const resetting = document.body.dataset.recovery === 'reset';
let busy = false;
let ready = false;
let completed = false;
function message(text, success = false) {
  status.textContent = text;
  status.dataset.tone = success ? 'success' : 'error';
}
function availability(valid) {
  ready = valid;
  form.querySelectorAll('input, button').forEach((control) => { control.disabled = !valid || busy || completed; });
}
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
if (resetting) {
  availability(false);
  message('Checking your reset link…');
  // Keep this callback synchronous: Auth methods must run outside its lock.
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (completed) return;
    if (event === 'PASSWORD_RECOVERY' && session) {
      availability(true);
      message('Choose your new password.');
    } else if (event === 'SIGNED_OUT') {
      availability(false);
      message(invalidRecoveryMessage);
    }
  });
  window.addEventListener('pagehide', () => subscription.unsubscribe(), { once: true });
  try {
    // Also handles initialization completing before the listener was registered.
    const valid = await recovery.hasSession();
    availability(valid);
    message(valid ? 'Choose your new password.' : invalidRecoveryMessage);
  } catch {
    availability(false);
    message(invalidRecoveryMessage);
  }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || completed || (resetting && !ready)) return;
  busy = true;
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  try {
    if (!resetting) {
      message(await recovery.requestReset(get('recovery-email').value, window.location.origin), true);
    } else {
      await recovery.updatePassword(get('new-password').value, get('confirm-password').value);
      completed = true;
      form.reset();
      availability(false);
      message('Password updated successfully.', true);
      try {
        await recovery.signOut();
        get('recovery-sign-in').focus();
      } catch (error) {
        message('Password updated successfully. Please sign out before signing in again.', true);
        get('recovery-sign-out').hidden = false;
      }
    }
  } catch (error) {
    message(error.message || 'Unable to complete your request. Please try again later.');
  } finally {
    busy = false;
    submit.disabled = completed || (resetting && !ready);
    form.removeAttribute('aria-busy');
  }
});
get('recovery-sign-out')?.addEventListener('click', async () => {
  try { await recovery.signOut(); window.location.assign('login.html'); }
  catch (error) { message(error.message); }
});
