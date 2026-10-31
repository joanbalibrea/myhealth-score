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
    } catch { /* Supabase logout already succeeded. */ }
  }
  async function requireUser() {
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in before changing your account.');
    return user;
  }
  function accountError(error, operation) {
    const code = error?.code;
    let message;
    if (operation === 'password' && (code === 'invalid_credentials' || code === 'current_password_mismatch' || code === 'current_password_invalid' || code === 'invalid_password' || /current password.*(incorrect|invalid)|incorrect.*current password/i.test(error?.message || ''))) {
      message = 'Your current password is incorrect. Please try again.';
    } else if (code === 'current_password_required') message = 'Please enter your current password.';
    else if (code === 'reauthentication_needed') message = 'Please sign in again before changing your password.';
    else if (code === 'same_password') message = 'Choose a new password different from your current password.';
    else if (code === 'email_exists' || code === 'user_already_exists') message = 'This email address is already in use. Choose another address.';
    else if (code === 'email_address_invalid' || (operation === 'email' && code === 'validation_failed')) message = 'Please enter a valid email address.';
    else message = authErrorMessage(error);
    // Preserve diagnostics without logging request payloads or passwords.
    return new Error(message, { cause: { code, status: error?.status } });
  }
  async function changeEmail(value) {
    const email = typeof value === 'string' ? value.trim() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
    const user = await requireUser();
    if (email.toLowerCase() === user.email?.toLowerCase()) throw new Error('Enter an email address different from your current email.');
    const { data, error } = await client.auth.updateUser({ email });
    if (error) throw accountError(error, 'email');
    return data.user;
  }
  async function changePassword(currentPassword, password, confirmation) {
    if (!currentPassword || !password || !confirmation) throw new Error('Please complete all password fields.');
    if (password.length < 8) throw new Error('New password must contain at least 8 characters.');
    if (password !== confirmation) throw new Error('New passwords do not match.');
    if (password === currentPassword) throw new Error('Choose a new password different from your current password.');
    await requireUser();
    const { data, error } = await client.auth.updateUser({ current_password: currentPassword, password });
    if (error) throw accountError(error, 'password');
    return data.user;
  }
  return { getCurrentUser, registerUser, loginUser, logoutUser, changeEmail, changePassword };
}
