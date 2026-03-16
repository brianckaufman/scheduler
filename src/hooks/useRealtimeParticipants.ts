'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Participant } from '@/types';

export function useRealtimeParticipants(eventId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (data) setParticipants(data);
      setLoaded(true);
    };
    fetchParticipants();

    const channel = supabase
      .channel(`participants:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setParticipants((prev) => {
              if (prev.some((p) => p.id === (payload.new as Participant).id)) return prev;
              return [...prev, payload.new as Participant];
            });
          } else if (payload.eventType === 'DELETE') {
            setParticipants((prev) => prev.filter((p) => p.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setParticipants((prev) =>
              prev.map((p) => p.id === (payload.new as Participant).id ? (payload.new as Participant) : p)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const removeParticipant = (pid: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== pid));
  };

  return { participants, loaded, removeParticipant };
}
