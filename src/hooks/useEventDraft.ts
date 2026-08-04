'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isBefore, isSameDay, startOfDay } from 'date-fns';
import { detectUserTimezone } from '@/lib/timezones';
import { useCreatedEvents, saveUserDisplayName, getUserDisplayName } from '@/hooks/useCreatedEvents';
import { isQuestionType, validateQuestion, MAX_QUESTIONS, type QuestionDraft } from '@/lib/questions';

export type EventDraftType = 'availability' | 'fixed' | null;

const DRAFT_KEY = 'wg_draft_v1';

/** Serializable snapshot persisted to sessionStorage so a refresh mid-wizard loses nothing. */
interface DraftSnapshot {
  eventType: EventDraftType;
  name: string;
  organizerName: string;
  allDay: boolean;
  selectedDates: string[]; // ISO
  fixedDate: string;
  fixedEndDate: string;
  fixedTime: string;
  fixedEndTime: string;
  timeStart: string;
  timeEnd: string;
  timezone: string;
  location: string;
  body: string;
  questions: QuestionDraft[];
}

/**
 * All state + submit logic for creating an event, extracted from the old
 * single-page EventForm so wizard steps can be purely presentational.
 *
 * Advanced options (color, photo, logo, capacity, deadlines, module toggles,
 * email, hide-guest-list) are intentionally absent — they live in post-create
 * editing now. The POST payload with these defaults matches what the old form
 * sent when those fields were untouched.
 */
