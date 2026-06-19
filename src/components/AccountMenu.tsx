'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

/** Floating account control (top-right). */
export default function AccountMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Load the avatar: instant fallback from OAuth metadata, then the authoritative
  // profiles.avatar_url (covers custom uploads). Updates live after an upload.
  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    const m = user.user_metadata || {};
    if (m.avatar_url || m.picture) setAvatarUrl(m.avatar_url || m.picture);
    (async () => {
      const { data } = await createClient()
        .from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
      if (data && 'avatar_url' in data) setAvatarUrl((data.avatar_url as string | null) || null);
    })();
    const onChange = (e: Event) => setAvatarUrl((e as CustomEvent<string | null>).detail ?? null);
    window.addEventListener('avatar-change', onChange);
    return () => window.removeEventListener('avatar-change', onChange);
  }, [user]);

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
        className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-teal-500 text-white text-sm font-semibold shadow-sm hover:bg-teal-600 transition-colors cursor-pointer"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-hairline shadow-lg overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-hairline-soft flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">{initial}</div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate">{name}</p>
              {user.email && <p className="text-xs text-muted truncate">{user.email}</p>}
            </div>
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
