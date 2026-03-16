'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import type { Participant } from '@/types';

interface BestTimesProps {
  overlapMap: Map<string, Set<string>>;
  totalParticipants: number;
  durationMinutes: number;
  participants: Participant[];
  onFinalize?: (time: string) => void;
}

interface TimeBlock {
  start: string;
  end: string;
  participantIds: Set<string>;
  count: number;
}

export default function BestTimes({ overlapMap, totalParticipants, durationMinutes, participants, onFinalize }: BestTimesProps) {
  const bestBlocks = useMemo(() => {
    if (totalParticipants < 2) return [];

    // Get all slot keys sorted by time
    const slots = Array.from(overlapMap.entries())
      .filter(([, pSet]) => pSet.size >= 2)
      .sort(([a], [b]) => a.localeCompare(b));

    if (slots.length === 0) return [];

    // Find contiguous blocks where the same set of people overlap
    const slotsNeeded = Math.max(1, Math.floor(durationMinutes / 30));
    const blocks: TimeBlock[] = [];

    for (let i = 0; i <= slots.length - slotsNeeded; i++) {
      const [startKey, startSet] = slots[i];
      const startTime = new Date(startKey).getTime();

      // Check if we have enough contiguous 30-min slots
      let valid = true;
      let minParticipants = startSet;

      for (let j = 1; j < slotsNeeded; j++) {
        const expectedTime = startTime + j * 30 * 60 * 1000;
        const nextSlot = slots[i + j];
        if (!nextSlot || new Date(nextSlot[0]).getTime() !== expectedTime) {
          valid = false;
          break;
        }
        // Intersect participants across all slots in the block
        const intersection = new Set<string>();
        for (const pid of minParticipants) {
          if (nextSlot[1].has(pid)) intersection.add(pid);
        }
        minParticipants = intersection;
      }

      if (valid && minParticipants.size >= 2) {
        const endTime = new Date(startTime + slotsNeeded * 30 * 60 * 1000);
        blocks.push({
          start: startKey,
          end: endTime.toISOString(),
          participantIds: minParticipants,
          count: minParticipants.size,
        });
      }
    }

    // Sort by most participants, then by time
    blocks.sort((a, b) => b.count - a.count || a.start.localeCompare(b.start));

    // Deduplicate overlapping blocks — keep the best per time window
    const seen = new Set<string>();
    return blocks.filter((block) => {
      const key = block.start;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [overlapMap, totalParticipants, durationMinutes]);

  if (bestBlocks.length === 0) return null;

  const participantMap = new Map(participants.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Best times</h3>
      {bestBlocks.map((block, i) => {
        const start = new Date(block.start);
        const names = Array.from(block.participantIds).map((id) => participantMap.get(id) || '?');

        return (
          <div
            key={block.start}
            className="animate-fade-in flex items-center gap-3 bg-gray-50 rounded-xl p-3 transition-all duration-200 hover:shadow-sm hover:bg-gray-100/80"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {format(start, 'EEE, MMM d')} &middot; {format(start, 'h:mm a')}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {block.count}/{totalParticipants} &middot; {names.join(', ')}
              </p>
            </div>
            {block.count === totalParticipants && (
              <span className="shrink-0 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full animate-fade-in-scale">
                All available
              </span>
            )}
            {onFinalize && (
              <button
                type="button"
                onClick={() => onFinalize(block.start)}
                className="shrink-0 text-xs font-medium text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-full transition-all duration-200 active:scale-95"
              >
                Pick
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
