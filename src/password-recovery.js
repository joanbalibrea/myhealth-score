export const recoveryRequestMessage = "If an account exists for that email, we've sent a password reset link.";
export const invalidRecoveryMessage = 'This password reset link is invalid or has expired. Request a new reset link.';

export function createPasswordRecovery(client) {
  async function hasSession() {
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) return false;
    // Verify the session with Auth rather than trusting a browser-stored user.
    const result = await client.auth.getUser();
    return !result.error && Boolean(result.data?.user?.id);
  }
  return {
    hasSession,
    async requestReset(value, origin) {
      const email = typeof value === 'string' ? value.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/screens/reset-password.html` });
      if (error) {
        // Log diagnostics only, never email addresses, tokens, or request payloads.
        console.error('Password recovery request failed:', { code: error.code, status: error.status });
        throw new Error('Unable to send a reset link right now. Please try again later.');
      }
      return recoveryRequestMessage;
    },
    async updatePassword(password, confirmation) {
      if (!password || !confirmation) throw new Error('Please complete both password fields.');
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.');
      if (password !== confirmation) throw new Error('Passwords do not match.');
      if (!await hasSession()) throw new Error(invalidRecoveryMessage);
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        console.error('Recovery password update failed:', { code: error.code, status: error.status });
        throw new Error('Your password could not be updated. Try again or request a new reset link.');
      }
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw new Error('Password updated, but sign out failed. Please try signing out again.');
    },
  };
}
