'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Participant } from '@/types';

export function useRealtimeParticipants(eventId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[RealtimeParticipants] fetch error:', error.message);
      }
      if (data) setParticipants(data);
      setLoaded(true);
    };
    fetchParticipants();

    // Clean up any existing channel before subscribing
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newParticipant = payload.new as Participant;
            setParticipants((prev) => {
              if (prev.some((p) => p.id === newParticipant.id)) return prev;
              return [...prev, newParticipant];
            });
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<Participant>;
            if (old.id) {
              setParticipants((prev) => prev.filter((p) => p.id !== old.id));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Participant;
            setParticipants((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeParticipants] subscribed to', eventId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[RealtimeParticipants] channel error:', err);
          fetchParticipants();
        } else if (status === 'TIMED_OUT') {
          console.warn('[RealtimeParticipants] subscription timed out, refetching...');
          fetchParticipants();
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId]);

  const removeParticipant = (pid: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== pid));
  };

  return { participants, loaded, removeParticipant };
}
