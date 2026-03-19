'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { formatDisplayName } from '@/lib/names';
import { generateSlots } from '@/lib/slots';
import { computeOverlap, getFullOverlapSlots } from '@/lib/overlap';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import { useRealtimeParticipants } from '@/hooks/useRealtimeParticipants';
import TimeGridSlot, { PARTICIPANT_COLORS } from './TimeGridSlot';
import BestTimes from './BestTimes';
import SlotTooltip from './SlotTooltip';
import UndoToast from './UndoToast';
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
          {copy.grid.waiting}
        </div>
      )}
      {overlapStatus === 'none' && !event.finalized_time && (
        <div className="animate-fade-in bg-amber-50 rounded-xl p-4 text-center text-sm text-amber-700">
          {copy.grid.no_overlap}
        </div>
      )}
      {overlapStatus === 'found' && !event.finalized_time && (
        <div className="animate-fade-in-scale bg-green-50 rounded-xl p-4 text-center">
          <p className="text-sm text-green-700 font-medium">
            {copy.grid.overlap_found}
          </p>
          {isOrganizer ? (
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              className="mt-3 px-8 py-3 bg-blue-600 text-white text-base font-semibold rounded-full hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer min-w-[180px]"
            >
              {copy.grid.pick_time}
            </button>
          ) : (
            <p className="text-xs text-green-600 mt-1">
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
        <span>{interpolate(copy.grid.timezone_label, { timezone: timezoneLabel })}</span>
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
                  {allSelected ? copy.grid.clear : copy.grid.all}
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
              <h2 className="text-lg font-bold text-gray-900">{copy.grid.pick_time}</h2>
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

      {/* Participants & Legend */}
      <div className="mt-2 pt-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {interpolate(copy.grid.participants_label, { count: participants.length })}
          </h3>
          <div className="flex items-center gap-2">
            {/* Legend inline */}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 ring-1 ring-green-300" />
              <span className="text-[10px] text-gray-400">{copy.grid.legend_all}</span>
            </div>
            {totalParticipants > 6 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(20, 184, 166, 0.35)' }} />
                <span className="text-[10px] text-gray-400">{copy.grid.legend_heat}</span>
              </div>
            )}
            {participants.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllParticipants((v) => !v)}
                className="text-[10px] text-teal-500 hover:text-teal-700 font-medium cursor-pointer ml-1"
              >
                {showAllParticipants ? copy.grid.show_less : copy.grid.show_all}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(participants.length > 8 && !showAllParticipants
            ? participants.slice(0, 6)
            : participants
          ).map((p, i) => (
            <span
              key={p.id}
              className="animate-fade-in inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-100 transition-all duration-200"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: participantColorMap.get(p.id) }}
              />
              <span className="text-gray-600">
                {formatDisplayName(p.name)}{p.id === participantId && ` ${copy.grid.you_suffix}`}
              </span>
              {isOrganizer && p.id !== participantId && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove ${formatDisplayName(p.name)} and all their availability?`)) {
                      handleDeleteParticipant(p.id);
                    }
                  }}
                  className="ml-0.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                  title={`Remove ${formatDisplayName(p.name)}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {participants.length > 8 && !showAllParticipants && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-100 text-gray-400">
              +{participants.length - 6} more
            </span>
          )}
        </div>

        {/* Export CSV (organizer only) */}
        {isOrganizer && participants.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const header = 'Name,Available Times\n';
              const rows = participants.map((p) => {
                const pSlots = allSlots
                  .filter((s) => s.participant_id === p.id)
                  .map((s) => {
                    const d = new Date(s.slot_start);
                    return format(d, 'EEE MMM d, h:mm a');
                  })
                  .sort()
                  .join('; ');
                const safeName = p.name.includes(',') ? `"${p.name}"` : p.name;
                const safeSlots = pSlots.includes(',') ? `"${pSlots}"` : pSlots;
                return `${safeName},${safeSlots}`;
              }).join('\n');

              const csv = header + rows;
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${event.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-')}-participants.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-600 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>
    </div>
  );
}
