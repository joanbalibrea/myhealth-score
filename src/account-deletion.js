import { clearAssessment } from './account-session.js';

export function createAccountDeleter(client, sessionStorage = () => globalThis.sessionStorage) {
  return async function deleteAccount(currentPassword, confirmation) {
    if (!currentPassword || confirmation !== 'DELETE') throw new Error('Enter your current password and type DELETE to confirm.');
    const { data: current, error: userError } = await client.auth.getUser();
    const user = current?.user;
    if (userError || !user?.id || !user.email || !user.email_confirmed_at) throw new Error('Please sign in with your confirmed email before deleting your account.');
    const { data: verified, error: passwordError } = await client.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (passwordError || !verified?.session || verified.user?.id !== user.id) throw new Error('Incorrect password.');
    const { data, error } = await client.functions.invoke('delete-account');
    if (error || data?.success !== true) {
      console.error('Account deletion request failed:', error || { success: data?.success });
      throw new Error("We couldn't delete your account. Please try again.");
    }
    try {
      const session = sessionStorage();
      // Leave another mode's draft (including Quick Launcher) untouched.
      if (session.getItem('myhealth_assessment_owner') === user.id) {
        clearAssessment(session);
        session.removeItem('myhealth_assessment_owner');
      }
    } catch { /* Cleanup cannot undo successful account deletion. */ }
    try {
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
      if (signOutError) console.error('Deleted account session cleanup failed:', { code: signOutError.code, status: signOutError.status });
    } catch { console.error('Deleted account session cleanup could not complete.'); }
  };
}
