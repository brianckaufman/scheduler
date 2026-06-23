// Polished Pro — per-event module toggles, stored in events.config (JSONB).
// Components read getModules(event); the Customize panel writes overrides.

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

/** Merge an event's stored toggles over the defaults. Tolerates null/missing. */
export function getModules(event: { config?: EventConfig | null } | null | undefined): EventModules {
  const overrides = (event?.config?.modules ?? {}) as Partial<EventModules>;
  return { ...DEFAULT_MODULES, ...overrides };
}
