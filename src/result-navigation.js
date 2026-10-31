// Carry the selected database UUID through read-only result screens.
export function resultUrl(page, mode, recordId = null) {
  const params = new URLSearchParams();
  if (recordId !== null && mode !== 'quick') params.set('record', recordId);
  params.set('mode', mode);
  return `${page}?${params.toString()}`;
}
