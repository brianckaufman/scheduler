/**
 * Supabase Auth surfaces raw GoTrue messages. Most are fine to show, but
 * "Error sending confirmation email" is a server-side mailer failure — it
 * tells the customer nothing, and it hides the fact that Google sign-in is
 * a working way in. Translate the ones that matter; pass the rest through.
 */

interface AuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
}

/** True when the failure is our mailer, not anything the customer did. */
export function isMailerFailure(err: AuthErrorLike | null | undefined): boolean {
  if (!err) return false;
  if (err.code === 'unexpected_failure' && err.status === 500) return true;
  return /error sending/i.test(err.message ?? '');
}

export const MAILER_FAILURE_MESSAGE =
  "We couldn't send that email just now — this is a problem on our end, not yours. " +
  'Please try again in a few minutes.';

export function friendlyAuthError(err: AuthErrorLike | null | undefined): string {
  if (!err) return '';
  const msg = err.message ?? 'Something went wrong. Please try again.';

  if (isMailerFailure(err)) return MAILER_FAILURE_MESSAGE;

  if (/already registered|already exists/i.test(msg)) {
    return 'That email already has an account. Try logging in instead.';
  }
  if (err.status === 429 || /rate limit/i.test(msg)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (/invalid login credentials/i.test(msg)) {
    return 'That email and password don’t match. Check both and try again.';
  }
  return msg;
}
