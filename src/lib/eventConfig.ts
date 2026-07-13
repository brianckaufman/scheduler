// Polished Pro — per-event module toggles, stored in events.config (JSONB).
// Components read getModules(event); the Customize panel writes overrides.
import { getKindModuleDefaults } from './eventTypes';

export interface EventModules {
  countdown: boolean;
  map: boolean;
  attendeeStack: boolean;
  rsvpProgress: boolean;
  confetti: boolean;
  calendar: boolean;
  organizer: boolean;
  description: boolean;
}

export interface EventConfig {
  modules?: Partial<EventModules>;
}

/** Sensible defaults — everything on. Event-type presets refine these later. */
export const DEFAULT_MODULES: EventModules = {
  countdown: true,
  map: true,
  attendeeStack: true,
  rsvpProgress: true,
  confetti: true,
  calendar: true,
  organizer: true,
  description: true,
};

/**
 * Resolve a final module set: base defaults → event-kind preset → the event's
 * explicit overrides. Tolerates null/missing at every layer.
 */
export function getModules(
  event: { config?: EventConfig | null; event_kind?: string | null } | null | undefined,
): EventModules {
  // Imported lazily to avoid a circular import (eventTypes imports this file's types only).
  const kindDefaults = getKindModuleDefaults(event?.event_kind);
  const overrides = (event?.config?.modules ?? {}) as Partial<EventModules>;
  return { ...DEFAULT_MODULES, ...kindDefaults, ...overrides };
}

/** Server-side: keep only known module keys with boolean values. */
export function sanitizeConfig(input: unknown): EventConfig {
  const out: EventConfig = {};
  if (input && typeof input === 'object') {
    const modules = (input as { modules?: unknown }).modules;
    if (modules && typeof modules === 'object') {
      const clean: Partial<EventModules> = {};
      for (const k of Object.keys(DEFAULT_MODULES) as (keyof EventModules)[]) {
        const v = (modules as Record<string, unknown>)[k];
        if (typeof v === 'boolean') clean[k] = v;
      }
      out.modules = clean;
    }
  }
  return out;
}

/** Host-facing toggle list (key, label, hint). Order = display order. */
export const MODULE_TOGGLES: { key: keyof EventModules; label: string; hint: string }[] = [
  { key: 'countdown', label: 'Countdown timer', hint: 'Live days/hrs/min until the event' },
  { key: 'attendeeStack', label: 'Attendee avatars', hint: 'Overlapping avatars + “N going”' },
  { key: 'rsvpProgress', label: 'RSVP progress bar', hint: 'Going / maybe / can’t breakdown' },
  { key: 'map', label: 'Map preview', hint: 'Static map for physical locations' },
  { key: 'calendar', label: 'Add to calendar', hint: 'ICS / calendar buttons' },
  { key: 'organizer', label: 'Organizer attribution', hint: 'Show who’s hosting' },
  { key: 'description', label: 'Details block', hint: 'Show your Additional Details text' },
  { key: 'confetti', label: 'Celebratory confetti', hint: 'Confetti burst on RSVP' },
];

/**
 * Toggles that only affect the fixed (RSVP) event view — attendee avatars,
 * RSVP progress, "add to calendar", and confetti are all rendered exclusively
 * in RSVPView. Hidden from the Show/hide list when creating or editing a
 * Find-a-Time (availability) event, since toggling them has no visible effect there.
 */
export const FIXED_ONLY_MODULES: (keyof EventModules)[] = ['attendeeStack', 'rsvpProgress', 'calendar', 'confetti'];
