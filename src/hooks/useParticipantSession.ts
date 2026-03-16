'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ParticipantSession {
  id: string;
  name: string;
}

export function useParticipantSession(eventSlug: string, eventId: string) {
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const storageKey = `participant_${eventSlug}`;

  useEffect(() => {
    const validate = async () => {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ParticipantSession;
          // Verify this participant still exists in the database
          const supabase = createClient();
          const { data } = await supabase
            .from('participants')
            .select('id')
            .eq('id', parsed.id)
            .eq('event_id', eventId)
            .single();

          if (data) {
            setSession(parsed);
          } else {
            // Participant was deleted or doesn't exist — clear stale session
            localStorage.removeItem(storageKey);
          }
        } catch {
          localStorage.removeItem(storageKey);
        }
      }
      setLoaded(true);
    };

    validate();
  }, [storageKey, eventId]);

  const saveSession = (id: string, name: string) => {
    const data = { id, name };
    localStorage.setItem(storageKey, JSON.stringify(data));
    setSession(data);
  };

  const clearSession = () => {
    localStorage.removeItem(storageKey);
    setSession(null);
  };

  return {
    participantId: session?.id ?? null,
    participantName: session?.name ?? null,
    saveSession,
    clearSession,
    hasSession: !!session,
    loaded,
  };
}
