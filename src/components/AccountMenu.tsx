'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/** Floating account control (top-right, left of the theme toggle). */
export default function AccountMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Logged out: a compact "Log in" pill.
  if (!user) {
    return (
      <Link
        href="/login"
        className="fixed top-3 right-3 z-50 flex h-9 items-center rounded-full bg-surface border border-hairline px-3.5 text-sm font-medium text-secondary hover:text-body hover:border-strong transition-colors"
      >
        Log in
      </Link>
    );
  }

  const meta = user.user_metadata || {};
  const name: string = meta.display_name || meta.full_name || meta.name || user.email || 'Account';
  const initial = (name[0] || '?').toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <div ref={ref} className="fixed top-3 right-3 z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-white text-sm font-semibold shadow-sm hover:bg-teal-600 transition-colors cursor-pointer"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl bg-surface border border-hairline shadow-lg overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-hairline-soft">
            <p className="text-sm font-medium text-heading truncate">{name}</p>
            {user.email && <p className="text-xs text-muted truncate">{user.email}</p>}
          </div>
          <Link href="/account" onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-body hover:bg-subtle transition-colors">
            Your account
          </Link>
          <button type="button" onClick={handleSignOut}
            className="block w-full text-left px-4 py-2.5 text-sm text-body hover:bg-subtle transition-colors cursor-pointer">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
