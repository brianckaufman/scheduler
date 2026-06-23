// Polished Pro — event-type framework. A "kind" is a semantic preset that seeds
// module defaults + tone. Orthogonal to event_type (availability | fixed).
// The framework is config-driven: adding a kind here is mostly data, not new UI.
import type { EventModules } from './eventConfig';

export type EventKind = 'casual' | 'birthday' | 'wedding' | 'corporate';

export interface EventKindPreset {
  key: EventKind;
  label: string;
  emoji: string;
  description: string;
  /** Module on/off defaults for this kind (merged over DEFAULT_MODULES). */
  moduleDefaults: Partial<EventModules>;
}

export const EVENT_KINDS: EventKindPreset[] = [
  {
    key: 'casual',
    label: 'Casual',
    emoji: '🎉',
    description: 'Get-togethers, hangouts, anything low-key.',
    moduleDefaults: {}, // everything on
  },
  {
    key: 'birthday',
    label: 'Birthday / Party',
    emoji: '🎂',
    description: 'Celebrations — confetti, countdown, who’s coming.',
    moduleDefaults: { countdown: true, attendeeStack: true, confetti: true },
  },
  {
    key: 'wedding',
    label: 'Wedding',
    emoji: '💍',
    description: 'Elegant. Map + countdown, breakdown kept tasteful.',
    moduleDefaults: { map: true, countdown: true, rsvpProgress: false, confetti: true },
  },
  {
    key: 'corporate',
    label: 'Corporate',
    emoji: '🏢',
    description: 'Professional. No confetti, details forward.',
    moduleDefaults: { confetti: false, attendeeStack: false, countdown: true, description: true },
  },
];

const BY_KEY: Record<EventKind, EventKindPreset> = Object.fromEntries(
  EVENT_KINDS.map((k) => [k.key, k]),
) as Record<EventKind, EventKindPreset>;

export function isEventKind(v: unknown): v is EventKind {
  return typeof v === 'string' && v in BY_KEY;
}

export function getKindPreset(kind: string | null | undefined): EventKindPreset {
  return (kind && isEventKind(kind) && BY_KEY[kind]) || BY_KEY.casual;
}

export function getKindModuleDefaults(kind: string | null | undefined): Partial<EventModules> {
  return getKindPreset(kind).moduleDefaults;
}
