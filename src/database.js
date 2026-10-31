import { supabase } from './supabase.js';
import { createDatabaseSaver, createDatabaseReaders, createDatabaseDeleter } from './recording-persistence.js';

// Reuse the shared authenticated client; RLS authorizes the insert.
export const saveRecording = createDatabaseSaver(supabase);
export const { getRecordings, getRecordingById } = createDatabaseReaders(supabase);
export { normalizeRecordingRow } from './recording-persistence.js';

import { createProfileService } from './profile-persistence.js';
export const { getProfile, updateUsername, getAvatarUrl, uploadAvatar, removeAvatar } = createProfileService(supabase);

export const deleteRecording = createDatabaseDeleter(supabase);
