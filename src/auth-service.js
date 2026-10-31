import { clearAssessment } from './account-session.js';

export function authErrorMessage(error) {
  const code = error?.code;
  if (code === 'invalid_credentials') return 'Incorrect email or password.';
  if (code === 'email_not_confirmed') return 'Please confirm your email before signing in.';
  if (code === 'user_already_exists' || code === 'email_exists') return 'An account with this email already exists. Please sign in.';
  if (code === 'weak_password') return 'Please choose a stronger password with at least 8 characters.';
  if (code === 'over_email_send_rate_limit' || error?.status === 429) return 'Too many attempts. Please wait a little before trying again.';
  if (error instanceof TypeError) return 'Unable to connect. Check your connection and try again.';
  return error?.message || 'Authentication could not be completed. Please try again.';
}

// The injected client makes the Auth behavior testable without real accounts.
// Production uses the single client exported by supabase.js.
export function createAuthService(client, options = {}) {
  const sessionStorage = () => options.sessionStorage ?? globalThis.sessionStorage;

  function ownAssessment(user) {
    const session = sessionStorage();
    // This key owns draft answers, not authentication. Only getUser establishes identity.
    const owner = session.getItem('myhealth_assessment_owner');
    if (owner !== user.id) clearAssessment(session);
    session.setItem('myhealth_assessment_owner', user.id);
    session.removeItem('myhealth_current_user_id'); // Retired prototype session only.
  }
  async function getCurrentUser() {
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user) return null;
      try { ownAssessment(data.user); } catch { /* Auth does not depend on draft storage. */ }
      return data.user;
    } catch { return null; }
  }
  async function registerUser(details) {
    const username = details.username.trim();
    const email = details.email.trim();
    if (!username || !email || !details.password.trim() || !details.confirmation.trim()) throw new Error('Please complete all required fields.');
    if (details.password !== details.confirmation) throw new Error('Passwords do not match.');
    if (details.password.length < 8) throw new Error('Password must contain at least 8 characters.');
    const { data, error } = await client.auth.signUp({ email, password: details.password, options: { data: { username } } });
    if (error) throw new Error(authErrorMessage(error));
    // Email confirmation normally means session is null: stay on registration.
    return data;
  }
  async function loginUser(email, password) {
    if (!email.trim() || !password.trim()) throw new Error('Please complete all required fields.');
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(authErrorMessage(error));
    if (!data?.session || !data?.user) throw new Error('Sign in did not create an authenticated session. Please try again.');
    try { ownAssessment(data.user); } catch { /* Keep valid Auth session. */ }
    return data.user;
  }
  async function logoutUser() {
    const { error } = await client.auth.signOut();
    if (error) throw new Error(authErrorMessage(error));
    try {
      clearAssessment(sessionStorage());
      sessionStorage().removeItem('myhealth_assessment_owner');
      sessionStorage().removeItem('myhealth_current_user_id');
    } catch { /* Supabase logout already succeeded. */ }
  }
  async function updateCurrentUser(changes) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in before changing your profile.');
    const username = (changes.username ?? user.user_metadata?.username ?? '').trim();
    const email = (changes.email ?? user.email ?? '').trim();
    if (!username || !email) throw new Error('Username and email are required.');
    const attributes = { data: { username } };
    if (email !== user.email) attributes.email = email;
    const { data, error } = await client.auth.updateUser(attributes);
    if (error) throw new Error(authErrorMessage(error));
    return data.user;
  }
  return { getCurrentUser, registerUser, loginUser, logoutUser, updateCurrentUser };
}
