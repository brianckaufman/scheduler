'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { formatDisplayName } from '@/lib/names';
import type { Participant } from '@/types';

interface BestTimesProps {
  overlapMap: Map<string, Set<string>>;
  totalParticipants: number;
  durationMinutes: number;
  participants: Participant[];
  onFinalize?: (time: string) => void;
}

export default function BestTimes({ overlapMap, totalParticipants, durationMinutes, participants, onFinalize }: BestTimesProps) {
  const bestBlocks = useMemo(() => {
    if (totalParticipants < 2) return [];

    // Each slot_start in the overlapMap is already a valid full-duration event
    // start time (generateSlots ensures the full duration fits the time window).
    // No contiguity check is needed — just rank and surface the best ones.
    return Array.from(overlapMap.entries())
      .filter(([, pSet]) => pSet.size >= 2)
      .map(([slotKey, pSet]) => {
        const endTime = new Date(new Date(slotKey).getTime() + durationMinutes * 60 * 1000);
        return {
          start: slotKey,
          end: endTime.toISOString(),
          participantIds: pSet,
          count: pSet.size,
        };
      })
      .sort((a, b) => b.count - a.count || a.start.localeCompare(b.start))
      .slice(0, 5);
  }, [overlapMap, totalParticipants, durationMinutes]);

  if (bestBlocks.length === 0) return null;

  const participantMap = new Map(participants.map((p) => [p.id, formatDisplayName(p.name)]));

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
                className="shrink-0 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
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
