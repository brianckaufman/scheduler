'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CreatedEvent {
  slug: string;
  name: string;
  createdAt: string;
  finalizedTime?: string | null;
}

const STORAGE_KEY = 'created_events';
const MAX_EVENTS = 10;

/**
 * Tracks events created by the current user in localStorage.
 * Used to show returning users their past events on the homepage.
 */
export function useCreatedEvents() {
  const [events, setEvents] = useState<CreatedEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CreatedEvent[];
        setEvents(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      // Corrupted data, ignore
    }
    setLoaded(true);
  }, []);

  const persist = (updated: CreatedEvent[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage full, ignore
    }
  };

  const addEvent = useCallback((slug: string, name: string) => {
    setEvents((prev) => {
      // Don't add duplicates
      if (prev.some((e) => e.slug === slug)) return prev;
      const updated = [
        { slug, name, createdAt: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_EVENTS);
      persist(updated);
      return updated;
    });
  }, []);

  const removeEvent = useCallback((slug: string) => {
    setEvents((prev) => {
      const updated = prev.filter((e) => e.slug !== slug);
      persist(updated);
      return updated;
    });
  }, []);

  const updateEvent = useCallback((slug: string, changes: Partial<Omit<CreatedEvent, 'slug'>>) => {
    setEvents((prev) => {
      const updated = prev.map((e) =>
        e.slug === slug ? { ...e, ...changes } : e
      );
      persist(updated);
      return updated;
    });
  }, []);

  return { events, loaded, addEvent, removeEvent, updateEvent };
}
