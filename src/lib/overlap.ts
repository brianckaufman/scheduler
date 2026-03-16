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
