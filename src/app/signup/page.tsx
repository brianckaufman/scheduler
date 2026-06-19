'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import GoogleButton from '@/components/auth/GoogleButton';
import AuthShell, { authInputClass, authButtonClass, authDivider } from '@/components/auth/AuthShell';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is required, there's no active session yet.
    if (!data.session) {
      setSent(true);
      setLoading(false);
      return;
    }
    window.location.href = '/account';
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <p className="text-sm text-muted text-center">
          Click the link in that email to activate your account, then log in.
        </p>
        <Link href="/login" className="block text-center mt-5 text-accent-fg font-medium hover:underline">
          Back to log in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free, and optional — you can keep using the app without one."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-accent-fg font-medium hover:underline">Log in</Link>
        </>
      }
    >
      <GoogleButton next="/account" label="Sign up with Google" />
      {authDivider}
      <form onSubmit={submit} className="space-y-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Your name" autoComplete="name" maxLength={50} className={authInputClass} />
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" className={authInputClass} />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)" autoComplete="new-password" className={authInputClass} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
