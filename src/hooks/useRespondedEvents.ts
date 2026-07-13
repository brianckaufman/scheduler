'use client';

import { useState, useEffect, useCallback } from 'react';

export type RsvpValue = 'yes' | 'maybe' | 'no';

export interface RespondedEvent {
  slug: string;
  name: string;
  /** When the user first responded (ISO). */
  respondedAt: string;
  /** 'fixed' (RSVP) or 'availability' (Find-a-Time). */
  eventType?: 'fixed' | 'availability';
  /** The event's confirmed time, once known (ISO) — also when it "happens". */
  finalizedTime?: string | null;
  /** Whole-day event (no time-of-day); finalizedTime is the range start. */
  allDay?: boolean;
  /** Inclusive end date ('yyyy-MM-dd') of a finalized all-day range. */
  finalizedEndDate?: string | null;
  /** The user's RSVP, for fixed events. */
  rsvp?: RsvpValue | null;
  /** Pinned events never auto-expire. */
  pinned?: boolean;
}

const STORAGE_KEY = 'responded_events';
const MAX_EVENTS = 200;
// Keep an event for a week after it happens, then drop it from the list.
const POST_EVENT_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
// Un-finalized Find-a-Time events linger up to ~3 months before we prune them.
const STALE_UNFINALIZED_MS = 90 * 24 * 60 * 60 * 1000;

/** Should this responded-event still appear in the list? */
function isActive(e: RespondedEvent, now: number): boolean {
  if (e.pinned) return true;
  if (e.finalizedTime) {
    const at = new Date(e.finalizedTime).getTime();
    if (Number.isNaN(at)) return true;
    return now - at < POST_EVENT_GRACE_MS; // future or within grace → keep
  }
  const at = new Date(e.respondedAt).getTime();
  if (Number.isNaN(at)) return true;
  return now - at < STALE_UNFINALIZED_MS;
}

/**
 * Tracks events OTHER people created that the current user responded to
 * (RSVP'd or shared availability), in localStorage. Surfaced as a tab on the
 * homepage so guests can easily get back to events they've joined.
 */
export function useRespondedEvents() {
  const [events, setEvents] = useState<RespondedEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RespondedEvent[];
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const active = parsed.filter((e) => isActive(e, now));
          if (active.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
          }
          setEvents(active);
        }
      }
    } catch {
      // Corrupted data, ignore
    }
    setLoaded(true);
  }, []);

  const persist = (updated: RespondedEvent[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage full, ignore
    }
  };

  const removeEvent = useCallback((slug: string) => {
    setEvents((prev) => {
      const updated = prev.filter((e) => e.slug !== slug);
      persist(updated);
      return updated;
    });
  }, []);

  const updateEvent = useCallback(
    (slug: string, changes: Partial<Omit<RespondedEvent, 'slug'>>) => {
      setEvents((prev) => {
        const updated = prev.map((e) =>
          e.slug === slug ? { ...e, ...changes } : e
        );
        persist(updated);
        return updated;
      });
    },
    []
  );

  return { events, loaded, removeEvent, updateEvent };
}

/**
 * Imperatively record (or merge into) a responded-event. Called from the event
 * page when a participant session is active. Safe to call repeatedly — it
 * upserts by slug and never clobbers an existing respondedAt / pinned flag.
 */
export function recordRespondedEvent(
  slug: string,
  name: string,
  opts: Partial<Pick<RespondedEvent, 'eventType' | 'finalizedTime' | 'allDay' | 'finalizedEndDate' | 'rsvp'>> = {}
) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const list: RespondedEvent[] = stored ? JSON.parse(stored) : [];
    const arr = Array.isArray(list) ? list : [];
    const idx = arr.findIndex((e) => e.slug === slug);

    if (idx >= 0) {
      const prev = arr[idx];
      const merged: RespondedEvent = {
        ...prev,
        name: name || prev.name,
        eventType: opts.eventType ?? prev.eventType,
        finalizedTime:
          opts.finalizedTime !== undefined ? opts.finalizedTime : prev.finalizedTime,
        allDay: opts.allDay ?? prev.allDay,
        finalizedEndDate:
          opts.finalizedEndDate !== undefined ? opts.finalizedEndDate : prev.finalizedEndDate,
        rsvp: opts.rsvp !== undefined ? opts.rsvp : prev.rsvp,
      };
      // No-op if nothing actually changed (avoids needless writes/renders).
      if (JSON.stringify(merged) === JSON.stringify(prev)) return;
      arr[idx] = merged;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      return;
    }

    const next: RespondedEvent = {
      slug,
      name,
      respondedAt: new Date().toISOString(),
      eventType: opts.eventType,
      finalizedTime: opts.finalizedTime ?? null,
      allDay: opts.allDay,
      finalizedEndDate: opts.finalizedEndDate ?? null,
      rsvp: opts.rsvp ?? null,
    };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([next, ...arr].slice(0, MAX_EVENTS))
    );
  } catch {
    // ignore (private mode / quota)
  }
}
