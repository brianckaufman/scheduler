'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CreatedEvent {
  slug: string;
  name: string;
  createdAt: string;
  finalizedTime?: string | null;
  pinned?: boolean;
}

const STORAGE_KEY = 'created_events';
const USER_NAME_KEY = 'user_display_name';
const MAX_EVENTS = 200;
const AUTO_EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 hours after finalized time

/**
 * Tracks events created by the current user in localStorage.
 * Used to show returning users their past events on the homepage.
 * Auto-expires finalized events 24h after the chosen time.
 */
export function useCreatedEvents() {
  const [events, setEvents] = useState<CreatedEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CreatedEvent[];
        if (Array.isArray(parsed)) {
          // Auto-expire: remove finalized events older than 24h
          const now = Date.now();
          const active = parsed.filter((e) => {
            if (e.pinned) return true;
            if (!e.finalizedTime) return true;
            const finalizedAt = new Date(e.finalizedTime).getTime();
            return now - finalizedAt < AUTO_EXPIRE_MS;
          });
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

/** Get the user's display name saved from event creation */
export function getUserDisplayName(): string | null {
  try {
    return localStorage.getItem(USER_NAME_KEY);
  } catch {
    return null;
  }
}

/** Save the user's display name (called after creating an event) */
export function saveUserDisplayName(name: string) {
  try {
    localStorage.setItem(USER_NAME_KEY, name.trim());
  } catch {
    // ignore
  }
}
