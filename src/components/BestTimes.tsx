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
  minResponses?: number | null;
}

export default function BestTimes({
  overlapMap,
  totalParticipants,
  durationMinutes,
  participants,
  onFinalize,
  minResponses,
}: BestTimesProps) {
  const bestBlocks = useMemo(() => {
    if (totalParticipants < 2) return [];

    // Each slot_start in the overlapMap is already a valid full-duration event
    // start time (generateSlots ensures the full duration fits the time window).
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

  // Rank by how many people are free, not by list position — several times can
  // tie for best, and tied times deserve equal prominence.
  const rankOf = useMemo(() => {
    const distinct = [...new Set(bestBlocks.map((b) => b.count))].sort((a, b) => b - a);
    return (count: number) => distinct.indexOf(count);
  }, [bestBlocks]);

  if (bestBlocks.length === 0) return null;

  const participantMap = new Map(participants.map((p) => [p.id, formatDisplayName(p.name)]));

  /**
   * The strongest overlap should be unmistakable and each step down visibly
   * quieter. Every hover state carries a dark variant — without one, hovering
   * in dark mode swaps in a light background under light text.
   */
  const rowClass = (rank: number) => {
    if (rank === 0) {
      return 'bg-green-50 dark:bg-[#112D25] border-2 border-green-400 dark:border-[#1E6B4C] shadow-sm hover:bg-green-100 dark:hover:bg-[#17402F]';
    }
    if (rank === 1) {
      return 'bg-green-50/60 dark:bg-[#0E211C] border border-green-200 dark:border-[#123428] hover:bg-green-50 dark:hover:bg-[#123028]';
    }
    return 'bg-subtle border border-hairline-soft hover:bg-fill/80';
  };

  // Response threshold state
  const threshold = minResponses && minResponses >= 2 ? minResponses : null;
  const thresholdMet = threshold === null || totalParticipants >= threshold;
  const thresholdPct = threshold
    ? Math.min(Math.round((totalParticipants / threshold) * 100), 100)
    : 100;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-body">Best times</h3>

      {/* Response threshold progress — shown when min_responses is set and not yet met */}
      {threshold && !thresholdMet && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-[#302817] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Waiting for responses</span>
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{totalParticipants} of {threshold}</span>
          </div>
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${thresholdPct}%` }}
            />
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {threshold - totalParticipants} more{' '}
            {threshold - totalParticipants === 1 ? 'person needs' : 'people need'} to respond
            before a time is ready to pick.
          </p>
        </div>
      )}

      {/* Best time slots */}
      {bestBlocks.map((block, i) => {
        const start = new Date(block.start);
        const names = Array.from(block.participantIds).map((id) => participantMap.get(id) || '?');
        const allFree = block.count === totalParticipants;
        const rank = rankOf(block.count);

        return (
          <div
            key={block.start}
            className={`animate-fade-in flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:shadow-sm ${rowClass(rank)}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-heading ${rank === 0 ? 'text-base font-bold' : 'text-sm font-medium'}`}>
                {format(start, 'EEE, MMM d')} &middot; {format(start, 'h:mm a')}
              </p>
              <p className={`text-xs truncate ${rank === 0 ? 'text-secondary' : 'text-muted'}`}>
                <span className={rank === 0 ? 'font-semibold' : ''}>
                  {block.count} of {totalParticipants} free
                </span>
                {' '}&middot; {names.join(', ')}
              </p>
            </div>

            {/* Badge: "All free" when everyone can make it, otherwise mark the
                strongest overlap. Its own darker fill so it stays visible on
                the rank-0 row (which now shares the old badge colour). */}
            {allFree && thresholdMet ? (
              <span className="shrink-0 text-xs font-semibold text-success-fg bg-green-200 dark:bg-[#1B4D3A] px-2 py-1 rounded-full animate-fade-in-scale">
                All free
              </span>
            ) : rank === 0 ? (
              <span className="shrink-0 text-xs font-semibold text-secondary bg-fill2 px-2 py-1 rounded-full animate-fade-in-scale">
                Most people
              </span>
            ) : null}

            {/* Pick button — always shown to organizer; amber when threshold not met */}
            {onFinalize && (
              <button
                type="button"
                onClick={() => onFinalize(block.start)}
                title={
                  !thresholdMet
                    ? `Only ${totalParticipants} of ${threshold} required responses received`
                    : undefined
                }
                className={`shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer ${
                  !thresholdMet
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-teal-500 hover:bg-teal-600'
                }`}
              >
                {!thresholdMet ? 'Pick anyway' : 'Pick'}
              </button>
            )}
          </div>
        );
      })}

      {/* Low response nudge — no threshold set, fewer than 3 people responded */}
      {!threshold && totalParticipants < 3 && (
        <p className="text-xs text-faint text-center pt-1">
          Share the link to collect more responses.
        </p>
      )}
    </div>
  );
}
