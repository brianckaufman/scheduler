'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { formatDisplayName } from '@/lib/names';
import { areAdjacentDays } from '@/lib/overlap';
import type { Participant } from '@/types';

interface BestDaysProps {
  /** Every proposed day, sorted ascending — ISO slot keys from generateAllDaySlots. */
  dayKeys: string[];
  /** 'yyyy-MM-dd' strings parallel to dayKeys, so a range never spans a gap. */
  sortedDates: string[];
  overlapMap: Map<string, Set<string>>;
  totalParticipants: number;
  participants: Participant[];
  onFinalize?: (startDate: string, endDate: string) => void;
  minResponses?: number | null;
}

interface RangeCandidate {
  startIdx: number;
  endIdx: number;
  count: number;
  participantIds: Set<string>;
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

export default function BestDays({
  dayKeys,
  sortedDates,
  overlapMap,
  totalParticipants,
  participants,
  onFinalize,
  minResponses,
}: BestDaysProps) {
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, formatDisplayName(p.name)])),
    [participants]
  );

  // Best contiguous run starting at each day — the longest, strongest-overlap
  // range where every day in the range has at least 2 people in common.
  const bestRanges = useMemo(() => {
    if (totalParticipants < 2) return [];
    const candidates: RangeCandidate[] = [];

    for (let i = 0; i < dayKeys.length; i++) {
      let running = new Set(overlapMap.get(dayKeys[i]) ?? []);
      if (running.size < 2) continue;
      let best: RangeCandidate = { startIdx: i, endIdx: i, count: running.size, participantIds: running };

      for (let j = i + 1; j < dayKeys.length; j++) {
        // A range must be an unbroken run of calendar days — stop at any gap in
        // the proposed dates so we never report a span that jumps a hole.
        if (!areAdjacentDays(sortedDates[j - 1], sortedDates[j])) break;
        const dayset = overlapMap.get(dayKeys[j]) ?? new Set<string>();
        running = intersect(running, dayset);
        if (running.size < 2) break;
        // Prefer the longer range when it doesn't shrink the overlap count.
        if (running.size >= best.count) {
          best = { startIdx: i, endIdx: j, count: running.size, participantIds: running };
        }
      }
      candidates.push(best);
    }

    return candidates
      .sort((a, b) => b.count - a.count || (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx))
      .slice(0, 5);
  }, [dayKeys, sortedDates, overlapMap, totalParticipants]);

  // Per-day counts, for the manual range picker's day chips.
  const dayCounts = useMemo(
    () => dayKeys.map((key) => ({ key, count: overlapMap.get(key)?.size ?? 0 })),
    [dayKeys, overlapMap]
  );

  const threshold = minResponses && minResponses >= 2 ? minResponses : null;
  const thresholdMet = threshold === null || totalParticipants >= threshold;

  const handlePickCandidate = (c: RangeCandidate) => {
    onFinalize?.(dayKeys[c.startIdx], dayKeys[c.endIdx]);
  };

  const handleDayClick = (idx: number) => {
    if (rangeStart === null || (rangeStart !== null && rangeEnd !== null)) {
      setRangeStart(idx);
      setRangeEnd(null);
    } else if (idx < rangeStart) {
      setRangeStart(idx);
    } else {
      setRangeEnd(idx);
    }
  };

  const finalizeManualRange = () => {
    if (rangeStart === null) return;
    const endIdx = rangeEnd ?? rangeStart;
    onFinalize?.(dayKeys[rangeStart], dayKeys[endIdx]);
  };

  if (dayKeys.length === 0) return null;

  return (
    <div className="space-y-4">
      {bestRanges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-body">Best day ranges</h3>

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
            </div>
          )}

          {bestRanges.map((c, i) => {
            const start = new Date(dayKeys[c.startIdx]);
            const end = new Date(dayKeys[c.endIdx]);
            const isSingleDay = c.startIdx === c.endIdx;
            const names = Array.from(c.participantIds).map((id) => participantMap.get(id) || '?');
            const allFree = c.count === totalParticipants;
            const dayCount = c.endIdx - c.startIdx + 1;

            return (
              <div
                key={`${c.startIdx}-${c.endIdx}`}
                className={`animate-fade-in flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:shadow-sm ${
                  allFree && thresholdMet
                    ? 'bg-green-50 dark:bg-[#112D25] border border-green-100 dark:border-[#123428] hover:bg-green-100/60'
                    : 'bg-subtle hover:bg-fill/80'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading">
                    {isSingleDay
                      ? format(start, 'EEE, MMM d')
                      : `${format(start, 'MMM d')} – ${format(end, 'MMM d')} (${dayCount} days)`}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {c.count} of {totalParticipants} free every day &middot; {names.join(', ')}
                  </p>
                </div>

                {allFree && thresholdMet && (
                  <span className="shrink-0 text-xs font-medium text-success-fg bg-green-100 dark:bg-[#112D25] px-2 py-1 rounded-full animate-fade-in-scale">
                    All free
                  </span>
                )}

                {onFinalize && (
                  <button
                    type="button"
                    onClick={() => handlePickCandidate(c)}
                    title={!thresholdMet ? `Only ${totalParticipants} of ${threshold} required responses received` : undefined}
                    className={`shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer ${
                      !thresholdMet ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-500 hover:bg-teal-600'
                    }`}
                  >
                    {!thresholdMet ? 'Pick anyway' : 'Pick'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual range picker — tap a start day, then an end day, for exact control */}
      {onFinalize && (
        <div className="space-y-2 pt-1 border-t border-hairline-soft">
          <h3 className="text-sm font-semibold text-body pt-3">
            Or pick your own range
          </h3>
          <p className="text-xs text-faint">
            {rangeStart === null
              ? 'Tap a day to start'
              : rangeEnd === null
                ? `Start: ${format(new Date(dayKeys[rangeStart]), 'MMM d')} — tap another day to end, or the same day again`
                : `${format(new Date(dayKeys[rangeStart]), 'MMM d')} – ${format(new Date(dayKeys[rangeEnd]), 'MMM d')} selected`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dayCounts.map(({ key, count }, idx) => {
              const inRange = rangeStart !== null && idx >= rangeStart && idx <= (rangeEnd ?? rangeStart);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDayClick(idx)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    inRange
                      ? 'bg-teal-500 text-white'
                      : count > 0
                        ? 'bg-subtle text-body hover:bg-fill'
                        : 'bg-fill text-faint hover:bg-fill2'
                  }`}
                >
                  {format(new Date(key), 'EEE M/d')}
                  {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
                </button>
              );
            })}
          </div>
          {rangeStart !== null && (
            <button
              type="button"
              onClick={finalizeManualRange}
              className="w-full mt-2 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              Finalize this range
            </button>
          )}
        </div>
      )}

      {bestRanges.length === 0 && !onFinalize && (
        <p className="text-xs text-faint text-center pt-1">
          Share the link to collect more responses.
        </p>
      )}
    </div>
  );
}
