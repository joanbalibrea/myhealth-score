import { supabase } from './supabase.js';
import { createDatabaseSaver, createDatabaseReaders } from './recording-persistence.js';

// Reuse the shared authenticated client; RLS authorizes the insert.
export const saveRecording = createDatabaseSaver(supabase);
export const { getRecordings, getRecordingById } = createDatabaseReaders(supabase);
export { normalizeRecordingRow } from './recording-persistence.js';

import { createProfileService } from './profile-persistence.js';
export const { getProfile, updateUsername, getAvatarUrl, uploadAvatar, removeAvatar } = createProfileService(supabase);
