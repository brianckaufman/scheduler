'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { generateSlots } from '@/lib/slots';
import { computeOverlap, getFullOverlapSlots } from '@/lib/overlap';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import { useRealtimeParticipants } from '@/hooks/useRealtimeParticipants';
import TimeGridSlot, { PARTICIPANT_COLORS } from './TimeGridSlot';
import OverlapSummary from './OverlapSummary';
import BestTimes from './BestTimes';
import SlotTooltip from './SlotTooltip';
import UndoToast from './UndoToast';
import type { Event } from '@/types';

// Subtle haptic feedback on mobile
function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// Friendly timezone name (e.g., "Eastern Time", "Pacific Time")
function getTimezoneLabel(tz: string): string {
  try {
    // Use Intl to get a readable abbreviation
    const now = new Date();
    const short = now.toLocaleTimeString('en-US', { timeZone: tz, timeZoneName: 'short' });
    const abbr = short.split(' ').pop() || '';
    // Map common abbreviations to friendly names
    const friendlyMap: Record<string, string> = {
      EST: 'Eastern Time',
      EDT: 'Eastern Time',
      CST: 'Central Time',
      CDT: 'Central Time',
      MST: 'Mountain Time',
      MDT: 'Mountain Time',
      PST: 'Pacific Time',
      PDT: 'Pacific Time',
      GMT: 'GMT',
      UTC: 'UTC',
      BST: 'British Summer Time',
      CET: 'Central European Time',
      CEST: 'Central European Time',
      IST: 'India Standard Time',
      JST: 'Japan Standard Time',
      AEST: 'Australian Eastern Time',
      AEDT: 'Australian Eastern Time',
    };
    return friendlyMap[abbr] || abbr || tz.replace(/_/g, ' ').split('/').pop() || tz;
  } catch {
    return tz.replace(/_/g, ' ').split('/').pop() || tz;
  }
}

interface TimeGridProps {
  event: Event;
  participantId: string;
  isOrganizer?: boolean;
  organizerToken?: string | null;
  onFinalize?: (time: string) => void;
}

