'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GoogleButton from '@/components/auth/GoogleButton';
import AuthShell, { authInputClass, authButtonClass, authDivider } from '@/components/auth/AuthShell';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/account';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="text-accent-fg font-medium hover:underline">Create an account</Link>
        </>
      }
    >
      <GoogleButton next={next} />
      {authDivider}
      <form onSubmit={submit} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" className={authInputClass} />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" autoComplete="current-password" className={authInputClass} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="text-center mt-4">
        <Link href="/forgot-password" className="text-sm text-muted hover:text-body">Forgot your password?</Link>
      </p>
    </AuthShell>
  );
}
