import { supabase } from './supabase.js';
import { createAuthService } from './auth-service.js';

// Supabase Auth is the only authentication authority. Recording history remains
// local to this browser; no recordings database or legacy account migration here.
export const { getCurrentUser, registerUser, loginUser, logoutUser, updateCurrentUser, getUserHistoryStorage, getCurrentUserHistory } = createAuthService(supabase);
export { getUserHistoryKey } from './auth-service.js';
