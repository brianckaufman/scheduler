'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { authInputClass, authButtonClass } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    // Always show success (don't reveal whether an account exists).
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
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
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
