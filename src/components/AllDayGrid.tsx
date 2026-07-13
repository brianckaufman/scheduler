'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayName } from '@/lib/names';
import { generateAllDaySlots } from '@/lib/slots';
import { computeOverlap } from '@/lib/overlap';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import { useRealtimeParticipants } from '@/hooks/useRealtimeParticipants';
import TimeGridSlot, { PARTICIPANT_COLORS } from './TimeGridSlot';
import BestDays from './BestDays';
import AnimatedNumber from './AnimatedNumber';
import { getTimezoneLabel } from '@/lib/timezones';
import type { Event } from '@/types';

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(10); } catch { /* ignore */ }
  }
}

interface AllDayGridProps {
  event: Event;
  participantId: string;
  isOrganizer?: boolean;
  organizerToken?: string | null;
  onFinalize?: (startISO: string, endDate: string) => void;
  onMySlotCountChange?: (count: number) => void;
  onParticipantCountChange?: (count: number) => void;
}

/**
 * Whole-day availability grid — the all-day counterpart to TimeGrid. Each row
 * is one calendar day (not a date×time matrix), reusing TimeGridSlot (already
 * generic over slot keys) for the actual toggle/heat-map cell.
 */
export default function AllDayGrid({ event, participantId, isOrganizer, organizerToken, onFinalize, onMySlotCountChange, onParticipantCountChange }: AllDayGridProps) {
  const { slots: allSlots, removeByParticipant: removeSlotsForParticipant } = useRealtimeSlots(event.id);
  const { participants, removeParticipant } = useRealtimeParticipants(event.id);

  const [stagedAdds, setStagedAdds] = useState<Set<string>>(new Set());
  const [stagedRemoves, setStagedRemoves] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const draggedSlots = useRef<Set<string>>(new Set());

  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);

  useEffect(() => () => clearTimeout(savedToastTimer.current), []);

  // Sorted 'yyyy-MM-dd' dates, kept parallel with dayKeys below (index i in
  // sortedDates corresponds to index i in dayKeys) so a finalized range can be
  // stored as the plain end date without re-deriving it from an ISO instant.
  const sortedDates = useMemo(() => [...event.dates].sort(), [event.dates]);
  const dayKeys = useMemo(
    () => generateAllDaySlots(sortedDates, event.timezone),
    [sortedDates, event.timezone]
  );

  const overlapMap = useMemo(() => computeOverlap(allSlots), [allSlots]);

  const serverMySlots = useMemo(() => {
    const set = new Set<string>();
    for (const slot of allSlots) {
      if (slot.participant_id === participantId) {
        set.add(new Date(slot.slot_start).toISOString());
      }
    }
    return set;
  }, [allSlots, participantId]);

  const mySlots = useMemo(() => {
    const set = new Set(serverMySlots);
    for (const key of stagedAdds) set.add(key);
    for (const key of stagedRemoves) set.delete(key);
    return set;
  }, [serverMySlots, stagedAdds, stagedRemoves]);

  const hasStagedChanges = stagedAdds.size > 0 || stagedRemoves.size > 0;

  const mySlotCount = mySlots.size;
  useEffect(() => { onMySlotCountChange?.(mySlotCount); }, [mySlotCount, onMySlotCountChange]);

  const totalParticipants = participants.length;
  useEffect(() => { onParticipantCountChange?.(totalParticipants); }, [totalParticipants, onParticipantCountChange]);

  const canSeeNames = isOrganizer || !event.hide_guest_list;

  const participantColorMap = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p, i) => map.set(p.id, PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]));
    return map;
  }, [participants]);

  const toggleSlot = useCallback((slotKey: string, forceMode?: 'add' | 'remove') => {
    const isCurrentlySelected = mySlots.has(slotKey);
    const shouldRemove = forceMode === 'remove' || (!forceMode && isCurrentlySelected);
    if (shouldRemove) {
      setStagedRemoves((prev) => new Set(prev).add(slotKey));
      setStagedAdds((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });
    } else {
      setStagedAdds((prev) => new Set(prev).add(slotKey));
      setStagedRemoves((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });
    }
  }, [mySlots]);

  const handleSave = useCallback(async () => {
    if (isSaving || !hasStagedChanges) return;
    setIsSaving(true);
    const supabase = createClient();
    const toInsert = [...stagedAdds].filter((s) => !serverMySlots.has(s));
    const toDelete = [...stagedRemoves].filter((s) => serverMySlots.has(s));

    try {
      if (toInsert.length > 0) {
        await supabase.from('availability_slots').insert(
          toInsert.map((slotKey) => ({ event_id: event.id, participant_id: participantId, slot_start: slotKey }))
        );
      }
      if (toDelete.length > 0) {
        const idsToDelete = allSlots
          .filter((s) => s.participant_id === participantId && toDelete.includes(new Date(s.slot_start).toISOString()))
          .map((s) => s.id);
        if (idsToDelete.length > 0) {
          await supabase.from('availability_slots').delete().in('id', idsToDelete);
        } else {
          await supabase.from('availability_slots').delete().eq('participant_id', participantId).in('slot_start', toDelete);
        }
      }
      setStagedAdds(new Set());
      setStagedRemoves(new Set());
      setShowSavedToast(true);
      clearTimeout(savedToastTimer.current);
      savedToastTimer.current = setTimeout(() => setShowSavedToast(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, hasStagedChanges, stagedAdds, stagedRemoves, serverMySlots, allSlots, event.id, participantId]);

  const handleToggle = useCallback((slotKey: string) => { toggleSlot(slotKey); }, [toggleSlot]);

  const handleDragStart = useCallback((slotKey: string) => {
    const mode = mySlots.has(slotKey) ? 'remove' : 'add';
    setIsDragging(true);
    setDragMode(mode);
    draggedSlots.current = new Set([slotKey]);
    haptic();
    toggleSlot(slotKey, mode);
  }, [mySlots, toggleSlot]);

  const handleDragEnter = useCallback((slotKey: string) => {
    if (!isDragging || draggedSlots.current.has(slotKey)) return;
    draggedSlots.current.add(slotKey);
    haptic();
    toggleSlot(slotKey, dragMode);
  }, [isDragging, dragMode, toggleSlot]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    draggedSlots.current = new Set();
  }, []);

  // Best available overlap across all proposed days.
  const { maxOverlap, bestSlotKeys } = useMemo(() => {
    let max = 0;
    for (const pSet of overlapMap.values()) {
      if (pSet.size > max) max = pSet.size;
    }
    const best = new Set<string>();
    if (max >= 2) {
      for (const [key, pSet] of overlapMap.entries()) {
        if (pSet.size === max) best.add(key);
      }
    }
    return { maxOverlap: max, bestSlotKeys: best };
  }, [overlapMap]);

  const overlapStatus = useMemo(() => {
    if (totalParticipants < 2) return 'waiting' as const;
    if (maxOverlap >= totalParticipants) return 'found' as const;
    if (maxOverlap >= 2) return 'partial' as const;
    return 'none' as const;
  }, [totalParticipants, maxOverlap]);

  const handleDeleteParticipant = useCallback(async (pid: string) => {
    if (!organizerToken) return;
    removeParticipant(pid);
    removeSlotsForParticipant(pid);
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizer_token: organizerToken, participant_id: pid }),
    });
    if (!res.ok) console.error('Failed to delete participant');
  }, [event.id, organizerToken, removeParticipant, removeSlotsForParticipant]);

  // Finalize a day range: startISO is a dayKeys entry (full ISO instant);
  // endISO is looked up against the parallel sortedDates array so the stored
  // finalized_end_date is a plain 'yyyy-MM-dd', not re-derived from the instant.
  const handleFinalizeRange = useCallback(async (startISO: string, endISO: string) => {
    const startIdx = dayKeys.indexOf(startISO);
    const endIdx = dayKeys.indexOf(endISO);
    const endDate = sortedDates[endIdx] ?? sortedDates[startIdx] ?? sortedDates[0];
    await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalized_time: startISO, finalized_end_date: endDate, organizer_token: organizerToken }),
    });
    setShowDayPicker(false);
    onFinalize?.(startISO, endDate);
  }, [dayKeys, sortedDates, event.id, organizerToken, onFinalize]);

  const timezoneLabel = useMemo(() => getTimezoneLabel(event.timezone), [event.timezone]);

  const breakdownByDay = useMemo(() => {
    if (!isOrganizer || !showBreakdown) return null;
    const participantMap = new Map(participants.map((p) => [p.id, formatDisplayName(p.name)]));
    return dayKeys
      .map((slotKey, i) => {
        const pSet = overlapMap.get(slotKey);
        const names = pSet ? Array.from(pSet).map((id) => participantMap.get(id) || '?') : [];
        return { date: sortedDates[i], names, count: names.length };
      })
      .filter((d) => d.count > 0);
  }, [isOrganizer, showBreakdown, participants, dayKeys, sortedDates, overlapMap]);

  const handleExportCsv = useCallback(() => {
    const esc = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v);
    const rows: string[] = [];
    rows.push(`Event,${esc(event.name)}`);
    if (event.organizer_name) rows.push(`Organizer,${esc(event.organizer_name)}`);
    rows.push(`Dates,${esc(sortedDates.map((d) => format(parseISO(d), 'EEE MMM d yyyy')).join('; '))}`);
    rows.push(`Timezone,${event.timezone}`);
    rows.push(
      event.finalized_time
        ? `Finalized,${esc(format(new Date(event.finalized_time), 'EEE MMM d yyyy'))}${event.finalized_end_date ? ` to ${esc(format(parseISO(event.finalized_end_date), 'EEE MMM d yyyy'))}` : ''}`
        : `Finalized,Not yet set`
    );
    rows.push(`Total participants,${participants.length}`);
    rows.push('');
    rows.push(['Name', ...sortedDates.map((d) => esc(format(parseISO(d), 'EEE MMM d')))].join(','));
    for (const p of participants) {
      const pDays = new Set(
        allSlots.filter((s) => s.participant_id === p.id).map((s) => new Date(s.slot_start).toISOString())
      );
      const cells = dayKeys.map((k) => (pDays.has(k) ? '✓' : ''));
      rows.push([esc(p.name), ...cells].join(','));
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-')}-availability.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [allSlots, participants, event, dayKeys, sortedDates]);

  return (
    <div className="space-y-6" onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
      {overlapStatus === 'waiting' && !event.finalized_time && (
        <div className="animate-fade-in bg-subtle rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-center gap-3 text-sm text-muted">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                  <circle cx="12" cy="7" r="4" fill="#9ca3af" />
                  <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              ))}
            </div>
            Waiting for more people to mark their days...
          </div>
          {isOrganizer && (
            <p className="text-center text-xs text-faint">Share the link above so everyone can mark their available days.</p>
          )}
        </div>
      )}
      {overlapStatus === 'none' && !event.finalized_time && (
        <div className="animate-fade-in bg-amber-50 dark:bg-[#302817] rounded-xl p-4 text-center text-sm text-amber-700 dark:text-amber-400">
          No days overlap yet. But we&apos;re getting there.
          {isOrganizer && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Consider proposing a wider range of days.</p>
          )}
        </div>
      )}
      {overlapStatus === 'partial' && !event.finalized_time && isOrganizer && (
        <div className="flex justify-center animate-fade-in">
          <button
            type="button"
            onClick={() => setShowDayPicker(true)}
            className="px-8 py-3 bg-teal-500 text-white text-base font-semibold rounded-full hover:bg-teal-600 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer min-w-[180px]"
          >
            Pick Days
          </button>
        </div>
      )}
      {overlapStatus === 'found' && !event.finalized_time && (
        <div className="animate-fade-in-scale bg-green-50 dark:bg-[#112D25] rounded-xl p-4 text-center">
          <p className="text-sm text-success-fg font-medium">We found days that work for everyone!</p>
          {isOrganizer ? (
            <button
              type="button"
              onClick={() => setShowDayPicker(true)}
              className="mt-3 px-8 py-3 bg-teal-500 text-white text-base font-semibold rounded-full hover:bg-teal-600 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer min-w-[180px]"
            >
              Pick Days
            </button>
          ) : (
            <p className="text-xs text-success-fg mt-1">Waiting for the organizer to make the call</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted bg-subtle rounded-lg px-3 py-1.5 self-center mx-auto">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Days determined using {timezoneLabel}</span>
      </div>

      {/* Day list — one row per calendar day */}
      <div className="space-y-1.5">
        {sortedDates.map((dateStr, i) => {
          const slotKey = dayKeys[i];
          const isMine = mySlots.has(slotKey);
          const participantSet = overlapMap.get(slotKey);
          let othersCount = participantSet ? participantSet.size : 0;
          if (isMine && participantSet && !participantSet.has(participantId)) othersCount += 1;
          else if (!isMine && participantSet?.has(participantId)) othersCount -= 1;
          const isAllMatch = totalParticipants > 1 && othersCount === totalParticipants;
          const isBest = overlapStatus === 'partial' && !isAllMatch && bestSlotKeys.has(slotKey);

          const slotParticipantColors: string[] = [];
          if (isMine) slotParticipantColors.push(participantColorMap.get(participantId) || PARTICIPANT_COLORS[0]);
          if (participantSet) {
            for (const pid of participantSet) {
              if (pid !== participantId) slotParticipantColors.push(participantColorMap.get(pid) || PARTICIPANT_COLORS[0]);
            }
          }

          return (
            <div key={slotKey} className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-sm font-medium text-secondary">
                {format(parseISO(dateStr), 'EEE, M/d')}
              </div>
              <div className="flex-1">
                <TimeGridSlot
                  slotKey={slotKey}
                  isMine={isMine}
                  othersCount={othersCount}
                  totalParticipants={totalParticipants}
                  isAllMatch={isAllMatch}
                  isBest={isBest}
                  participantColors={slotParticipantColors}
                  onToggle={handleToggle}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                />
              </div>
            </div>
          );
        })}
      </div>

      {hasStagedChanges && !event.finalized_time && (
        <div className="animate-fade-in-scale space-y-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-2xl text-base shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Save my availability
              </>
            )}
          </button>
          <p className="text-center text-xs text-faint">
            {stagedAdds.size > 0 && stagedRemoves.size === 0 &&
              `${stagedAdds.size} day${stagedAdds.size !== 1 ? 's' : ''} selected — not saved yet`}
            {stagedAdds.size === 0 && stagedRemoves.size > 0 &&
              `${stagedRemoves.size} day${stagedRemoves.size !== 1 ? 's' : ''} removed — not saved yet`}
            {stagedAdds.size > 0 && stagedRemoves.size > 0 &&
              `${stagedAdds.size} added, ${stagedRemoves.size} removed — not saved yet`}
          </p>
        </div>
      )}

      {/* Day-picker modal (organizer only) */}
      {showDayPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDayPicker(false); }}
        >
          <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-hairline-soft px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-heading">Pick Days</h2>
              <button
                type="button"
                onClick={() => setShowDayPicker(false)}
                className="p-1.5 text-faint hover:text-secondary rounded-full hover:bg-fill transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-sm text-muted mb-4">
                Choose the best days for <span className="font-medium text-body">{event.name}</span>
              </p>
              <BestDays
                dayKeys={dayKeys}
                overlapMap={overlapMap}
                totalParticipants={totalParticipants}
                participants={participants}
                minResponses={event.min_responses}
                onFinalize={isOrganizer ? handleFinalizeRange : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Participants & Legend */}
      <div className="mt-2 pt-4 border-t border-hairline-soft space-y-3">
        <div className="flex items-center justify-between">
          {canSeeNames ? (
            <button
              type="button"
              onClick={() => setShowParticipants((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-muted uppercase tracking-wide hover:text-body transition-colors cursor-pointer"
            >
              Participants (<AnimatedNumber value={participants.length} className="text-body" />)
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showParticipants ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <h3 className="flex items-center gap-1 text-xs font-semibold text-muted uppercase tracking-wide">
              Participants (<AnimatedNumber value={participants.length} className="text-body" />)
            </h3>
          )}
          <div className="flex items-center gap-2">
            {overlapStatus === 'partial' ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-teal-200 ring-2 ring-teal-500" />
                <span className="text-xs text-faint">Best available</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-100 dark:bg-[#112D25] ring-1 ring-green-300 dark:ring-[#123428]" />
                <span className="text-xs text-faint">Everyone can attend</span>
              </div>
            )}
          </div>
        </div>
        {!canSeeNames && (
          <p className="text-xs text-faint italic">Only the organizer can see who&apos;s responded.</p>
        )}
        {canSeeNames && showParticipants && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {(participants.length > 8 && !showAllParticipants ? participants.slice(0, 6) : participants).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-1 min-w-0 group animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: participantColorMap.get(p.id) }} />
                  <span className={`text-sm truncate ${p.id === participantId ? 'font-semibold text-heading' : 'text-secondary'}`}>
                    {formatDisplayName(p.name)}
                    {p.id === participantId && <span className="ml-1 text-xs text-faint font-normal">you</span>}
                  </span>
                </div>
                {isOrganizer && p.id !== participantId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove ${formatDisplayName(p.name)} and all their availability?`)) handleDeleteParticipant(p.id);
                    }}
                    className="text-xs text-faint2 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 ml-2 shrink-0"
                    title={`Remove ${formatDisplayName(p.name)}`}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
            {participants.length > 8 && (
              <li className="col-span-full">
                <button
                  type="button"
                  onClick={() => setShowAllParticipants((v) => !v)}
                  className="text-xs font-medium text-teal-500 hover:text-teal-700 transition-colors cursor-pointer pl-[18px]"
                >
                  {showAllParticipants ? 'Show less' : `+${participants.length - 6} more`}
                </button>
              </li>
            )}
          </ul>
        )}

        {isOrganizer && participants.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showBreakdown ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {showBreakdown ? 'Hide' : 'Show'} who&apos;s free which day
            </button>

            {showBreakdown && breakdownByDay && breakdownByDay.length > 0 && (
              <div className="mt-3 space-y-1 animate-fade-in">
                {breakdownByDay.map(({ date, names, count }) => (
                  <div
                    key={date}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                      count === totalParticipants ? 'bg-green-50 dark:bg-[#112D25] border border-green-100 dark:border-[#123428]' : 'bg-subtle'
                    }`}
                  >
                    <span className="shrink-0 font-medium text-body w-20">{format(parseISO(date), 'EEE, M/d')}</span>
                    <span className="flex-1 text-muted truncate">{names.join(', ')}</span>
                    <span className={`shrink-0 font-semibold tabular-nums ${count === totalParticipants ? 'text-success-fg' : 'text-faint'}`}>
                      {count}/{totalParticipants}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {showBreakdown && breakdownByDay && breakdownByDay.length === 0 && (
              <p className="mt-2 text-xs text-faint animate-fade-in">No availability recorded yet.</p>
            )}
          </div>
        )}

        {isOrganizer && participants.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 text-xs text-faint hover:text-teal-600 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {showSavedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in-scale">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#101828] dark:bg-[#232B36] text-white text-sm font-medium rounded-full shadow-lg whitespace-nowrap">
            <svg className="w-4 h-4 text-[#3ADB65] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Availability saved
          </div>
        </div>
      )}
    </div>
  );
}
