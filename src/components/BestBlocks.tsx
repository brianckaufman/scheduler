'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { formatDisplayName } from '@/lib/names';
import { findConsecutiveWindows, blockersForWindow, areAdjacentDays, type DayWindow } from '@/lib/overlap';
import type { Participant } from '@/types';

interface BestBlocksProps {
  /** ISO instants, one per proposed day, ascending. Parallel to sortedDates. */
  dayKeys: string[];
  /** 'yyyy-MM-dd' strings parallel to dayKeys (used for calendar adjacency). */
  sortedDates: string[];
  overlapMap: Map<string, Set<string>>;
  totalParticipants: number;
  participants: Participant[];
  /** Required length of the consecutive-day block (>= 2). */
  minBlockDays: number;
  onFinalize?: (startKey: string, endKey: string) => void;
  minResponses?: number | null;
}

/** "Aug 2" or, for a run, "Aug 2 – 5" / "Aug 30 – Sep 2". */
function formatDayRange(startDate: string, endDate: string): string {
  const s = parseISO(startDate);
  const e = parseISO(endDate);
  if (startDate === endDate) return format(s, 'EEE, MMM d');
  const sameMonth = format(s, 'MMM yyyy') === format(e, 'MMM yyyy');
  return `${format(s, 'MMM d')} – ${sameMonth ? format(e, 'd') : format(e, 'MMM d')}`;
}

/** "Aug 4" or "Aug 4, 6" — the specific days a blocker is unavailable. */
function formatMissingDates(dates: string[]): string {
  const shown = dates.slice(0, 3).map((d) => format(parseISO(d), 'MMM d'));
  const extra = dates.length - shown.length;
  return shown.join(', ') + (extra > 0 ? ` +${extra}` : '');
}

/**
 * Block-aware counterpart to BestDays for trip/vacation planning. Instead of
 * ranking individually-free days, it surfaces unbroken runs of >= minBlockDays
 * consecutive days: blocks that work for everyone first, then — when none do —
 * the closest near-miss windows, naming exactly who's out and on which day so
 * the organizer knows who to nudge.
 */
