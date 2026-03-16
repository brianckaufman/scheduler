'use client';

import { useState, useEffect } from 'react';

interface ParticipantSession {
  id: string;
  name: string;
}

export function useParticipantSession(eventSlug: string) {
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const storageKey = `participant_${eventSlug}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setLoaded(true);
  }, [storageKey]);

  const saveSession = (id: string, name: string) => {
    const data = { id, name };
    localStorage.setItem(storageKey, JSON.stringify(data));
    setSession(data);
  };

  return {
    participantId: session?.id ?? null,
    participantName: session?.name ?? null,
    saveSession,
    hasSession: !!session,
    loaded,
  };
}
