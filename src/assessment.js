export const assessmentMode = new URLSearchParams(window.location.search).get('mode') === 'quick' ? 'quick' : 'registered';

export function assessmentUrl(screen) {
  return `${screen}?mode=${assessmentMode}`;
}

export function setupAvatar() {
const avatar = document.querySelector('#profile-avatar');
const avatarInput = document.querySelector('#avatar-input');
const preview = document.querySelector('#avatar-preview');
let avatarUrl;
avatar.hidden = assessmentMode === 'quick';
avatar.addEventListener('click', () => avatarInput.click());
avatarInput.addEventListener('change', () => {
  const file = avatarInput.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const nextUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    avatarUrl = nextUrl;
    preview.src = avatarUrl;
    preview.hidden = false;
    document.querySelector('#default-avatar').setAttribute('hidden', '');
  };
  image.onerror = () => URL.revokeObjectURL(nextUrl);
  image.src = nextUrl;
});

}
