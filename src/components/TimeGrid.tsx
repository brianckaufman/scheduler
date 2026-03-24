'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { formatDisplayName } from '@/lib/names';
import { generateSlots, getSlotStep } from '@/lib/slots';
import { computeOverlap, getFullOverlapSlots } from '@/lib/overlap';
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

  // Optimistic local toggles
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const [pendingRemoves, setPendingRemoves] = useState<Set<string>>(new Set());

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const draggedSlots = useRef<Set<string>>(new Set());

  // Mobile day tabs
  const [activeDay, setActiveDay] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // "Availability saved" one-time confirmation
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasShownSavedToast = useRef(false);

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

  // Clean up toast timer on unmount
  useEffect(() => () => clearTimeout(savedToastTimer.current), []);

  const durationMinutes = event.duration_minutes || 30;

  const gridSlots = useMemo(
    () => generateSlots(event.dates, event.time_start, event.time_end, event.timezone, durationMinutes),
    [event.dates, event.time_start, event.time_end, event.timezone, durationMinutes]
  );

  // Step size and cell height adapt to event duration
  const slotStep = getSlotStep(durationMinutes);
  // Taller cells for longer slots so the visual weight matches the time commitment
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
        if (error) {
          setPendingAdds((prev) => { const n = new Set(prev); n.delete(slotKey); return n; });
        } else if (!hasShownSavedToast.current) {
          hasShownSavedToast.current = true;
          setShowSavedToast(true);
          clearTimeout(savedToastTimer.current);
          savedToastTimer.current = setTimeout(() => setShowSavedToast(false), 3000);
        }
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

  return (
    <div className="space-y-6" onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
      {/* Always-visible status notice */}
      {overlapStatus === 'waiting' && !event.finalized_time && (
        <div className="animate-fade-in bg-gray-50 rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
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
          <p className="text-center text-xs text-gray-400">
            Share the link above so everyone can mark their availability.
          </p>
        )}
        </div>
      )}
      {overlapStatus === 'none' && !event.finalized_time && (
        <div className="animate-fade-in bg-amber-50 rounded-xl p-4 text-center text-sm text-amber-700">
          {copy.grid.no_overlap}
          {isOrganizer && (
            <p className="text-xs text-amber-600 mt-1">Consider expanding the date range or time window.</p>
          )}
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
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 self-center mx-auto">
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
                className="flex flex-col items-center justify-center sticky left-0 bg-white z-10"
              >
                <span className="text-xs font-medium text-gray-600 leading-tight">{startLabel}</span>
                {slotStep > 15 && (
                  <span className="text-xs text-gray-400 leading-tight">{endLabel}</span>
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
              <span className="text-xs text-gray-400">{copy.grid.legend_all}</span>
            </div>
            {totalParticipants > 6 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(20, 184, 166, 0.35)' }} />
                <span className="text-xs text-gray-400">{copy.grid.legend_heat}</span>
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
                <span className={`text-sm truncate ${p.id === participantId ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                  {formatDisplayName(p.name)}
                  {p.id === participantId && <span className="ml-1 text-xs text-gray-400 font-normal">{copy.grid.you_suffix?.replace(/[()]/g, '').trim() ?? 'you'}</span>}
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
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 ml-2 shrink-0"
                  title={`Remove ${formatDisplayName(p.name)}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
          {participants.length > 8 && !showAllParticipants && (
            <li className="text-xs text-gray-400 pl-[18px]">
              +{participants.length - 6} more
            </li>
          )}
        </ul>

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

      {/* "Availability saved" floating toast — shows once on first slot selection */}
      {showSavedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in-scale">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full shadow-lg whitespace-nowrap">
            <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Availability saved
          </div>
        </div>
      )}
    </div>
  );
}
