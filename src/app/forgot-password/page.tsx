'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { authInputClass, authButtonClass } from '@/components/auth/AuthShell';
import { isMailerFailure, MAILER_FAILURE_MESSAGE } from '@/lib/authErrors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    // Still don't reveal whether an account exists — an unknown address looks
    // like success. But a mailer failure means NO link is coming, so saying
    // "check your email" would leave them waiting on nothing.
    if (isMailerFailure(error)) {
      setError(MAILER_FAILURE_MESSAGE);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`If an account exists for ${email}, a reset link is on its way.`}>
        <Link href="/login" className="block text-center text-accent-fg font-medium hover:underline">
          Back to log in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send a reset link."
      footer={<Link href="/login" className="text-accent-fg font-medium hover:underline">Back to log in</Link>}
    >
      <form onSubmit={submit} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" className={authInputClass} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
