import type { AvailabilitySlot } from '@/types';

export function computeOverlap(
  allSlots: AvailabilitySlot[]
): Map<string, Set<string>> {
  const countMap = new Map<string, Set<string>>();

  for (const slot of allSlots) {
    const key = new Date(slot.slot_start).toISOString();
    if (!countMap.has(key)) countMap.set(key, new Set());
    countMap.get(key)!.add(slot.participant_id);
  }

  return countMap;
}

export function getFullOverlapSlots(
  overlapMap: Map<string, Set<string>>,
  totalParticipants: number
): string[] {
  if (totalParticipants === 0) return [];
  return Array.from(overlapMap.entries())
    .filter(([, participants]) => participants.size === totalParticipants)
    .map(([slotKey]) => slotKey)
    .sort();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when dateB ('yyyy-MM-dd') is the calendar day immediately after dateA. */
export function areAdjacentDays(dateA: string, dateB: string): boolean {
  // Parse as UTC midnight so DST transitions never make two calendar days look
  // 23 or 25 hours apart. The date strings are plain 'yyyy-MM-dd'.
  return Date.parse(`${dateB}T00:00:00Z`) - Date.parse(`${dateA}T00:00:00Z`) === DAY_MS;
}

function intersectSets(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

/** A run of consecutive calendar days and the people free on *every* day of it. */
export interface DayWindow {
  startKey: string; // ISO instant of the first day (a dayKeys entry)
  endKey: string; // ISO instant of the last day
  startIdx: number; // index into the parallel dayKeys / sortedDates arrays
  endIdx: number;
  length: number; // number of days in the window (inclusive)
  attendees: Set<string>; // participants available on every day in the window
}

/**
 * Find blocks of consecutive calendar days for trip/vacation planning.
 *
 * Unlike per-day overlap, a trip needs the *same* people free across an
 * *unbroken* run of days — so this intersects the available-participant sets
 * day by day (a window's attendees = people free on all of its days) and only
 * ever extends across calendar-adjacent days (gaps in the proposed dates break
 * a run; two dates that aren't back-to-back can never share a block).
 *
 * For each start day it walks forward emitting one candidate per "plateau" —
 * each maximal stretch over which the attendee set stays constant — so a run
 * like all-6-free for 4 days then 5-free for 2 more surfaces *both* the tight
 * 4-day block and the looser 6-day one. Windows shorter than `minLength`, or
 * whose attendee count falls below `minAttendees`, are skipped. Redundant
 * windows (fully contained in another with the same-or-larger attendee set) are
 * dropped, and the rest are ranked most-attendees-then-longest-then-earliest.
 *
 * @param dayKeys     ISO instants, one per proposed day, ascending.
 * @param sortedDates 'yyyy-MM-dd' strings parallel to dayKeys (for adjacency).
 * @param overlapMap  dayKey -> set of participant ids free that day.
 */
export function findConsecutiveWindows(
  dayKeys: string[],
  sortedDates: string[],
  overlapMap: Map<string, Set<string>>,
  opts: { minLength: number; minAttendees: number }
): DayWindow[] {
  const minLength = Math.max(1, opts.minLength);
  const minAttendees = Math.max(1, opts.minAttendees);
  const n = dayKeys.length;
  const raw: DayWindow[] = [];

  for (let i = 0; i < n; i++) {
    let cur = new Set(overlapMap.get(dayKeys[i]) ?? []);
    if (cur.size < minAttendees) continue;
    let end = i;

    // Walk forward. Extending across a plateau (attendee set unchanged) just
    // grows the window; a shrink or a break records the plateau [i..end] then
    // either steps down to the smaller set or stops.
    for (;;) {
      const k = end + 1;
      const canExtend = k < n && areAdjacentDays(sortedDates[end], sortedDates[k]);
      const next = canExtend
        ? intersectSets(cur, overlapMap.get(dayKeys[k]) ?? new Set<string>())
        : new Set<string>();

      if (canExtend && next.size >= minAttendees && next.size === cur.size) {
        end = k;
        cur = next;
        continue;
      }

      if (end - i + 1 >= minLength) {
        raw.push({
          startKey: dayKeys[i],
          endKey: dayKeys[end],
          startIdx: i,
          endIdx: end,
          length: end - i + 1,
          attendees: new Set(cur),
        });
      }

      if (canExtend && next.size >= minAttendees) {
        end = k;
        cur = next;
        continue;
      }
      break;
    }
  }

  // Rank strongest first, then drop any window fully contained in an already-
  // kept one whose attendee set is a superset (it adds nothing new).
  raw.sort(
    (a, b) => b.attendees.size - a.attendees.size || b.length - a.length || a.startIdx - b.startIdx
  );
  const kept: DayWindow[] = [];
  for (const w of raw) {
    const dominated = kept.some(
      (v) =>
        v.startIdx <= w.startIdx &&
        v.endIdx >= w.endIdx &&
        isSuperset(v.attendees, w.attendees)
    );
    if (!dominated) kept.push(w);
  }
  return kept;
}

function isSuperset(a: Set<string>, b: Set<string>): boolean {
  if (a.size < b.size) return false;
  for (const x of b) if (!a.has(x)) return false;
  return true;
}

/** Who's keeping a window from working, and exactly which days they're out. */
export interface WindowBlocker {
  id: string;
  missingDates: string[]; // 'yyyy-MM-dd' days within the window they're unavailable
}

/**
 * For a window, list the participants who are NOT free every day of it, with the
 * specific dates each is missing — the actionable "nudge Dana about Aug 4" data
 * behind a near-miss suggestion.
 */
export function blockersForWindow(
  window: DayWindow,
  dayKeys: string[],
  sortedDates: string[],
  overlapMap: Map<string, Set<string>>,
  allParticipantIds: Iterable<string>
): WindowBlocker[] {
  const blockers: WindowBlocker[] = [];
  for (const id of allParticipantIds) {
    if (window.attendees.has(id)) continue;
    const missingDates: string[] = [];
    for (let i = window.startIdx; i <= window.endIdx; i++) {
      if (!(overlapMap.get(dayKeys[i])?.has(id))) missingDates.push(sortedDates[i]);
    }
    blockers.push({ id, missingDates });
  }
  return blockers;
}
