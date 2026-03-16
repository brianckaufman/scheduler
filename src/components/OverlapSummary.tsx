'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { getFullOverlapSlots } from '@/lib/overlap';

interface OverlapSummaryProps {
  overlapMap: Map<string, Set<string>>;
  totalParticipants: number;
}

function mergeConsecutiveSlots(sortedSlots: string[]): { start: string; end: string }[] {
  if (sortedSlots.length === 0) return [];

  const ranges: { start: string; end: string }[] = [];
  let rangeStart = sortedSlots[0];
  let prev = new Date(sortedSlots[0]);

  for (let i = 1; i < sortedSlots.length; i++) {
    const curr = new Date(sortedSlots[i]);
    const diffMinutes = (curr.getTime() - prev.getTime()) / (1000 * 60);

    if (diffMinutes !== 30) {
      // Gap — close the current range
      const end = new Date(prev.getTime() + 30 * 60 * 1000);
      ranges.push({ start: rangeStart, end: end.toISOString() });
      rangeStart = sortedSlots[i];
    }
    prev = curr;
  }

  // Close the last range
  const end = new Date(prev.getTime() + 30 * 60 * 1000);
  ranges.push({ start: rangeStart, end: end.toISOString() });

  return ranges;
}

export default function OverlapSummary({
  overlapMap,
  totalParticipants,
}: OverlapSummaryProps) {
  const fullOverlapSlots = useMemo(
    () => getFullOverlapSlots(overlapMap, totalParticipants),
    [overlapMap, totalParticipants]
  );

  const mergedRanges = useMemo(
    () => mergeConsecutiveSlots(fullOverlapSlots),
    [fullOverlapSlots]
  );

  if (totalParticipants < 2) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
        Waiting for more participants to join...
      </div>
    );
  }

  if (mergedRanges.length === 0) {
    return (
      <div className="bg-amber-50 rounded-xl p-4 text-center text-sm text-amber-700">
        No times work for everyone yet. Keep adding your availability!
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-green-800 mb-2">
        Everyone can meet:
      </h3>
      <ul className="space-y-1">
        {mergedRanges.map((range) => (
          <li key={range.start} className="text-sm text-green-700">
            {format(new Date(range.start), 'EEE, MMM d')} &middot;{' '}
            {format(new Date(range.start), 'h:mm a')} &ndash;{' '}
            {format(new Date(range.end), 'h:mm a')}
          </li>
        ))}
      </ul>
    </div>
  );
}
