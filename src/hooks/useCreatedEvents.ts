'use client';

import { useState, useEffect, useCallback } from 'react';

interface CreatedEvent {
  slug: string;
  name: string;
  createdAt: string;
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

  const addEvent = useCallback((slug: string, name: string) => {
    setEvents((prev) => {
      // Don't add duplicates
      if (prev.some((e) => e.slug === slug)) return prev;
      const updated = [
        { slug, name, createdAt: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_EVENTS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage full, ignore
      }
      return updated;
    });
  }, []);

  return { events, loaded, addEvent };
}
