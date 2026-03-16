'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AvailabilitySlot } from '@/types';

export function useRealtimeSlots(eventId: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const fetchSlots = async () => {
      const { data } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('event_id', eventId);
      if (data) setSlots(data);
      setLoaded(true);
    };
    fetchSlots();

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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSlots((prev) => {
              if (prev.some((s) => s.id === (payload.new as AvailabilitySlot).id)) return prev;
              return [...prev, payload.new as AvailabilitySlot];
            });
          } else if (payload.eventType === 'DELETE') {
            setSlots((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const removeByParticipant = (participantId: string) => {
    setSlots((prev) => prev.filter((s) => s.participant_id !== participantId));
  };

  return { slots, loaded, removeByParticipant };
}
