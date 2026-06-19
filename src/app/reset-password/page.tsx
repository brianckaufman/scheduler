'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { authInputClass, authButtonClass } from '@/components/auth/AuthShell';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // The callback established a recovery session before redirecting here.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getUser();
      setHasSession(!!data.user);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're all set.">
        <Link href="/account" className="block text-center text-accent-fg font-medium hover:underline">
          Go to your account
        </Link>
      </AuthShell>
    );
  }

  if (hasSession === false) {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired.">
        <Link href="/forgot-password" className="block text-center text-accent-fg font-medium hover:underline">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <form onSubmit={submit} className="space-y-3">
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (8+ characters)" autoComplete="new-password" className={authInputClass} />
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password" autoComplete="new-password" className={authInputClass} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
