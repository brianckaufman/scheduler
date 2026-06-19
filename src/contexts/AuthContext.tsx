'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

/**
 * Exposes the current Supabase auth user to client components. Seeded with the
 * server-resolved user (no flash) and kept in sync via onAuthStateChange.
 */
export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Reconcile in case the server snapshot is stale.
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await createClient().auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
