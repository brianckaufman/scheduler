'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { formatDisplayName } from '@/lib/names';
import { generateSlots, getSlotStep } from '@/lib/slots';
import { computeOverlap } from '@/lib/overlap';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import { useRealtimeParticipants } from '@/hooks/useRealtimeParticipants';
import TimeGridSlot, { PARTICIPANT_COLORS } from './TimeGridSlot';
import BestTimes from './BestTimes';
import SlotTooltip from './SlotTooltip';
import { getTimezoneLabel } from '@/lib/timezones';
import type { Event } from '@/types';

// Cross-platform tap feedback (Android vibrate + iOS AudioContext micro-click)
function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(10); } catch { /* ignore */ }
  }
}

interface TimeGridProps {
  event: Event;
  participantId: string;
  isOrganizer?: boolean;
  organizerToken?: string | null;
  onFinalize?: (time: string) => void;
  onMySlotCountChange?: (count: number) => void;
  onParticipantCountChange?: (count: number) => void;
}

export default function TimeGrid({ event, participantId, isOrganizer, organizerToken, onFinalize, onMySlotCountChange, onParticipantCountChange }: TimeGridProps) {
  const copy = useCopy();
  const { slots: allSlots, removeByParticipant: removeSlotsForParticipant } = useRealtimeSlots(event.id);
  const { participants, removeParticipant } = useRealtimeParticipants(event.id);

  // Staged local toggles — not sent to the DB until the user hits Save
  const [stagedAdds, setStagedAdds] = useState<Set<string>>(new Set());
  const [stagedRemoves, setStagedRemoves] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const draggedSlots = useRef<Set<string>>(new Set());

  // Mobile day tabs
  const [activeDay, setActiveDay] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // "Availability saved" confirmation toast
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Time picker modal (organizer only)
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Organizer breakdown: who is free at each slot
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Expandable participant list for large groups
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  // Tooltip
  const [tooltipSlot, setTooltipSlot] = useState<string | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Clean up toast timer on unmount
  useEffect(() => () => clearTimeout(savedToastTimer.current), []);

  const durationMinutes = event.duration_minutes || 30;

  const gridSlots = useMemo(
    () => generateSlots(event.dates, event.time_start, event.time_end, event.timezone, durationMinutes),
    [event.dates, event.time_start, event.time_end, event.timezone, durationMinutes]
  );

  // Step size and cell height adapt to event duration
  const slotStep = getSlotStep(durationMinutes);
  const cellHeight = slotStep === 15 ? 24 : slotStep === 30 ? 32 : 48;

  const { dates, timeLabels, slotGrid } = useMemo(() => {
    const dateSet = new Set<string>();
    const timeSet = new Set<string>();
    const grid = new Map<string, string>();

    for (const slot of gridSlots) {
      const d = new Date(slot);
      const dateKey = format(d, 'yyyy-MM-dd');
      const timeKey = format(d, 'HH:mm');
      dateSet.add(dateKey);
      timeSet.add(timeKey);
      grid.set(`${dateKey}|${timeKey}`, slot);
    }

    return {
      dates: Array.from(dateSet).sort(),
      timeLabels: Array.from(timeSet).sort(),
      slotGrid: grid,
    };
  }, [gridSlots]);

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

  // Display state: server-confirmed slots + local staged adds - local staged removes
  const mySlots = useMemo(() => {
    const set = new Set(serverMySlots);
    for (const key of stagedAdds) set.add(key);
    for (const key of stagedRemoves) set.delete(key);
    return set;
  }, [serverMySlots, stagedAdds, stagedRemoves]);

  const hasStagedChanges = stagedAdds.size > 0 || stagedRemoves.size > 0;

  // Report slot count changes to parent (for "all set" feedback)
  const mySlotCount = mySlots.size;
  useEffect(() => {
    onMySlotCountChange?.(mySlotCount);
  }, [mySlotCount, onMySlotCountChange]);

  // Report participant count to parent (for celebration component)
  const participantCount = participants.length;
  useEffect(() => {
    onParticipantCountChange?.(participantCount);
  }, [participantCount, onParticipantCountChange]);

  const totalParticipants = participants.length;

  const participantColorMap = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p, i) => {
      map.set(p.id, PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]);
    });
    return map;
  }, [participants]);

  // Stage a slot toggle locally — no DB call until Save is tapped
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

  // Batch-save all staged changes to the database
  const handleSave = useCallback(async () => {
    if (isSaving || !hasStagedChanges) return;
    setIsSaving(true);

    const supabase = createClient();
    // Only insert slots not already in DB; only delete slots that are in DB
    const toInsert = [...stagedAdds].filter((s) => !serverMySlots.has(s));
    const toDelete = [...stagedRemoves].filter((s) => serverMySlots.has(s));

    try {
      if (toInsert.length > 0) {
        await supabase.from('availability_slots').insert(
          toInsert.map((slotKey) => ({
            event_id: event.id,
            participant_id: participantId,
            slot_start: slotKey,
          }))
        );
      }

      if (toDelete.length > 0) {
        // Delete by the DB row ids we know about; fall back to slot_start match
        const idsToDelete = allSlots
          .filter((s) => s.participant_id === participantId &&
            toDelete.includes(new Date(s.slot_start).toISOString()))
          .map((s) => s.id);

        if (idsToDelete.length > 0) {
          await supabase.from('availability_slots').delete().in('id', idsToDelete);
        } else {
          await supabase.from('availability_slots').delete()
            .eq('participant_id', participantId).in('slot_start', toDelete);
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

  // Simple toggle for mobile taps (onClick)
  const handleToggle = useCallback((slotKey: string) => {
    toggleSlot(slotKey);
  }, [toggleSlot]);

  // Drag handlers (desktop mouse only)
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
  }, [isDragging]);

  const gridRef = useRef<HTMLDivElement>(null);

  // Select all / clear day
  const handleDayToggle = useCallback((date: string) => {
    const daySlots = timeLabels
      .map((time) => slotGrid.get(`${date}|${time}`))
      .filter(Boolean) as string[];

    const allSelected = daySlots.every((s) => mySlots.has(s));
    const mode = allSelected ? 'remove' : 'add';

    for (const slotKey of daySlots) {
      const shouldToggle = mode === 'add' ? !mySlots.has(slotKey) : mySlots.has(slotKey);
      if (shouldToggle) toggleSlot(slotKey, mode);
    }
  }, [timeLabels, slotGrid, mySlots, toggleSlot]);

  // Tooltip handlers
  const handleSlotHold = useCallback((slotKey: string) => {
    tooltipTimeout.current = setTimeout(() => setTooltipSlot(slotKey), 400);
  }, []);
  const handleSlotRelease = useCallback(() => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
  }, []);

  // Best available overlap: the highest number of people free at any one slot,
  // and which slots hit that maximum. This drives both the status messaging and
  // the "best available" highlight, so a near-miss (e.g. 10 of 12) still reads
  // as strong overlap instead of "no overlap".
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

  // Overlap status:
  //  - waiting: not enough people yet
  //  - found:   at least one time works for everyone
  //  - partial: best time works for some (≥2) but not all — still useful overlap
  //  - none:    no two people share any time
  const overlapStatus = useMemo(() => {
    if (totalParticipants < 2) return 'waiting' as const;
    if (maxOverlap >= totalParticipants) return 'found' as const;
    if (maxOverlap >= 2) return 'partial' as const;
    return 'none' as const;
  }, [totalParticipants, maxOverlap]);

  // Delete participant handler (organizer only)
  const handleDeleteParticipant = useCallback(async (pid: string) => {
    if (!organizerToken) return;
    removeParticipant(pid);
    removeSlotsForParticipant(pid);

    const res = await fetch(`/api/events/${event.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizer_token: organizerToken, participant_id: pid }),
    });
    if (!res.ok) {
      console.error('Failed to delete participant');
    }
  }, [event.id, organizerToken, removeParticipant, removeSlotsForParticipant]);

  // Finalize handler
  const handleFinalize = useCallback(async (time: string) => {
    await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalized_time: time, organizer_token: organizerToken }),
    });
    onFinalize?.(time);
  }, [event.id, organizerToken, onFinalize]);

  // Visible dates (all on desktop, single on mobile)
  const visibleDates = isMobile && dates.length > 1 ? [dates[activeDay]] : dates;

  // Timezone label
  const timezoneLabel = useMemo(() => getTimezoneLabel(event.timezone), [event.timezone]);

  // Per-slot availability breakdown (organizer only, built lazily when panel opens)
  const breakdownByDate = useMemo(() => {
    if (!isOrganizer || !showBreakdown) return null;
    const participantMap = new Map(participants.map((p) => [p.id, formatDisplayName(p.name)]));

    return dates
      .map((date) => {
        const slotsForDate = timeLabels
          .map((time) => slotGrid.get(`${date}|${time}`))
          .filter(Boolean) as string[];

        const slotData = slotsForDate
          .map((slotKey) => {
            const pSet = overlapMap.get(slotKey);
            const names = pSet ? Array.from(pSet).map((id) => participantMap.get(id) || '?') : [];
            return { slotKey, time: format(new Date(slotKey), 'h:mm a'), names, count: names.length };
          })
          .filter((s) => s.count > 0);

        return { date, slots: slotData };
      })
      .filter((d) => d.slots.length > 0);
  }, [isOrganizer, showBreakdown, participants, dates, timeLabels, slotGrid, overlapMap]);

  // Enhanced CSV export: event metadata block + per-participant availability matrix
  const handleExportCsv = useCallback(() => {
    const esc = (v: string) =>
      v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v;

    // All slot keys across all participants, sorted chronologically
    const allSlotKeys = [...new Set(
      allSlots.map((s) => new Date(s.slot_start).toISOString())
    )].sort();

    const slotLabels = allSlotKeys.map((k) => format(new Date(k), 'EEE MMM d, h:mm a'));

    const rows: string[] = [];

    // Event metadata block
    rows.push(`Event,${esc(event.name)}`);
    if (event.organizer_name) rows.push(`Organizer,${esc(event.organizer_name)}`);
    rows.push(`Dates,${esc(event.dates.map((d) => format(parseISO(d), 'EEE MMM d yyyy')).join('; '))}`);
    rows.push(`Time window,${event.time_start} - ${event.time_end}`);
    rows.push(`Timezone,${event.timezone}`);
    rows.push(`Duration,${durationMinutes} minutes`);
    rows.push(
      event.finalized_time
        ? `Finalized time,${esc(format(new Date(event.finalized_time), 'EEE MMM d yyyy h:mm a'))}`
        : `Finalized time,Not yet set`
    );
    rows.push(`Total participants,${participants.length}`);
    rows.push('');

    // Matrix: Name | # slots | one column per slot
    rows.push(['Name', 'Slots selected', ...slotLabels.map(esc)].join(','));

    for (const p of participants) {
      const pSlots = new Set(
        allSlots
          .filter((s) => s.participant_id === p.id)
          .map((s) => new Date(s.slot_start).toISOString())
      );
      const cells = allSlotKeys.map((k) => (pSlots.has(k) ? '✓' : ''));
      rows.push([esc(p.name), String(pSlots.size), ...cells].join(','));
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
  }, [allSlots, participants, event, durationMinutes]);

  return (
    <div className="space-y-6" onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
      {/* Always-visible status notice */}
      {overlapStatus === 'waiting' && !event.finalized_time && (
        <div className="animate-fade-in bg-subtle rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-center gap-3 text-sm text-muted">
          <style>{`
            @keyframes person-arrive {
              0%, 15%  { opacity: 0.15; transform: translateY(2px) scale(0.85); }
              40%, 70% { opacity: 1;    transform: translateY(0)   scale(1);    }
              90%, 100%{ opacity: 0.15; transform: translateY(2px) scale(0.85); }
            }
          `}</style>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  animation: `person-arrive 2.7s ease-in-out ${i * 0.6}s infinite`,
                  opacity: 0.15,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="7" r="4" fill="#9ca3af" />
                  <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            ))}
          </div>
          {copy.grid.waiting}
        </div>
        {isOrganizer && (
          <p className="text-center text-xs text-faint">
            Share the link above so everyone can mark their availability.
          </p>
        )}
        </div>
      )}
      {overlapStatus === 'none' && !event.finalized_time && (
        <div className="animate-fade-in bg-amber-50 dark:bg-[#302817] rounded-xl p-4 text-center text-sm text-amber-700 dark:text-amber-400">
          {copy.grid.no_overlap}
          {isOrganizer && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Consider expanding the date range or time window.</p>
          )}
        </div>
      )}
      {overlapStatus === 'partial' && !event.finalized_time && (
        <div className="animate-fade-in-scale bg-teal-50 dark:bg-[#0D223A] rounded-xl p-4 text-center">
          <p className="text-sm text-accent-fg font-medium">
            No single time works for everyone yet — but the best time fits{' '}
            <span className="font-bold">{maxOverlap} of {totalParticipants}</span>.
          </p>
          {isOrganizer ? (
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              className="mt-3 px-8 py-3 bg-teal-500 text-white text-base font-semibold rounded-full hover:bg-teal-600 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer min-w-[180px]"
            >
              {copy.grid.pick_time}
            </button>
          ) : (
            <p className="text-xs text-teal-600 mt-1">
              The darkest times below have the most people free.
            </p>
          )}
        </div>
      )}
      {overlapStatus === 'found' && !event.finalized_time && (
        <div className="animate-fade-in-scale bg-green-50 dark:bg-[#112D25] rounded-xl p-4 text-center">
          <p className="text-sm text-success-fg font-medium">
            {copy.grid.overlap_found}
          </p>
          {isOrganizer ? (
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              className="mt-3 px-8 py-3 bg-teal-500 text-white text-base font-semibold rounded-full hover:bg-teal-600 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer min-w-[180px]"
            >
              {copy.grid.pick_time}
            </button>
          ) : (
            <p className="text-xs text-success-fg mt-1">
              {interpolate(copy.grid.waiting_organizer, { name: formatDisplayName(event.organizer_name || 'the organizer') })}
            </p>
          )}
        </div>
      )}

      {/* Mobile day tabs */}
      {isMobile && dates.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {dates.map((date, i) => (
            <button
              key={date}
              type="button"
              onClick={() => setActiveDay(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                i === activeDay
                  ? 'bg-teal-500 text-white'
                  : 'bg-fill text-secondary hover:bg-fill2'
              }`}
            >
              {format(parseISO(date), 'EEE M/d')}
            </button>
          ))}
        </div>
      )}

      {/* How-to instruction bar — shown while event is still open */}
      {!event.finalized_time && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 dark:bg-[#0D223A] px-4 py-2.5 text-sm text-accent-fg">
          <svg className="w-4 h-4 shrink-0 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
          </svg>
          <span>Tap the times you&apos;re free, then tap <strong>Save my availability</strong>.</span>
        </div>
      )}

      {/* Timezone indicator */}
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted bg-subtle rounded-lg px-3 py-1.5 self-center mx-auto">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{interpolate(copy.grid.timezone_label, { timezone: timezoneLabel })}</span>
      </div>

      <div
        className="time-grid overflow-x-auto -mx-4 px-4"
        ref={gridRef}
      >
        <div
          className="grid gap-1 pb-1"
          style={{
            gridTemplateColumns: `56px repeat(${visibleDates.length}, minmax(60px, 1fr))`,
          }}
        >
          {/* Sticky header row */}
          <div className="sticky top-0 bg-surface z-20" />
          {visibleDates.map((date) => {
            const daySlots = timeLabels.map((t) => slotGrid.get(`${date}|${t}`)).filter(Boolean) as string[];
            const allSelected = daySlots.length > 0 && daySlots.every((s) => mySlots.has(s));
            return (
              <div
                key={date}
                className="text-center text-xs font-medium text-secondary pb-1 sticky top-0 bg-surface z-20"
              >
                <div>{format(parseISO(date), 'EEE')}</div>
                <div>{format(parseISO(date), 'M/d')}</div>
                <button
                  type="button"
                  onClick={() => handleDayToggle(date)}
                  className="mt-1 min-h-[32px] min-w-[44px] text-xs text-teal-500 hover:text-teal-700 font-medium cursor-pointer flex items-center justify-center mx-auto"
                >
                  {allSelected ? copy.grid.clear : copy.grid.all}
                </button>
              </div>
            );
          })}

          {/* Time rows */}
          {timeLabels.map((time) => {
            const [h, m] = time.split(':').map(Number);

            // Compact time formatter — omits :00 for on-the-hour times
            const fmtCompact = (hh: number, mm: number) => {
              const ap = hh >= 12 ? 'PM' : 'AM';
              const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
              return mm === 0 ? `${h12} ${ap}` : `${h12}:${mm.toString().padStart(2, '0')} ${ap}`;
            };

            const startLabel = fmtCompact(h, m);
            const endTotalMin = h * 60 + m + durationMinutes;
            const endH = Math.floor(endTotalMin / 60) % 24;
            const endM = endTotalMin % 60;
            const endLabel = fmtCompact(endH, endM);

            return [
              <div
                key={`label-${time}`}
                style={{ minHeight: `${cellHeight}px` }}
                className="flex flex-col items-center justify-center sticky left-0 bg-surface z-10"
              >
                <span className="text-xs font-medium text-secondary leading-tight">{startLabel}</span>
                {slotStep > 15 && (
                  <span className="text-xs text-faint leading-tight">{endLabel}</span>
                )}
              </div>,
              ...visibleDates.map((date) => {
                const slotKey = slotGrid.get(`${date}|${time}`);
                if (!slotKey) return <div key={`${date}-${time}`} />;

                const isMine = mySlots.has(slotKey);
                const participantSet = overlapMap.get(slotKey);
                let othersCount = participantSet ? participantSet.size : 0;
                if (isMine && participantSet && !participantSet.has(participantId)) {
                  othersCount += 1;
                } else if (!isMine && participantSet?.has(participantId)) {
                  othersCount -= 1;
                }
                const isAllMatch = totalParticipants > 1 && othersCount === totalParticipants;
                // In partial mode, flag the slots with the most people free so the
                // best available option stands out even when it isn't everyone.
                const isBest = overlapStatus === 'partial' && !isAllMatch && bestSlotKeys.has(slotKey);

                // Build color dots for this slot
                const slotParticipantColors: string[] = [];
                if (isMine) {
                  slotParticipantColors.push(participantColorMap.get(participantId) || PARTICIPANT_COLORS[0]);
                }
                if (participantSet) {
                  for (const pid of participantSet) {
                    if (pid !== participantId) {
                      slotParticipantColors.push(participantColorMap.get(pid) || PARTICIPANT_COLORS[0]);
                    }
                  }
                }

                return (
                  <TimeGridSlot
                    key={slotKey}
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
                    onHold={handleSlotHold}
                    onRelease={handleSlotRelease}
                  />
                );
              }),
            ];
          })}
        </div>
      </div>

      {/* Slot tooltip */}
      {tooltipSlot && (
        <SlotTooltip
          slotKey={tooltipSlot}
          overlapMap={overlapMap}
          participants={participants}
          onClose={() => setTooltipSlot(null)}
        />
      )}

      {/* Save my availability — visible when there are unsaved staged changes */}
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
              `${stagedAdds.size} time${stagedAdds.size !== 1 ? 's' : ''} selected — not saved yet`}
            {stagedAdds.size === 0 && stagedRemoves.size > 0 &&
              `${stagedRemoves.size} time${stagedRemoves.size !== 1 ? 's' : ''} removed — not saved yet`}
            {stagedAdds.size > 0 && stagedRemoves.size > 0 &&
              `${stagedAdds.size} added, ${stagedRemoves.size} removed — not saved yet`}
          </p>
        </div>
      )}

      {/* Time Picker Modal (organizer only) */}
      {showTimePicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowTimePicker(false); }}
        >
          <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-hairline-soft px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-heading">{copy.grid.pick_time}</h2>
              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                className="p-1.5 text-faint hover:text-secondary rounded-full hover:bg-fill transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-sm text-muted mb-4">
                Choose the best time for <span className="font-medium text-body">{event.name}</span>
              </p>
              <BestTimes
                overlapMap={overlapMap}
                totalParticipants={totalParticipants}
                durationMinutes={event.duration_minutes || 30}
                participants={participants}
                minResponses={event.min_responses}
                onFinalize={isOrganizer ? (time: string) => {
                  handleFinalize(time);
                  setShowTimePicker(false);
                } : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Participants & Legend */}
      <div className="mt-2 pt-4 border-t border-hairline-soft space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            {interpolate(copy.grid.participants_label, { count: participants.length })}
          </h3>
          <div className="flex items-center gap-2">
            {/* Legend inline — adapts to whether a full-overlap time exists */}
            {overlapStatus === 'partial' ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-teal-200 ring-2 ring-teal-500" />
                <span className="text-xs text-faint">Best available</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-100 dark:bg-[#112D25] ring-1 ring-green-300 dark:ring-[#123428]" />
                <span className="text-xs text-faint">{copy.grid.legend_all}</span>
              </div>
            )}
            {totalParticipants > 6 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(20, 184, 166, 0.35)' }} />
                <span className="text-xs text-faint">{copy.grid.legend_heat}</span>
              </div>
            )}
            {participants.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllParticipants((v) => !v)}
                className="text-xs text-teal-500 hover:text-teal-700 font-medium cursor-pointer ml-1"
              >
                {showAllParticipants ? copy.grid.show_less : copy.grid.show_all}
              </button>
            )}
          </div>
        </div>
        <ul className="space-y-1">
          {(participants.length > 8 && !showAllParticipants
            ? participants.slice(0, 6)
            : participants
          ).map((p) => (
            <li key={p.id} className="flex items-center justify-between group animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: participantColorMap.get(p.id) }}
                />
                <span className={`text-sm truncate ${p.id === participantId ? 'font-semibold text-heading' : 'text-secondary'}`}>
                  {formatDisplayName(p.name)}
                  {p.id === participantId && <span className="ml-1 text-xs text-faint font-normal">{copy.grid.you_suffix?.replace(/[()]/g, '').trim() ?? 'you'}</span>}
                </span>
              </div>
              {isOrganizer && p.id !== participantId && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove ${formatDisplayName(p.name)} and all their availability?`)) {
                      handleDeleteParticipant(p.id);
                    }
                  }}
                  className="text-xs text-faint2 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 ml-2 shrink-0"
                  title={`Remove ${formatDisplayName(p.name)}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
          {participants.length > 8 && !showAllParticipants && (
            <li className="text-xs text-faint pl-[18px]">
              +{participants.length - 6} more
            </li>
          )}
        </ul>

        {/* Organizer-only: who's free when breakdown */}
        {isOrganizer && participants.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showBreakdown ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {showBreakdown ? 'Hide' : 'Show'} who&apos;s free when
            </button>

            {showBreakdown && breakdownByDate && breakdownByDate.length > 0 && (
              <div className="mt-3 space-y-4 animate-fade-in">
                {breakdownByDate.map(({ date, slots }) => (
                  <div key={date}>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                      {format(parseISO(date), 'EEEE, MMMM d')}
                    </h4>
                    <div className="space-y-1">
                      {slots.map(({ slotKey, time, names, count }) => (
                        <div
                          key={slotKey}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                            count === totalParticipants
                              ? 'bg-green-50 dark:bg-[#112D25] border border-green-100 dark:border-[#123428]'
                              : 'bg-subtle'
                          }`}
                        >
                          <span className="shrink-0 font-medium text-body w-16">{time}</span>
                          <span className="flex-1 text-muted truncate">{names.join(', ')}</span>
                          <span className={`shrink-0 font-semibold tabular-nums ${count === totalParticipants ? 'text-success-fg' : 'text-faint'}`}>
                            {count}/{totalParticipants}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showBreakdown && breakdownByDate && breakdownByDate.length === 0 && (
              <p className="mt-2 text-xs text-faint animate-fade-in">
                No availability recorded yet.
              </p>
            )}
          </div>
        )}

        {/* Export CSV (organizer only) */}
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

      {/* "Availability saved" floating toast — shows after each successful save */}
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
