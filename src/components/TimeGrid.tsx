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
import AnimatedNumber from './AnimatedNumber';
import SlotTooltip from './SlotTooltip';
import GuestSaveBar from './GuestSaveBar';
import GuestDoneCard from './GuestDoneCard';
import GuestQuestions from './GuestQuestions';
import OrganizerResponses from './OrganizerResponses';
import HowItWorksModal from './HowItWorksModal';
import { getTimezoneLabel } from '@/lib/timezones';
import {
  csvJoin, csvFilename, downloadCsv, buildAnswerMap, answerCells, dedupeHeaders, type AnswerRow,
} from '@/lib/csv';
import type { EventQuestion } from '@/lib/questions';
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
  participantName?: string;
  isOrganizer?: boolean;
  organizerToken?: string | null;
  onFinalize?: (time: string) => void;
  onMySlotCountChange?: (count: number) => void;
  onParticipantCountChange?: (count: number) => void;
  /** Reports (savedResponse, unsavedChanges, questionsStillNeeded) so the page can show progress. */
  onResponseStateChange?: (responded: boolean, pending: boolean, questionsPending?: boolean) => void;
}

export default function TimeGrid({ event, participantId, participantName, isOrganizer, organizerToken, onFinalize, onMySlotCountChange, onParticipantCountChange, onResponseStateChange }: TimeGridProps) {
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

  // Save failures surface in the sticky save bar with a retry, never silently.
  const [saveError, setSaveError] = useState('');
  // "How does this work?" modal — reopenable from the done card.
  const [showHow, setShowHow] = useState(false);

  // The host's custom questions, asked once availability is saved.
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [qRequiredMet, setQRequiredMet] = useState(true);
  const [qPending, setQPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const questionsRef = useRef<HTMLDivElement>(null);
  const wasSavedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${event.id}/questions`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setQuestions(d.questions ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [event.id]);

  const handleQuestionsState = useCallback((met: boolean, pending: boolean) => {
    setQRequiredMet(met);
    setQPending(pending);
  }, []);

  // Time picker modal (organizer only)
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Organizer breakdown: who is free at each slot
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Expandable participant list for large groups
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);

  // Tooltip
  const [tooltipSlot, setTooltipSlot] = useState<string | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);


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

  // Report saved/pending state so the page-level progress banner tracks it.
  // "Done" means availability saved AND the host's required questions answered.
  const savedCount = serverMySlots.size;
  const availabilitySaved = savedCount > 0 && !hasStagedChanges;
  const questionsBlocking = availabilitySaved && questions.some((q) => q.required) && !qRequiredMet;
  const fullyDone = availabilitySaved && !questionsBlocking;

  useEffect(() => {
    onResponseStateChange?.(
      fullyDone,
      hasStagedChanges,
      questionsBlocking || (availabilitySaved && qPending),
    );
  }, [fullyDone, hasStagedChanges, questionsBlocking, availabilitySaved, qPending, onResponseStateChange]);

  // Reveal the questions the moment availability lands, so they're not missed.
  useEffect(() => {
    if (availabilitySaved && !wasSavedRef.current && questions.length > 0) {
      const t = setTimeout(() => questionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
      wasSavedRef.current = availabilitySaved;
      return () => clearTimeout(t);
    }
    wasSavedRef.current = availabilitySaved;
  }, [availabilitySaved, questions.length]);

  // Don't let unsaved taps silently vanish on a closed tab.
  useEffect(() => {
    if (!hasStagedChanges) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasStagedChanges]);

  // Report participant count to parent (for celebration component)
  const participantCount = participants.length;
  useEffect(() => {
    onParticipantCountChange?.(participantCount);
  }, [participantCount, onParticipantCountChange]);

  const totalParticipants = participants.length;
  // When the organizer hides the guest list, only they see the names; everyone
  // else still sees the overlap/heatmap, just not who responded.
  const canSeeNames = isOrganizer || !event.hide_guest_list;

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
    setSaveError('');

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
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError("Couldn't save your times — check your connection.");
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

  // How many people the organizer said they need before a time can be picked.
  // Unset means "everyone who has replied so far".
  const requiredCount = event.min_responses && event.min_responses >= 2
    ? event.min_responses
    : totalParticipants;
  // Enough people have replied at all — distinct from "enough overlap on a slot".
  const enoughResponses = totalParticipants >= requiredCount;

  // Overlap status:
  //  - waiting: fewer people have replied than the organizer asked for
  //  - found:   at least one time clears the required bar
  //  - partial: best time works for some (≥2) but short of the bar
  //  - none:    no two people share any time
  const overlapStatus = useMemo(() => {
    if (totalParticipants < 2) return 'waiting' as const;
    // 2 of 3 replied is still waiting — don't imply we're ready to pick.
    if (!enoughResponses) return 'waiting' as const;
    if (maxOverlap >= requiredCount) return 'found' as const;
    if (maxOverlap >= 2) return 'partial' as const;
    return 'none' as const;
  }, [totalParticipants, maxOverlap, enoughResponses, requiredCount]);

  /** A slot clears the bar the organizer set — the ones actually worth picking. */
  const meetsThreshold = useCallback(
    (count: number) => requiredCount >= 2 && count >= requiredCount,
    [requiredCount],
  );

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

  // One combined file: event metadata, the availability matrix, and a column
  // per custom question — so an organizer never has to join two exports.
  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      let answers: AnswerRow[] = [];
      if (questions.length > 0 && organizerToken) {
        try {
          const r = await fetch(
            `/api/events/${event.id}/responses?organizer_token=${encodeURIComponent(organizerToken)}`,
          );
          answers = (await r.json()).responses ?? [];
        } catch { /* fall back to availability only */ }
      }
      const answerMap = buildAnswerMap(answers);
      const qHeaders = dedupeHeaders(questions.map((q) => q.label));

      // All slot keys across all participants, sorted chronologically
      const allSlotKeys = [...new Set(
        allSlots.map((s) => new Date(s.slot_start).toISOString())
      )].sort();
      const slotLabels = allSlotKeys.map((k) => format(new Date(k), 'EEE MMM d, h:mm a'));

      const rows: string[][] = [
        ['Event', event.name],
        ...(event.organizer_name ? [['Organizer', event.organizer_name]] : []),
        ['Dates', event.dates.map((d) => format(parseISO(d), 'EEE MMM d yyyy')).join('; ')],
        ['Time window', `${event.time_start} - ${event.time_end}`],
        ['Timezone', event.timezone],
        ['Duration', `${durationMinutes} minutes`],
        ['Finalized time', event.finalized_time
          ? format(new Date(event.finalized_time), 'EEE MMM d yyyy h:mm a')
          : 'Not yet set'],
        ['Total participants', String(participants.length)],
        [],
        ['Name', 'Slots selected', ...slotLabels, ...qHeaders],
      ];

      for (const p of participants) {
        const pSlots = new Set(
          allSlots
            .filter((s) => s.participant_id === p.id)
            .map((s) => new Date(s.slot_start).toISOString())
        );
        rows.push([
          p.name,
          String(pSlots.size),
          ...allSlotKeys.map((k) => (pSlots.has(k) ? '✓' : '')),
          ...answerCells(questions, answerMap, p.id),
        ]);
      }

      downloadCsv(csvFilename(event.name, 'availability'), csvJoin(rows));
    } finally {
      setExporting(false);
    }
  }, [allSlots, participants, event, durationMinutes, questions, organizerToken]);

  return (
    <div className="space-y-6" onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
      {/* Persistent "you're done" confirmation — guests with saved availability */}
      {!isOrganizer && !event.finalized_time && fullyDone && !saveError && (
        <GuestDoneCard
          event={event}
          participantId={participantId}
          participantName={participantName || ''}
          savedCount={savedCount}
          mode="times"
          onShowHow={() => setShowHow(true)}
        />
      )}

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
          {totalParticipants >= 2 && !enoughResponses
            ? `Waiting on the group — ${totalParticipants} of ${requiredCount} have replied`
            : copy.grid.waiting}
        </div>
        {totalParticipants >= 2 && !enoughResponses && maxOverlap >= 2 && (
          <p className="text-center text-xs text-faint">
            {maxOverlap} {maxOverlap === 1 ? 'person has' : 'people have'} overlapping times already
            {isOrganizer ? " — you can still pick early if you need to." : '.'}
          </p>
        )}
        {isOrganizer && (
          <>
            <p className="text-center text-xs text-faint">
              Share the link above so everyone can mark their availability.
            </p>
            {!enoughResponses && maxOverlap >= 2 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className="px-5 py-2 text-sm font-semibold text-secondary bg-fill hover:bg-fill2 border border-hairline rounded-full transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  Pick a time anyway
                </button>
              </div>
            )}
          </>
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
      {overlapStatus === 'partial' && !event.finalized_time && isOrganizer && (
        <div className="flex justify-center animate-fade-in">
          <button
            type="button"
            onClick={() => setShowTimePicker(true)}
            className="px-8 py-3 bg-teal-500 text-white text-base font-semibold rounded-full hover:bg-teal-600 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer min-w-[180px]"
          >
            {copy.grid.pick_time}
          </button>
        </div>
      )}
      {overlapStatus === 'found' && !event.finalized_time && (
        <div className="animate-fade-in-scale bg-green-50 dark:bg-[#112D25] rounded-xl p-4 text-center">
          <p className="text-sm text-success-fg font-medium">
            {maxOverlap >= totalParticipants
              ? copy.grid.overlap_found
              : `${maxOverlap} of ${totalParticipants} can make it — enough to pick a time`}
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

      {/* What to do here — the single most important instruction on the page,
          with the timezone as a self-sizing pill beneath it. */}
      <div className="text-center space-y-2">
        {!event.finalized_time && (
          <div>
            <h2 className="text-base font-bold text-heading">{copy.event.tap_instruction}</h2>
            <p className="text-xs text-muted mt-1 px-4 leading-relaxed">
              Tap once to mark yourself free — tap again to undo.
            </p>
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted bg-subtle rounded-lg px-3 py-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{interpolate(copy.grid.timezone_label, { timezone: timezoneLabel })}</span>
        </div>
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
                <div className="whitespace-nowrap">{format(parseISO(date), 'EEE M/d')}</div>
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
                    meetsThreshold={meetsThreshold(othersCount)}
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

      {/* The host's questions — asked once availability is saved */}
      {questions.length > 0 && availabilitySaved && !event.finalized_time && (
        <div ref={questionsRef}>
          <GuestQuestions
            eventId={event.id}
            participantId={participantId}
            questions={questions}
            organizerName={event.organizer_name}
            onStateChange={handleQuestionsState}
          />
        </div>
      )}

      {/* Sticky save bar — always visible until the guest has saved */}
      {!event.finalized_time && (
        <GuestSaveBar
          mode="times"
          savedCount={savedCount}
          addedCount={stagedAdds.size}
          removedCount={stagedRemoves.size}
          isSaving={isSaving}
          error={saveError}
          onSave={handleSave}
        />
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
          {canSeeNames ? (
            <button
              type="button"
              onClick={() => setShowParticipants((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-muted uppercase tracking-wide hover:text-body transition-colors cursor-pointer"
            >
              {(() => {
                const [pre, post] = copy.grid.participants_label.split('{{count}}');
                return <>{pre}<AnimatedNumber value={participants.length} className="text-body" />{post}</>;
              })()}
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showParticipants ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <h3 className="flex items-center gap-1 text-xs font-semibold text-muted uppercase tracking-wide">
              {(() => {
                const [pre, post] = copy.grid.participants_label.split('{{count}}');
                return <>{pre}<AnimatedNumber value={participants.length} className="text-body" />{post}</>;
              })()}
            </h3>
          )}
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
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(var(--t-heat-rgb), 0.5)' }} />
                <span className="text-xs text-faint">{copy.grid.legend_heat}</span>
              </div>
            )}
          </div>
        </div>
        {!canSeeNames && (
          <p className="text-xs text-faint italic">Only the organizer can see who&apos;s responded.</p>
        )}
        {canSeeNames && showParticipants && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
          {(participants.length > 8 && !showAllParticipants
            ? participants.slice(0, 6)
            : participants
          ).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-1 min-w-0 group animate-fade-in">
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
          {participants.length > 8 && (
            <li className="col-span-full">
              <button
                type="button"
                onClick={() => setShowAllParticipants((v) => !v)}
                className="text-xs font-medium text-teal-500 hover:text-teal-700 transition-colors cursor-pointer pl-[18px]"
              >
                {showAllParticipants ? copy.grid.show_less : `+${participants.length - 6} more`}
              </button>
            </li>
          )}
        </ul>
        )}

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
        {isOrganizer && organizerToken && questions.length > 0 && (
          <div className="w-full">
            <OrganizerResponses eventId={event.id} organizerToken={organizerToken} questions={questions} />
          </div>
        )}

        {isOrganizer && participants.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 text-xs text-faint hover:text-teal-600 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'Preparing…' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Reopenable instructions */}
      {showHow && <HowItWorksModal event={event} onClose={() => setShowHow(false)} />}
    </div>
  );
}
