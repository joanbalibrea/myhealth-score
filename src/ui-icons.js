// Shared presentation-only SVG vocabulary. No account, assessment or storage logic.
const paths = {
  checklist: '<rect x="4" y="3" width="16" height="19" rx="3"/><path d="m7 9 1.5 1.5L11 7m2 2h4M7 15l1.5 1.5L11 13m2 2h4"/>',
  insight: '<path d="M9 18h6m-5 4h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Zm4-7v6m-3-3 3 3 3-3"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
  identity: '<rect x="2" y="4" width="20" height="16" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5 16a3 3 0 0 1 6 0m3-7h5m-5 4h5"/>',
  body: '<circle cx="12" cy="4" r="2"/><path d="M5 9l7-2 7 2m-7-2v7m0 0-4 7m4-7 4 7"/>',
  ruler: '<rect x="8" y="2" width="8" height="20" rx="2"/><path d="M8 6h4m-4 4h3m-3 4h4m-4 4h3"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 10a5 5 0 0 1 10 0m-5 0 2-3M8 16h8"/>',
  tape: '<ellipse cx="12" cy="7" rx="8" ry="4"/><path d="M4 7v9c0 3 16 3 16 0V7m-12 5v3m4-2v3m4-4v3"/>',
  synthesis: '<path d="M4 19V5m0 14h16M8 15l4-6 4 3 4-7"/><circle cx="12" cy="9" r="1"/>',
  activity: '<circle cx="15" cy="4" r="2"/><path d="m7 11 4-4 5 3 4 1m-9-4-1 7 5 3-1 5m-4-8-4 6H2"/>',
  intensity: '<path d="m13 2-9 12h7l-1 8 10-13h-8z"/>',
  sport: '<path d="m4 8 12 12m-15-9 6-6m10 14 6-6M3 5l2-2 4 4-2 2m8 8 2-2 4 4-2 2"/>',
  diet: '<path d="M12 8C7 3 2 7 4 14c2 8 6 7 8 6 2 1 6 2 8-6 2-7-3-11-8-6Zm0 0c0-4 2-6 5-6"/>',
  leaf: '<path d="M20 3C8 2 2 8 5 15s16 5 15-12ZM4 21 16 9"/>',
  flame: '<path d="M12 2c1 6 7 6 7 13a7 7 0 0 1-14 0c0-4 3-6 4-8 0 4 2 5 3 5 2-3 0-7 0-10Z"/>',
  drink: '<path d="M5 7h14l-2 14H7L5 7Zm7 0 2-5h5M6 12h12"/>',
  water: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
  meal: '<path d="M3 8h18M4 8c0-8 16-8 16 0M3 12h18M4 16h16l-1 4H5l-1-4Z"/>',
  plate: '<circle cx="12" cy="12" r="7"/><path d="M2 3v6m3-6v6M2 6h3m-1 3v12M22 3v18m0-18c-4 3-4 9 0 9"/>',
  sleep: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  mental: '<path d="M9 20v-4c-5-2-6-8-2-11 5-5 13-1 13 5l2 4h-4v6H9Z"/><path d="M10 9c1-3 5-3 6 0m-6 3h5"/>',
  calm: '<path d="M3 9c3-5 6 5 9 0s6 5 9 0M3 15c3-5 6 5 9 0s6 5 9 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  cloud: '<path d="M6 18a5 5 0 1 1 1-10 7 7 0 0 1 13 4 3 3 0 0 1-1 6H6Z"/>',
  support: '<path d="M2 12h4l4 4 4-4 4 2 4-3M2 6l5-2 5 4 5-4 5 2M6 12l5-5m3 9-3 4-5-4"/>',
  lifestyle: '<path d="M12 21C0 14 1 4 7 4c2 0 4 2 5 3 1-1 3-3 5-3 6 0 7 10-5 17Z"/>',
  tobacco: '<path d="M3 14h18v5H3Zm13 0v5M8 3c-3 5 4 3 1 8m5-8c-3 5 4 3 1 8"/>',
  alcohol: '<path d="M7 2h10l1 7a6 6 0 0 1-12 0l1-7Zm5 13v7m-4 0h8M6 8h12"/>',
  coffee: '<path d="M3 8h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Zm14 1h2a3 3 0 0 1 0 6h-2M6 2v3m4-3v3m4-3v3"/>',
  substances: '<path d="m7 17 10-10M5 9l4-4a7 7 0 0 1 10 10l-4 4A7 7 0 0 1 5 9Z"/>',
  vitals: '<path d="M12 21C0 14 1 4 7 4c2 0 4 2 5 3 1-1 3-3 5-3 6 0 7 10-5 17Z"/><path d="M3 12h5l2-4 3 8 2-4h6"/>',
  pressure: '<path d="M4 17a9 9 0 1 1 16 0M12 12l4-5M6 17h12M5 10h2m10 0h2M12 3v2"/>',
  progress: '<path d="M3 3v18h18M6 15l5-6 4 3 6-8m-5 0h5v5"/>',
  alerts: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
  history: '<rect x="4" y="4" width="16" height="18" rx="3"/><path d="M9 4V2h6v2M8 10h8m-8 4h8m-8 4h5"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  exit: '<path d="M9 3H4v18h5m-1-9h14m-5-5 5 5-5 5"/>',
};
export const categoryIcons = { body: 'scale', activity: 'activity', diet: 'diet', sleep: 'sleep', mental: 'mental', lifestyle: 'lifestyle', vitals: 'vitals' };
export function iconMarkup(name, className = '') {
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.vitals}</svg>`;
}
export function uiIcon(name, className = '') {
  const template = document.createElement('template');
  template.innerHTML = iconMarkup(name, className);
  return template.content.firstElementChild;
}
