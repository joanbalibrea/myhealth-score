import { getProfile, getAvatarUrl, uploadAvatar } from './database.js';
import { getCurrentUser } from './accounts.js';

export const assessmentMode = new URLSearchParams(window.location.search).get('mode') === 'quick' ? 'quick' : 'registered';
export function assessmentUrl(screen) { return `${screen}?mode=${assessmentMode}`; }

export function renderAvatar(source = '') {
  const preview = document.querySelector('#avatar-preview');
  if (!preview) return;
  preview.onerror = () => renderAvatar();
  preview.hidden = !source;
  if (source) preview.src = source;
  else preview.removeAttribute('src');
  document.querySelector('#default-avatar').toggleAttribute('hidden', Boolean(source));
  document.querySelectorAll('[data-profile-avatar-copy]').forEach((container) => {
    const image = container.querySelector('img');
    image.hidden = !source;
    if (source) image.src = source;
    else image.removeAttribute('src');
    container.querySelector('svg').toggleAttribute('hidden', Boolean(source));
  });
}
export async function displayProfileAvatar(profile) {
  try { renderAvatar(await getAvatarUrl(profile.avatar_path)); }
  catch (error) { console.error('Unable to display private avatar:', error); renderAvatar(); }
}
export async function setupAvatar() {
  const avatar = document.querySelector('#profile-avatar');
  const input = document.querySelector('#avatar-input');
  if (!avatar || !input) return;
  avatar.hidden = assessmentMode === 'quick';
  if (assessmentMode === 'quick') return;
  // Attach controls before loading so a network failure does not disable editing.
  let status = document.querySelector('#profile-status');
  if (!status) {
    status = document.createElement('p');
    status.setAttribute('role', 'status');
    avatar.closest('header').after(status);
  }
  avatar.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const controls = [avatar, input, ...document.querySelectorAll('#choose-profile-image, #remove-profile-image')];
    controls.forEach((control) => { control.disabled = true; });
    status.textContent = 'Uploading image…';
    try {
      await uploadAvatar(file);
      // A local preview is transient and only appears after persistence succeeds.
      const previewUrl = URL.createObjectURL(file);
      renderAvatar(previewUrl);
      document.querySelector('#avatar-preview').addEventListener('load', () => URL.revokeObjectURL(previewUrl), { once: true });
      status.textContent = 'Profile image updated.';
    } catch (error) {
      console.error('Unable to update profile image:', error);
      status.textContent = error.message || 'Your image could not be saved. Please try again.';
    } finally {
      input.value = '';
      controls.forEach((control) => { control.disabled = false; });
    }
  });
  try {
    if (!await getCurrentUser()) { window.location.replace('login.html'); return; }
    await displayProfileAvatar(await getProfile());
  } catch (error) { console.error('Unable to load profile:', error); renderAvatar(); }
}