export default function BestBlocks({
  dayKeys,
  sortedDates,
  overlapMap,
  totalParticipants,
  participants,
  minBlockDays,
  onFinalize,
  minResponses,
}: BestBlocksProps) {
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, formatDisplayName(p.name)])),
    [participants]
  );
  const allParticipantIds = useMemo(() => participants.map((p) => p.id), [participants]);

  // Blocks of >= minBlockDays consecutive days, ranked most-attendees-first.
  const windows = useMemo(
    () =>
      totalParticipants < 2
        ? []
        : findConsecutiveWindows(dayKeys, sortedDates, overlapMap, {
            minLength: minBlockDays,
            minAttendees: 2,
          }),
    [dayKeys, sortedDates, overlapMap, minBlockDays, totalParticipants]
  );

  const fullBlocks = useMemo(
    () => windows.filter((w) => w.attendees.size === totalParticipants),
    [windows, totalParticipants]
  );

  // Closest blocks nobody-quite-makes: the highest-attendance near-misses.
  const nearMisses = useMemo(() => {
    const misses = windows.filter((w) => w.attendees.size < totalParticipants);
    if (misses.length === 0) return [];
    const top = misses[0].attendees.size;
    return misses.filter((w) => w.attendees.size === top).slice(0, 4);
  }, [windows, totalParticipants]);

  // Fallback relaxation: everyone IS free for a shorter run than the target.
  const shorterFullBlock = useMemo(() => {
    if (fullBlocks.length > 0 || totalParticipants < 2) return null;
    const anyLen = findConsecutiveWindows(dayKeys, sortedDates, overlapMap, {
      minLength: 2,
      minAttendees: totalParticipants,
    });
    // findConsecutiveWindows ranks full-attendance blocks by length desc.
    const longest = anyLen.find((w) => w.attendees.size === totalParticipants);
    return longest && longest.length < minBlockDays ? longest : null;
  }, [fullBlocks.length, dayKeys, sortedDates, overlapMap, totalParticipants, minBlockDays]);

  const threshold = minResponses && minResponses >= 2 ? minResponses : null;
  const thresholdMet = threshold === null || totalParticipants >= threshold;

  const describeBlockers = (w: DayWindow): string => {
    const blockers = blockersForWindow(w, dayKeys, sortedDates, overlapMap, allParticipantIds);
    if (blockers.length === 0) return '';
    return blockers
      .slice(0, 3)
      .map((b) => `${participantMap.get(b.id) || '?'} (${formatMissingDates(b.missingDates)})`)
      .join(', ') + (blockers.length > 3 ? `, +${blockers.length - 3} more` : '');
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

  // Manual selection validated against the block requirement + adjacency.
  const manualInfo = useMemo(() => {
    if (rangeStart === null) return null;
    const endIdx = rangeEnd ?? rangeStart;
    const len = endIdx - rangeStart + 1;
    let contiguous = true;
    for (let i = rangeStart; i < endIdx; i++) {
      if (i + 1 >= sortedDates.length) break;
      // Only care about adjacency of the selected span itself.
      if (i < endIdx && !areAdjacentDays(sortedDates[i], sortedDates[i + 1])) contiguous = false;
    }
    let free = new Set(overlapMap.get(dayKeys[rangeStart]) ?? []);
    for (let i = rangeStart + 1; i <= endIdx; i++) {
      const day = overlapMap.get(dayKeys[i]) ?? new Set<string>();
      free = new Set([...free].filter((x) => day.has(x)));
    }
    return { len, contiguous, freeCount: free.size };
  }, [rangeStart, rangeEnd, dayKeys, sortedDates, overlapMap]);

  const finalizeManualRange = () => {
    if (rangeStart === null) return;
    const endIdx = rangeEnd ?? rangeStart;
    onFinalize?.(dayKeys[rangeStart], dayKeys[endIdx]);
  };

  if (dayKeys.length === 0) return null;

  const renderBlockRow = (w: DayWindow, i: number, full: boolean) => {
    const dayCount = w.length;
    const blockerText = full ? '' : describeBlockers(w);
    return (
      <div
        key={`${w.startIdx}-${w.endIdx}`}
        className={`animate-fade-in flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:shadow-sm ${
          full && thresholdMet
            ? 'bg-green-50 dark:bg-[#112D25] border border-green-100 dark:border-[#123428] hover:bg-green-100/60'
            : 'bg-subtle hover:bg-fill/80'
        }`}
        style={{ animationDelay: `${i * 80}ms` }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-heading">
            {formatDayRange(sortedDates[w.startIdx], sortedDates[w.endIdx])}{' '}
            <span className="text-muted font-normal">({dayCount} days)</span>
          </p>
          <p className="text-xs text-muted truncate">
            {w.attendees.size} of {totalParticipants} free every day
            {blockerText && <> &middot; Missing: {blockerText}</>}
          </p>
        </div>

        {full && thresholdMet && (
          <span className="shrink-0 text-xs font-medium text-success-fg bg-green-100 dark:bg-[#112D25] px-2 py-1 rounded-full animate-fade-in-scale">
            All free
          </span>
        )}

        {onFinalize && (
          <button
            type="button"
            onClick={() => onFinalize(w.startKey, w.endKey)}
            title={!thresholdMet ? `Only ${totalParticipants} of ${threshold} required responses received` : undefined}
            className={`shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer ${
              !thresholdMet ? 'bg-amber-500 hover:bg-amber-600' : full ? 'bg-teal-500 hover:bg-teal-600' : 'bg-slate-500 hover:bg-slate-600'
            }`}
          >
            {!thresholdMet ? 'Pick anyway' : full ? 'Pick' : 'Pick anyway'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {threshold && !thresholdMet && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-[#302817] p-3">
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

      {/* Blocks that work for everyone */}
      {fullBlocks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-body">
            {minBlockDays}+ day blocks that work for everyone
          </h3>
          {fullBlocks.map((w, i) => renderBlockRow(w, i, true))}
        </div>
      )}

      {/* No full block: closest near-misses, naming who's out */}
      {fullBlocks.length === 0 && nearMisses.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50 dark:bg-[#302817] p-3 text-xs text-amber-800 dark:text-amber-300">
            No {minBlockDays}-day block works for all {totalParticipants} yet. Here are the closest — nudge whoever&apos;s out on the highlighted day, and it opens up.
          </div>
          <h3 className="text-sm font-semibold text-body">Closest {minBlockDays}-day blocks</h3>
          {nearMisses.map((w, i) => renderBlockRow(w, i, false))}
        </div>
      )}

      {/* Fallback: everyone's free, just for a shorter run than requested */}
      {fullBlocks.length === 0 && shorterFullBlock && (
        <div className="rounded-xl bg-subtle p-3 text-xs text-muted">
          Everyone&apos;s free for {shorterFullBlock.length} consecutive days
          {' '}({formatDayRange(sortedDates[shorterFullBlock.startIdx], sortedDates[shorterFullBlock.endIdx])})
          {' '}— {minBlockDays - shorterFullBlock.length} short of your {minBlockDays}-day target.
          {onFinalize && (
            <button
              type="button"
              onClick={() => onFinalize(shorterFullBlock.startKey, shorterFullBlock.endKey)}
              className="ml-1 font-semibold text-teal-600 hover:text-teal-800 underline cursor-pointer"
            >
              Pick these {shorterFullBlock.length} days
            </button>
          )}
        </div>
      )}

      {fullBlocks.length === 0 && nearMisses.length === 0 && !shorterFullBlock && (
        <div className="rounded-xl bg-amber-50 dark:bg-[#302817] p-4 text-center text-sm text-amber-700 dark:text-amber-400">
          No block of {minBlockDays} consecutive days overlaps yet.
          <p className="text-xs mt-1">Collect more responses, or propose a wider range of dates.</p>
        </div>
      )}

      {/* Manual range picker with block-length validation */}
      {onFinalize && (
        <div className="space-y-2 pt-1 border-t border-hairline-soft">
          <h3 className="text-sm font-semibold text-body pt-3">Or pick your own block</h3>
          <p className="text-xs text-faint">
            {rangeStart === null
              ? 'Tap a start day, then an end day'
              : rangeEnd === null
                ? `Start: ${format(parseISO(sortedDates[rangeStart]), 'MMM d')} — tap the last day`
                : `${format(parseISO(sortedDates[rangeStart]), 'MMM d')} – ${format(parseISO(sortedDates[rangeEnd]), 'MMM d')} selected`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sortedDates.map((date, idx) => {
              const count = overlapMap.get(dayKeys[idx])?.size ?? 0;
              const inRange = rangeStart !== null && idx >= rangeStart && idx <= (rangeEnd ?? rangeStart);
              return (
                <button
                  key={date}
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
                  {format(parseISO(date), 'EEE M/d')}
                  {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
                </button>
              );
            })}
          </div>
          {manualInfo && (
            <p className={`text-xs ${manualInfo.len < minBlockDays || !manualInfo.contiguous ? 'text-amber-600' : 'text-muted'}`}>
              {manualInfo.len} day{manualInfo.len !== 1 ? 's' : ''}
              {!manualInfo.contiguous && ' · not consecutive (has a gap)'}
              {manualInfo.contiguous && manualInfo.len < minBlockDays && ` · shorter than your ${minBlockDays}-day target`}
              {' · '}
              {manualInfo.freeCount} of {totalParticipants} free every day
            </p>
          )}
          {rangeStart !== null && (
            <button
              type="button"
              onClick={finalizeManualRange}
              className="w-full mt-2 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              Finalize this block
            </button>
          )}
        </div>
      )}
    </div>
  );
}