export default function TimeGrid({ event, participantId, isOrganizer, organizerToken, onFinalize }: TimeGridProps) {
  const { slots: allSlots, removeByParticipant: removeSlotsForParticipant } = useRealtimeSlots(event.id);
  const { participants, removeParticipant } = useRealtimeParticipants(event.id);

  // Optimistic local toggles
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const [pendingRemoves, setPendingRemoves] = useState<Set<string>>(new Set());

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const draggedSlots = useRef<Set<string>>(new Set());

  // Undo toast for drag operations
  const [undoToast, setUndoToast] = useState<{
    message: string;
    slots: string[];
    mode: 'add' | 'remove';
  } | null>(null);

  // Mobile day tabs
  const [activeDay, setActiveDay] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // Collapsible results
  const [showResults, setShowResults] = useState(false);

  // Time picker modal (organizer only)
  const [showTimePicker, setShowTimePicker] = useState(false);

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

  const gridSlots = useMemo(
    () => generateSlots(event.dates, event.time_start, event.time_end, event.timezone),
    [event.dates, event.time_start, event.time_end, event.timezone]
  );

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

  const mySlots = useMemo(() => {
    const set = new Set(serverMySlots);
    for (const key of pendingAdds) set.add(key);
    for (const key of pendingRemoves) set.delete(key);
    return set;
  }, [serverMySlots, pendingAdds, pendingRemoves]);

  // Clean up pending state when server catches up
  useEffect(() => {
    setPendingAdds((prev) => {
      const next = new Set(prev);
      for (const key of prev) {
        if (serverMySlots.has(key)) next.delete(key);
      }
      return next.size === prev.size ? prev : next;
    });
    setPendingRemoves((prev) => {
      const next = new Set(prev);
      for (const key of prev) {
        if (!serverMySlots.has(key)) next.delete(key);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [serverMySlots]);

  const totalParticipants = participants.length;

  const participantColorMap = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p, i) => {
      map.set(p.id, PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]);
    });
    return map;
  }, [participants]);

  const toggleSlot = useCallback(
    async (slotKey: string, forceMode?: 'add' | 'remove') => {
      const supabase = createClient();
      const shouldRemove = forceMode === 'remove' || (!forceMode && mySlots.has(slotKey));

      if (shouldRemove) {
        setPendingRemoves((prev) => new Set(prev).add(slotKey));
        setPendingAdds((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });

        const matching = allSlots.find(
          (s) => s.participant_id === participantId && new Date(s.slot_start).toISOString() === slotKey
        );
        if (matching) {
          const { error } = await supabase.from('availability_slots').delete().eq('id', matching.id);
          if (error) setPendingRemoves((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });
        } else {
          const { error } = await supabase.from('availability_slots').delete()
            .eq('participant_id', participantId).eq('slot_start', slotKey);
          if (error) setPendingRemoves((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });
        }
      } else {
        setPendingAdds((prev) => new Set(prev).add(slotKey));
        setPendingRemoves((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });

        const { error } = await supabase.from('availability_slots').insert({
          event_id: event.id, participant_id: participantId, slot_start: slotKey,
        });
        if (error) setPendingAdds((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });
      }
    },
    [mySlots, allSlots, participantId, event.id]
  );

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
    // Show undo toast if multiple slots were dragged
    if (isDragging && draggedSlots.current.size > 1) {
      const count = draggedSlots.current.size;
      const slotsArray = Array.from(draggedSlots.current);
      const mode = dragMode;
      setUndoToast({
        message: `${count} time${count !== 1 ? 's' : ''} ${mode === 'add' ? 'selected' : 'deselected'}`,
        slots: slotsArray,
        mode,
      });
    }
    setIsDragging(false);
    draggedSlots.current = new Set();
  }, [isDragging, dragMode]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (!undoToast) return;
    const reverseMode = undoToast.mode === 'add' ? 'remove' : 'add';
    for (const slotKey of undoToast.slots) {
      toggleSlot(slotKey, reverseMode);
    }
    setUndoToast(null);
  }, [undoToast, toggleSlot]);

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

  // Overlap status
  const overlapStatus = useMemo(() => {
    if (totalParticipants < 2) return 'waiting' as const;
    const full = getFullOverlapSlots(overlapMap, totalParticipants);
    return full.length > 0 ? 'found' as const : 'none' as const;
  }, [overlapMap, totalParticipants]);

  // Delete participant handler (organizer only)
  const handleDeleteParticipant = useCallback(async (pid: string) => {
    if (!organizerToken) return;
    removeParticipant(pid);
    removeSlotsForParticipant(pid);

    const res = await fetch(
      `/api/events/${event.id}?organizer_token=${encodeURIComponent(organizerToken)}&participant_id=${encodeURIComponent(pid)}`,
      { method: 'DELETE' }
    );
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

  return (
    <div className="space-y-6" onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
      {/* Always-visible status notice */}
      {overlapStatus === 'waiting' && !event.finalized_time && (
        <div className="animate-fade-in bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
          Waiting for more participants to join...
        </div>
      )}
      {overlapStatus === 'none' && !event.finalized_time && (
        <div className="animate-fade-in bg-amber-50 rounded-xl p-4 text-center text-sm text-amber-700">
          No times work for everyone yet. Keep adding your availability!
        </div>
      )}
      {overlapStatus === 'found' && !event.finalized_time && (
        <div className="animate-fade-in-scale bg-green-50 rounded-xl p-4 text-center">
          <p className="text-sm text-green-700 font-medium">
            Times found where everyone can meet!
          </p>
          {isOrganizer ? (
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              className="mt-2 px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-full hover:bg-green-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
            >
              Pick a Time
            </button>
          ) : (
            <p className="text-xs text-green-600 mt-1">
              Waiting for {event.organizer_name?.split(' ')[0] || 'the organizer'} to pick a time
            </p>
          )}
        </div>
      )}

      {/* Collapsible results section */}
      <button
        type="button"
        onClick={() => setShowResults((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <span>Best Times &amp; Overlap</span>
        <svg
          className={`w-4 h-4 transition-transform ${showResults ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showResults && (
        <div className="animate-slide-down space-y-4">
          <OverlapSummary overlapMap={overlapMap} totalParticipants={totalParticipants} />
          <BestTimes
            overlapMap={overlapMap}
            totalParticipants={totalParticipants}
            durationMinutes={event.duration_minutes || 30}
            participants={participants}
            onFinalize={isOrganizer ? handleFinalize : undefined}
          />
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
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {format(parseISO(date), 'EEE M/d')}
            </button>
          ))}
        </div>
      )}

      {/* Timezone indicator */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Times shown in {timezoneLabel}</span>
      </div>

      <div
        className="time-grid overflow-x-auto -mx-4 px-4"
        ref={gridRef}
      >
        <div
          className="grid gap-1 pb-1"
          style={{
            gridTemplateColumns: `auto repeat(${visibleDates.length}, minmax(60px, 1fr))`,
          }}
        >
          {/* Sticky header row */}
          <div className="sticky top-0 bg-white z-20" />
          {visibleDates.map((date) => {
            const daySlots = timeLabels.map((t) => slotGrid.get(`${date}|${t}`)).filter(Boolean) as string[];
            const allSelected = daySlots.length > 0 && daySlots.every((s) => mySlots.has(s));
            return (
              <div
                key={date}
                className="text-center text-xs font-medium text-gray-600 pb-1 sticky top-0 bg-white z-20"
              >
                <div>{format(parseISO(date), 'EEE')}</div>
                <div>{format(parseISO(date), 'M/d')}</div>
                <button
                  type="button"
                  onClick={() => handleDayToggle(date)}
                  className="mt-1 text-[10px] text-teal-500 hover:text-teal-700 font-medium cursor-pointer"
                >
                  {allSelected ? 'Clear' : 'All'}
                </button>
              </div>
            );
          })}

          {/* Time rows */}
          {timeLabels.map((time) => {
            const [h, m] = time.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const label = `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;

            return [
              <div
                key={`label-${time}`}
                className="text-xs text-gray-500 flex items-center justify-end pr-2 sticky left-0 bg-white z-10 whitespace-nowrap"
              >
                {label}
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

      {/* Undo toast */}
      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={handleUndo}
          onDismiss={() => setUndoToast(null)}
        />
      )}

      {/* Time Picker Modal (organizer only) */}
      {showTimePicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowTimePicker(false); }}
        >
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Pick a Time</h2>
              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-sm text-gray-500 mb-4">
                Choose the best time for <span className="font-medium text-gray-700">{event.name}</span>
              </p>
              <BestTimes
                overlapMap={overlapMap}
                totalParticipants={totalParticipants}
                durationMinutes={event.duration_minutes || 30}
                participants={participants}
                onFinalize={isOrganizer ? (time: string) => {
                  handleFinalize(time);
                  setShowTimePicker(false);
                } : undefined}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Participants ({participants.length})
          </h3>
          {participants.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllParticipants((v) => !v)}
              className="text-xs text-teal-500 hover:text-teal-700 font-medium cursor-pointer"
            >
              {showAllParticipants ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(participants.length > 8 && !showAllParticipants
            ? participants.slice(0, 6)
            : participants
          ).map((p, i) => (
            <span
              key={p.id}
              className="animate-fade-in inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-50 transition-all duration-200 hover:shadow-sm"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: participantColorMap.get(p.id) }}
              />
              <span className="text-gray-700">
                {p.name}{p.id === participantId && ' (you)'}
              </span>
              {isOrganizer && p.id !== participantId && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove ${p.name} and all their availability?`)) {
                      handleDeleteParticipant(p.id);
                    }
                  }}
                  className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  title={`Remove ${p.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {participants.length > 8 && !showAllParticipants && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-50 text-gray-400">
              +{participants.length - 6} more
            </span>
          )}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-100 ring-2 ring-green-300" />
            <span>Everyone can meet</span>
          </div>
          {totalParticipants > 6 && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(20, 184, 166, 0.35)' }} />
              <span>More = darker</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
