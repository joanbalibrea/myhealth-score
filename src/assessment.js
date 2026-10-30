import { readProfile, saveProfile } from './profile.js';
import { getCurrentUser, getCurrentUserId } from './accounts.js';

export const assessmentMode = new URLSearchParams(window.location.search).get('mode') === 'quick' ? 'quick' : 'registered';
export function assessmentUrl(screen) { return `${screen}?mode=${assessmentMode}`; }

export function setupAvatar() {
  const avatar = document.querySelector('#profile-avatar');
  const input = document.querySelector('#avatar-input');
  if (!avatar || !input) return;
  avatar.hidden = assessmentMode === 'quick';
  if (assessmentMode === 'quick') return;
  const ownerId = getCurrentUser()?.id;
  if (!ownerId) { window.location.replace('login.html'); return; }
  function render(source) {
    const preview = document.querySelector('#avatar-preview');
    preview.hidden = !source;
    if (source) preview.src = source;
    document.querySelector('#default-avatar').toggleAttribute('hidden', Boolean(source));
    // Dashboard summary avatar is a non-clickable copy of the same profile.
    document.querySelectorAll('[data-profile-avatar-copy]').forEach((container) => {
      const image = container.querySelector('img');
      image.hidden = !source;
      if (source) image.src = source;
      container.querySelector('svg').toggleAttribute('hidden', Boolean(source));
    });
  }
  try { render(readProfile(localStorage).avatar); } catch { render(''); }
  avatar.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const image = new Image();
      image.onload = () => {
        if (getCurrentUserId() !== ownerId) return;
        try {
          const profile = readProfile(localStorage);
          saveProfile(localStorage, { ...profile, avatar: reader.result });
          render(reader.result);
        } catch {
          const status = document.querySelector('#profile-status');
          if (status) status.textContent = 'The profile image could not be saved. Try a smaller image or allow browser storage.';
        }
      };
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  });
}