export function useEventDraft() {
  const searchParams = useSearchParams();
  const { addEvent } = useCreatedEvents();

  const [eventType, setEventTypeRaw] = useState<EventDraftType>(null);
  const [name, setName] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [fixedDate, setFixedDate] = useState('');
  const [fixedEndDate, setFixedEndDate] = useState('');
  const [fixedTime, setFixedTime] = useState('09:00');
  const [fixedEndTime, setFixedEndTime] = useState('10:00');
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('17:00');
  const [timezone, setTimezone] = useState(detectUserTimezone);
  const [location, setLocation] = useState('');
  const [body, setBody] = useState('');
  // Custom questions built during creation. No ids yet — the event doesn't
  // exist, so these are PUT immediately after it's created.
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const restored = useRef(false);

  // Restore a draft from this browser session, then apply ?duplicate= and the
  // saved display name on top (a fresh duplicate link should win over a stale draft).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const snap = JSON.parse(raw) as DraftSnapshot;
        const today = startOfDay(new Date());
        setEventTypeRaw(snap.eventType ?? null);
        setName(snap.name ?? '');
        setOrganizerName(snap.organizerName ?? '');
        setAllDay(!!snap.allDay);
        setSelectedDates(
          (snap.selectedDates ?? [])
            .map((iso) => new Date(iso))
            .filter((d) => !isNaN(d.getTime()) && !isBefore(d, today))
        );
        const todayStr = format(today, 'yyyy-MM-dd');
        setFixedDate(snap.fixedDate && snap.fixedDate >= todayStr ? snap.fixedDate : '');
        setFixedEndDate(snap.fixedEndDate && snap.fixedEndDate >= todayStr ? snap.fixedEndDate : '');
        setFixedTime(snap.fixedTime || '09:00');
        setFixedEndTime(snap.fixedEndTime || '10:00');
        setTimeStart(snap.timeStart || '09:00');
        setTimeEnd(snap.timeEnd || '17:00');
        if (snap.timezone) setTimezone(snap.timezone);
        setLocation(snap.location ?? '');
        setBody(snap.body ?? '');
        setQuestions(
          Array.isArray(snap.questions)
            ? snap.questions
                .filter((q) => q && typeof q.label === 'string' && isQuestionType(q.type))
                .slice(0, MAX_QUESTIONS)
            : []
        );
      }
    } catch { /* corrupt draft — start clean */ }

    const dupName = searchParams.get('duplicate');
    if (dupName) setName(dupName);
    const savedName = getUserDisplayName();
    if (savedName) setOrganizerName((curr) => curr || savedName);
  }, [searchParams]);

  // Debounced persistence of everything a refresh shouldn't lose.
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => {
      const snap: DraftSnapshot = {
        eventType, name, organizerName, allDay,
        selectedDates: selectedDates.map((d) => d.toISOString()),
        fixedDate, fixedEndDate, fixedTime, fixedEndTime,
        timeStart, timeEnd, timezone, location, body, questions,
      };
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snap)); } catch { /* storage full/blocked */ }
    }, 400);
    return () => clearTimeout(t);
  }, [eventType, name, organizerName, allDay, selectedDates, fixedDate, fixedEndDate,
      fixedTime, fixedEndTime, timeStart, timeEnd, timezone, location, body, questions]);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, []);

  // Switching type resets all scheduling state so nothing bleeds between flows
  // (same contract as the old form's handleChangeType).
  const setEventType = useCallback((t: EventDraftType) => {
    setEventTypeRaw(t);
    setAllDay(false);
    setSelectedDates([]);
    setFixedDate('');
    setFixedEndDate('');
    setFixedTime('09:00');
    setFixedEndTime('10:00');
    setTimeStart('09:00');
    setTimeEnd('17:00');
    setError('');
  }, []);

  // Toggle a proposed day (availability flow). First pick seeds a sensible
  // time window: weekends default to 10-8, weekdays 9-5.
  const toggleDate = useCallback((date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return;
    setSelectedDates((prev) => {
      const exists = prev.find((d) => isSameDay(d, date));
      if (exists) {
        const updated = prev.filter((d) => !isSameDay(d, date));
        if (updated.length === 0) {
          setTimeStart('09:00');
          setTimeEnd('17:00');
        }
        return updated;
      }
      const updated = [...prev, date].sort((a, b) => a.getTime() - b.getTime());
      if (prev.length === 0) {
        const day = date.getDay();
        if (day === 0 || day === 6) {
          setTimeStart('10:00');
          setTimeEnd('20:00');
        } else {
          setTimeStart('09:00');
          setTimeEnd('17:00');
        }
      }
      return updated;
    });
  }, []);

  // Per-step validity, used by the wizard to gate Next and clamp deep links.
  const hasName = name.trim().length > 0;
  const hasOrganizer = organizerName.trim().length > 0;
  const hasDates = eventType === 'fixed' ? fixedDate.length > 0 : selectedDates.length > 0;
  const timeValid = eventType === 'fixed'
    ? allDay || fixedTime < fixedEndTime
    : allDay || timeStart < timeEnd;
  const stepValid = {
    type: eventType !== null,
    name: hasName && hasOrganizer,
    date: hasDates && (!allDay || eventType !== 'fixed' || !fixedEndDate || fixedEndDate >= fixedDate),
    time: timeValid,
    extras: true,
    questions: questions.every((q) => validateQuestion(q) === null),
    review: hasName && hasOrganizer && hasDates && timeValid,
  };

  /** Create the event. Resolves with the new slug + id; throws with a user-facing message. */
  const submit = useCallback(async (): Promise<{ slug: string; id: string }> => {
    if (!eventType || !name.trim() || !organizerName.trim()) {
      throw new Error('Missing required fields');
    }
    setLoading(true);
    setError('');

    // All-day sends 240 — a sentinel satisfying the DB duration CHECK enum;
    // fixed events derive duration from start/end; availability defaults to 60.
    const resolvedDuration = allDay
      ? 240
      : eventType === 'fixed'
        ? (() => {
            const [sh, sm] = fixedTime.split(':').map(Number);
            const [eh, em] = fixedEndTime.split(':').map(Number);
            return (eh * 60 + em) - (sh * 60 + sm);
          })()
        : 60;

    try {
      const commonPayload = {
        name: name.trim(),
        body: body.trim() || null,
        organizerName: organizerName.trim() || null,
        ...(allDay && { allDay: true }),
        location: location.trim() || null,
        durationMinutes: resolvedDuration,
        timezone,
        maxParticipants: null,
        eventKind: 'casual',
        eventType,
      };

      const typePayload = eventType === 'fixed'
        ? { fixedDate, fixedTime, ...(allDay && fixedEndDate && { fixedEndDate }) }
        : {
            dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
            timeStart,
            timeEnd,
            minResponses: null,
            responseDeadline: null,
          };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonPayload, ...typePayload }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      const { id, slug, organizerToken, organizerParticipantId, organizerName: returnedName } = await res.json();
      localStorage.setItem(`organizer_${slug}`, organizerToken);
      if (organizerParticipantId && returnedName) {
        localStorage.setItem(
          `participant_${slug}`,
          JSON.stringify({ id: organizerParticipantId, name: returnedName })
        );
      }

      // Questions need the event to exist first (the PUT is organizer-token
      // authed). Non-fatal: the event matters more, and they can still be
      // added later from Customize → Custom questions.
      if (id && questions.length > 0) {
        try {
          await fetch(`/api/events/${id}/questions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizer_token: organizerToken,
              questions: questions.map(({ type, label, options, required }) => ({
                type,
                label,
                options: options.map((o) => o.trim()).filter(Boolean),
                required,
              })),
            }),
          });
        } catch { /* skip — see above */ }
      }

      addEvent(slug, name.trim());
      saveUserDisplayName(organizerName.trim());
      clearDraft();
      setLoading(false);
      return { slug, id };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setLoading(false);
      throw err;
    }
  }, [eventType, name, organizerName, allDay, fixedDate, fixedEndDate, fixedTime,
      fixedEndTime, selectedDates, timeStart, timeEnd, timezone, location, body,
      questions, addEvent, clearDraft]);

  return {
    // fields
    eventType, name, organizerName, allDay, selectedDates,
    fixedDate, fixedEndDate, fixedTime, fixedEndTime,
    timeStart, timeEnd, timezone, location, body, questions,
    // setters
    setEventType, setName, setOrganizerName, setAllDay, setSelectedDates,
    setFixedDate, setFixedEndDate, setFixedTime, setFixedEndTime,
    setTimeStart, setTimeEnd, setTimezone, setLocation, setBody, setQuestions,
    toggleDate,
    // derived + actions
    stepValid, loading, error, setError, submit, clearDraft,
  };
}

export type EventDraft = ReturnType<typeof useEventDraft>;
