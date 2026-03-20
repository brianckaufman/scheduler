'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AvailabilitySlot } from '@/types';

export function useRealtimeSlots(eventId: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    const fetchSlots = async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('event_id', eventId);
      if (error) {
        console.error('[RealtimeSlots] fetch error:', error.message);
      }
      if (data) setSlots(data);
      setLoaded(true);
    };
    fetchSlots();

    // Clean up any existing channel for this event before subscribing
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`slots:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_slots',
          filter: `event_id=eq.${eventId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newSlot = payload.new as AvailabilitySlot;
            setSlots((prev) => {
              if (prev.some((s) => s.id === newSlot.id)) return prev;
              return [...prev, newSlot];
            });
          } else if (payload.eventType === 'DELETE') {
            const oldSlot = payload.old as Partial<AvailabilitySlot>;
            if (oldSlot.id) {
              setSlots((prev) => prev.filter((s) => s.id !== oldSlot.id));
            } else if (oldSlot.participant_id && oldSlot.slot_start) {
              // Fallback: match by participant + slot_start if id missing
              setSlots((prev) =>
                prev.filter(
                  (s) =>
                    !(s.participant_id === oldSlot.participant_id &&
                      new Date(s.slot_start).toISOString() === new Date(oldSlot.slot_start!).toISOString())
                )
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AvailabilitySlot;
            setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          // connected
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[RealtimeSlots] channel error:', err);
          // Attempt to refetch on error
          fetchSlots();
        } else if (status === 'TIMED_OUT') {
          console.warn('[RealtimeSlots] subscription timed out, refetching...');
          fetchSlots();
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId]);

  const removeByParticipant = (participantId: string) => {
    setSlots((prev) => prev.filter((s) => s.participant_id !== participantId));
  };

  return { slots, loaded, removeByParticipant };
}
