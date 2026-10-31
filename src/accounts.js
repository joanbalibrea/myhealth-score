import { supabase } from './supabase.js';
import { createAuthService } from './auth-service.js';

// Supabase Auth is the only authentication authority. Saved recordings are
// handled separately by database.js; this module contains no history storage.
export const { getCurrentUser, registerUser, loginUser, logoutUser, changeEmail, changePassword } = createAuthService(supabase);
