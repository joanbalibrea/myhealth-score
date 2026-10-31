import { supabase } from './supabase.js';
import { createAccountDeleter } from './account-deletion.js';

export function setupAccountDeletion() {
  const get = (id) => document.getElementById(id);
  const dialog = get('delete-account-dialog');
  const form = get('delete-account-form');
  const password = get('delete-account-password');
  const confirmation = get('delete-account-confirmation');
  const submit = get('confirm-delete-account');
  const cancel = get('cancel-delete-account');
  const status = get('delete-account-status');
  const deleteAccount = createAccountDeleter(supabase);
  let busy = false;
  const update = () => { submit.disabled = busy || !password.value || confirmation.value !== 'DELETE'; };
  password.addEventListener('input', update);
  confirmation.addEventListener('input', update);
  get('open-delete-account').addEventListener('click', () => {
    form.reset();
    status.textContent = '';
    update();
    dialog.showModal();
    cancel.focus();
  });
  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { form.reset(); update(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !password.value || confirmation.value !== 'DELETE') return;
    busy = true;
    update();
    cancel.disabled = password.disabled = confirmation.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Deleting account…';
    try {
      await deleteAccount(password.value, confirmation.value);
      form.reset();
      window.location.replace('login.html');
    } catch (error) {
      status.textContent = error.message === 'Incorrect password.' ? 'Incorrect password.' : "We couldn't delete your account. Please try again.";
      // Never log passwords or authentication request payloads.
      if (error.message !== 'Incorrect password.') console.error('Unable to complete account deletion:', { message: error.message });
      password.value = '';
      busy = false;
      cancel.disabled = password.disabled = confirmation.disabled = false;
      update();
      password.focus();
    } finally { form.removeAttribute('aria-busy'); }
  });
}
