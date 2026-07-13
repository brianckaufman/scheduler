'use client';

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
import { useRouter, useSearchParams } from 'next/navigation';
import { useCopy } from '@/contexts/CopyContext';
import { useCreatedEvents, saveUserDisplayName, getUserDisplayName } from '@/hooks/useCreatedEvents';
import {
  format,
  addMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { POPULAR_TIMEZONES, detectUserTimezone, getTimezoneLabel } from '@/lib/timezones';
import LocationInput from '@/components/LocationInput';
import EventColorPicker from '@/components/EventColorPicker';
import EventImagePicker from '@/components/EventImagePicker';
import { EVENT_KINDS } from '@/lib/eventTypes';
import { getModules, MODULE_TOGGLES, type EventModules } from '@/lib/eventConfig';

interface EventFormProps {
  enableFixedEvents?: boolean;
}

function generateTimeOptions() {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return options;
}

function formatTimeLabel(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const TIME_OPTIONS = generateTimeOptions();
const DURATION_OPTIONS = [
  { value: 10,  label: '10 minutes' },
  { value: 15,  label: '15 minutes' },
  { value: 30,  label: '30 minutes' },
  { value: 45,  label: '45 minutes' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 0,   label: 'All day' },
];

export default function EventForm({ enableFixedEvents = false }: EventFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = useCopy();
  const { addEvent } = useCreatedEvents();
  const [eventType, setEventType] = useState<'availability' | 'fixed' | null>(
    enableFixedEvents ? null : 'availability'
  );

  // Tell the surrounding HomeTabs to hide its tab bar once the user picks a type
  // (begins creating). Only meaningful when the type chooser is in play.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('eventform-creating', { detail: enableFixedEvents && eventType !== null })
    );
  }, [eventType, enableFixedEvents]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [responseDeadline, setResponseDeadline] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [minResponses, setMinResponses] = useState('');
  const [minResponsesCustom, setMinResponsesCustom] = useState(false);
  const [color, setColor] = useState('');
  const [hideGuestList, setHideGuestList] = useState(false);
  const [eventKind, setEventKind] = useState('casual');
  const [modules, setModules] = useState<EventModules>(() => getModules({ event_kind: 'casual' }));
  // Create-time branding images (cropped/optimized locally, uploaded after create).
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoExt, setPhotoExt] = useState('webp');
  const [photoPreview, setPhotoPreview] = useState('');
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoExt, setLogoExt] = useState('webp');
  const [logoPreview, setLogoPreview] = useState('');

  const pickPhoto = (blob: Blob, ext: string) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoBlob(blob); setPhotoExt(ext); setPhotoPreview(URL.createObjectURL(blob));
  };
  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoBlob(null); setPhotoPreview('');
  };
  const pickLogo = (blob: Blob, ext: string) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoBlob(blob); setLogoExt(ext); setLogoPreview(URL.createObjectURL(blob));
  };
  const clearLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoBlob(null); setLogoPreview('');
  };
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('17:00');
  const [timezone, setTimezone] = useState(detectUserTimezone);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Fixed-event fields
  const [fixedDate, setFixedDate] = useState('');
  const [fixedTime, setFixedTime] = useState('09:00');
  const [fixedEndTime, setFixedEndTime] = useState('10:00');
  // All-day mode (both flows) — whole days, no time-of-day. fixedEndDate is
  // only meaningful for a multi-day fixed (RSVP) range; fixedDate doubles as
  // the range start.
  const [allDay, setAllDay] = useState(false);
  const [fixedEndDate, setFixedEndDate] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Pre-fill from duplicate query param and saved user name
  useEffect(() => {
    const dupName = searchParams.get('duplicate');
    if (dupName) setName(dupName);
    const savedName = getUserDisplayName();
    if (savedName) setOrganizerName(savedName);
  }, [searchParams]);

  const today = startOfDay(new Date());
  const minDeadline = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const minFixedDate = format(new Date(), 'yyyy-MM-dd');

  // Progress tracking
  const hasName = name.trim().length > 0;
  const hasOrganizer = organizerName.trim().length > 0;
  const hasDates = eventType === 'fixed' ? fixedDate.length > 0 : selectedDates.length > 0;
  const filledSteps = [hasName, hasOrganizer, hasDates].filter(Boolean).length;
  const isReady = hasName && hasOrganizer && hasDates;

  const toggleDate = (date: Date) => {
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
  };

  const renderMonthNav = () => (
    <div className="flex items-center justify-between mb-3">
      <button
        type="button"
        onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
        className="p-2 text-faint hover:text-secondary hover:bg-fill rounded-lg transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="font-semibold text-heading text-sm">
        {format(currentMonth, 'MMMM yyyy')}
      </span>
      <button
        type="button"
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        className="p-2 text-faint hover:text-secondary hover:bg-fill rounded-lg transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  const renderWeekdayHeader = () => (
    <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-faint font-medium mb-1">
      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
        <div key={d} className="py-1">{d}</div>
      ))}
    </div>
  );

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
      <div>
        {renderMonthNav()}
        {renderWeekdayHeader()}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, currentMonth);
            const selected = selectedDates.some((d) => isSameDay(d, day));
            const past = isBefore(day, today);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={past || !inMonth}
                onClick={() => toggleDate(day)}
                className={`
                  py-2 rounded-lg text-sm font-medium transition-all duration-150
                  ${!inMonth ? 'invisible' : ''}
                  ${past ? 'text-faint2 cursor-not-allowed' : 'cursor-pointer active:scale-90'}
                  ${selected ? 'bg-social-500 text-white shadow-sm shadow-social-200 dark:shadow-none animate-pop' : ''}
                  ${!selected && !past && inMonth ? 'text-body hover:bg-fill' : ''}
                  ${isToday(day) && !selected ? 'ring-1 ring-social-500' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Two/three-tap range picker for all-day fixed events: tap a start day, tap
  // an end day (tapping the same day again makes a single-day range), tap
  // again after a full range is set to start over.
  const handleRangeDayClick = (day: Date) => {
    if (isBefore(day, today)) return;
    const dayStr = format(day, 'yyyy-MM-dd');
    if (!fixedDate) {
      setFixedDate(dayStr);
      setFixedEndDate('');
    } else if (!fixedEndDate) {
      if (dayStr < fixedDate) setFixedDate(dayStr);
      else setFixedEndDate(dayStr);
    } else {
      setFixedDate(dayStr);
      setFixedEndDate('');
    }
  };

  const renderRangeCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    const rangeEnd = fixedEndDate || fixedDate;

    return (
      <div>
        {renderMonthNav()}
        {renderWeekdayHeader()}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, currentMonth);
            const past = isBefore(day, today);
            const dayStr = format(day, 'yyyy-MM-dd');
            const isStart = !!fixedDate && dayStr === fixedDate;
            const isEnd = !!rangeEnd && dayStr === rangeEnd;
            const inRange = !!fixedDate && dayStr >= fixedDate && dayStr <= rangeEnd;

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={past || !inMonth}
                onClick={() => handleRangeDayClick(day)}
                className={`
                  py-2 text-sm font-medium transition-all duration-150
                  ${!inMonth ? 'invisible' : ''}
                  ${past ? 'text-faint2 cursor-not-allowed' : 'cursor-pointer active:scale-90'}
                  ${isStart || isEnd ? 'bg-teal-500 text-white shadow-sm animate-pop' : inRange ? 'bg-teal-100 dark:bg-[#0D2E2A] text-teal-700 dark:text-teal-300' : ''}
                  ${!inRange && !past && inMonth ? 'text-body hover:bg-fill' : ''}
                  ${isToday(day) && !inRange ? 'ring-1 ring-teal-500' : ''}
                  ${isStart && !isEnd ? 'rounded-l-lg' : isEnd && !isStart ? 'rounded-r-lg' : inRange && !isStart && !isEnd ? '' : 'rounded-lg'}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Clear scheduling state when switching event type — otherwise a range or
  // all-day toggle picked in one flow silently carries into the other (e.g.
  // "All-day" already checked, or a stale date range still highlighted).
  const handleChangeType = () => {
    setEventType(null);
    setAllDay(false);
    setSelectedDates([]);
    setFixedDate('');
    setFixedEndDate('');
    setFixedTime('09:00');
    setFixedEndTime('10:00');
    setTimeStart('09:00');
    setTimeEnd('17:00');
    setDurationMinutes(60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organizerName.trim()) return;

    if (!eventType) return;

    if (eventType === 'availability') {
      if (selectedDates.length === 0) return;
      if (!allDay && timeStart >= timeEnd) {
        setError(copy.form.error_time);
        return;
      }
    } else {
      if (!fixedDate) return;
      if (allDay) {
        if (fixedEndDate && fixedEndDate < fixedDate) {
          setError('End date must be on or after the start date');
          return;
        }
      } else {
        const [sh, sm] = fixedTime.split(':').map(Number);
        const [eh, em] = fixedEndTime.split(':').map(Number);
        if (eh * 60 + em <= sh * 60 + sm) {
          setError('End time must be after start time');
          return;
        }
      }
    }

    setLoading(true);
    setError('');

    // Resolve duration: all-day events send 240 — a pure sentinel (duration is
    // meaningless for a whole-day event) that satisfies the DB's duration
    // CHECK constraint, which only allows a fixed enum of values; fixed events
    // use start/end times; availability events use the selected duration, or
    // span the full time window for "All day" (value 0).
    const resolvedDuration = allDay
      ? 240
      : eventType === 'fixed'
        ? (() => {
            const [sh, sm] = fixedTime.split(':').map(Number);
            const [eh, em] = fixedEndTime.split(':').map(Number);
            return (eh * 60 + em) - (sh * 60 + sm);
          })()
        : durationMinutes === 0
          ? (() => {
              const [sh, sm] = timeStart.split(':').map(Number);
              const [eh, em] = timeEnd.split(':').map(Number);
              return (eh * 60 + em) - (sh * 60 + sm);
            })()
          : durationMinutes;

    try {
      const commonPayload = {
        name: name.trim(),
        description: description.trim() || null,
        body: body.trim() || null,
        organizerName: organizerName.trim() || null,
        ...(organizerEmail.trim() && { organizerEmail: organizerEmail.trim() }),
        ...(color && { color }),
        ...(hideGuestList && { hideGuestList: true }),
        ...(allDay && { allDay: true }),
        location: location.trim() || null,
        durationMinutes: resolvedDuration,
        timezone,
        maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        eventKind,
        // Only send module overrides if the host changed them from the type defaults.
        ...(JSON.stringify(modules) !== JSON.stringify(getModules({ event_kind: eventKind })) ? { config: { modules } } : {}),
        eventType,
      };

      const typePayload = eventType === 'fixed'
        ? { fixedDate, fixedTime, ...(allDay && fixedEndDate && { fixedEndDate }) }
        : {
            dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
            timeStart,
            timeEnd,
            minResponses: minResponses ? parseInt(minResponses, 10) : null,
            responseDeadline: responseDeadline
              ? new Date(responseDeadline + 'T23:59:59').toISOString()
              : null,
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

      // Upload create-time branding images now that the event exists, then
      // persist their URLs. Failures are non-fatal — the event is already made.
      if (id && (photoBlob || logoBlob)) {
        const branding: Record<string, string> = {};
        const uploads: [Blob | null, string, 'photo' | 'logo'][] = [
          [photoBlob, photoExt, 'photo'],
          [logoBlob, logoExt, 'logo'],
        ];
        for (const [blob, ext, kind] of uploads) {
          if (!blob) continue;
          try {
            const fd = new FormData();
            fd.append('file', new File([blob], `${kind}.${ext}`, { type: blob.type }));
            fd.append('kind', kind);
            fd.append('organizer_token', organizerToken);
            const up = await fetch(`/api/events/${id}/upload`, { method: 'POST', body: fd });
            const d = await up.json().catch(() => ({}));
            if (up.ok && d.url) branding[kind === 'photo' ? 'photo_url' : 'logo_url'] = d.url;
          } catch { /* skip this image */ }
        }
        if (Object.keys(branding).length) {
          await fetch(`/api/events/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizer_token: organizerToken, ...branding }),
          }).catch(() => {});
        }
      }

      sessionStorage.setItem('just_created', 'true');
      addEvent(slug, name.trim());
      saveUserDisplayName(organizerName.trim());
      router.push(`/e/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-social-500 focus:border-transparent text-base text-heading placeholder-faint transition-shadow duration-200";
  const selectClass = "w-full px-3 py-3 rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-social-500 text-base text-heading bg-surface transition-shadow duration-200";

  // === Type picker (shown before the form when fixed events are enabled) ===
  if (enableFixedEvents && eventType === null) {
    return (
      <div className="space-y-3 animate-fade-in">
        <p className="text-sm font-semibold text-body text-center mb-4">What kind of event are you creating?</p>

        <button
          type="button"
          onClick={() => setEventType('availability')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-hairline bg-surface hover:border-social-500 hover:bg-social-50 dark:hover:bg-[#1C1939] text-left transition-all duration-200 active:scale-[0.98] cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-social-100 dark:bg-[#1C1939] flex items-center justify-center shrink-0 group-hover:bg-social-100 dark:group-hover:bg-[#1C1939] transition-colors">
            <svg className="w-6 h-6 text-social-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M19.5 19.5L15.5 15.5" />
              <path d="M10.5 8v3l2 1.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-heading">Find a time</p>
            <p className="text-sm text-muted mt-0.5 leading-snug">Everyone marks when they&apos;re free. You pick the best time.</p>
          </div>
          <svg className="w-5 h-5 text-faint2 group-hover:text-social-fg shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setEventType('fixed')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-hairline bg-surface hover:border-teal-500 hover:bg-blue-50 dark:hover:bg-[#0D223A] text-left transition-all duration-200 active:scale-[0.98] cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-[#0D223A] flex items-center justify-center shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-[#0D223A] transition-colors">
            <svg className="w-6 h-6 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-heading">Event RSVP</p>
            <p className="text-sm text-muted mt-0.5 leading-snug">Set the date and time and invite people to attend.</p>
          </div>
          <svg className="w-5 h-5 text-faint2 group-hover:text-accent-fg shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* === Event type indicator + change button === */}
      {enableFixedEvents && (
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            eventType === 'fixed' ? 'bg-blue-100 dark:bg-[#0D223A] text-accent-fg' : 'bg-social-100 dark:bg-[#1C1939] text-social-fg'
          }`}>
            {eventType === 'fixed' ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M19.5 19.5L15.5 15.5" />
                <path d="M10.5 8v3l2 1.5" />
              </svg>
            )}
            {eventType === 'fixed' ? 'Event RSVP' : 'Find a time'}
          </div>
          <button
            type="button"
            onClick={handleChangeType}
            className="flex items-center gap-1 text-xs text-faint hover:text-secondary transition-colors cursor-pointer px-2 py-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h15m0 0l-3-3m3 3l-3 3M20 15H5m0 0l3-3m-3 3l3 3" />
            </svg>
            Change
          </button>
        </div>
      )}

      {/* === Section 1: Event Details === */}
      <div className="space-y-4 stagger-children">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-body mb-1.5">
            {copy.form.event_label}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.form.event_placeholder}
            className={inputClass}
            maxLength={100}
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="organizerName" className="block text-sm font-medium text-body mb-1.5">
            {copy.form.name_label}
          </label>
          <input
            id="organizerName"
            type="text"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder={copy.form.name_placeholder}
            className={inputClass}
            required
            maxLength={50}
          />
        </div>

      </div>

      {/* Subtle divider */}
      <div className="border-t border-hairline-soft" />

      {/* === Section 2a: Fixed time scheduling === */}
      {eventType === 'fixed' && (
        <div className="space-y-4 animate-fade-in">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => { setAllDay(e.target.checked); setFixedEndDate(''); }}
              className="h-4 w-4 rounded border-strong accent-teal-500 cursor-pointer shrink-0"
            />
            <span className="text-sm font-medium text-body">All-day event</span>
          </label>

          {allDay ? (
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                Event date{fixedEndDate ? ' range' : ''}
              </label>
              {renderRangeCalendar()}
              {fixedDate && (
                <p className="mt-2 text-sm text-teal-600 dark:text-teal-400 font-medium animate-fade-in">
                  {fixedEndDate && fixedEndDate !== fixedDate
                    ? `${fixedDate} – ${fixedEndDate}`
                    : 'Single day — tap another day to make it a range'}
                </p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="fixedDate" className="block text-sm font-medium text-body mb-1.5">
                  Event date
                </label>
                <input
                  id="fixedDate"
                  type="date"
                  value={fixedDate}
                  min={minFixedDate}
                  onChange={(e) => setFixedDate(e.target.value)}
                  className={selectClass}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fixedTime" className="block text-sm font-medium text-body mb-1.5">
                    Start time
                  </label>
                  <select
                    id="fixedTime"
                    value={fixedTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFixedTime(newStart);
                      // Auto-advance end time if it's no longer after start
                      const [sh, sm] = newStart.split(':').map(Number);
                      const [eh, em] = fixedEndTime.split(':').map(Number);
                      if (eh * 60 + em <= sh * 60 + sm) {
                        const next = sh * 60 + sm + 60;
                        const nh = Math.floor(next / 60) % 24;
                        const nm = next % 60;
                        setFixedEndTime(`${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`);
                      }
                    }}
                    className={selectClass}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fixedEndTime" className="block text-sm font-medium text-body mb-1.5">
                    End time
                  </label>
                  <select
                    id="fixedEndTime"
                    value={fixedEndTime}
                    onChange={(e) => setFixedEndTime(e.target.value)}
                    className={selectClass}
                  >
                    {TIME_OPTIONS.filter((t) => t > fixedTime).map((t) => {
                      const [sh, sm] = fixedTime.split(':').map(Number);
                      const [eh, em] = t.split(':').map(Number);
                      const mins = (eh * 60 + em) - (sh * 60 + sm);
                      const durLabel = mins < 60
                        ? `${mins} min`
                        : mins % 60 === 0
                          ? `${mins / 60} hr`
                          : `${Math.floor(mins / 60)}.5 hr`;
                      return (
                        <option key={t} value={t}>{formatTimeLabel(t)} ({durLabel})</option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* === Section 2b: Availability scheduling === */}
      {eventType === 'availability' && (
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-strong accent-social-500 cursor-pointer shrink-0"
            />
            <span className="text-sm font-medium text-body">All-day (whole days, not times)</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-body mb-2">
              {allDay ? 'Which days might work?' : copy.form.dates_label}
            </label>
            {renderCalendar()}
            {selectedDates.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 animate-fade-in">
                <svg className="w-3.5 h-3.5 text-social-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-social-fg font-medium">
                  {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="timeStart" className="block text-sm font-medium text-body mb-1.5">
                  {copy.form.earliest_label}
                </label>
                <select id="timeStart" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className={selectClass}>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="timeEnd" className="block text-sm font-medium text-body mb-1.5">
                  {copy.form.latest_label}
                </label>
                <select id="timeEnd" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className={selectClass}>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>
      )}

      {/* === More options — everything non-critical, hidden by default === */}
      <div>
        {!showOptional && (
          <button
            type="button"
            onClick={() => setShowOptional(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-faint hover:text-secondary transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            More options
          </button>
        )}

        {showOptional && (
          <div className="space-y-4 animate-slide-down">
            <div className="border-t border-hairline-soft pt-4">
              <p className="text-xs font-medium text-faint uppercase tracking-wider mb-3">More options</p>
            </div>

            {/* Event type preset */}
            <div>
              <label htmlFor="eventKind" className="block text-sm font-medium text-body mb-1.5">
                Event type
              </label>
              <select id="eventKind" value={eventKind} onChange={(e) => { const k = e.target.value; setEventKind(k); setModules(getModules({ event_kind: k })); }} className={selectClass}>
                {EVENT_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>{k.emoji} {k.label}</option>
                ))}
              </select>
              <p className="text-xs text-faint mt-1">Sets sensible defaults for what shows on the event — tweak anytime.</p>
            </div>

            {/* Your email */}
            <div>
              <label htmlFor="organizerEmail" className="block text-sm font-medium text-body mb-1.5">
                Your email <span className="text-faint font-normal">(optional)</span>
              </label>
              <input
                id="organizerEmail"
                type="email"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                className={inputClass}
                maxLength={254}
              />
              <p className="text-xs text-faint mt-1">
                {eventType === 'fixed'
                  ? "We'll email you when people RSVP."
                  : "We'll email you when enough people have responded so you can pick the time."}
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-body mb-1.5">
                Description <span className="text-faint font-normal">(optional)</span>
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={copy.form.description_placeholder}
                className={inputClass}
                maxLength={500}
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-body mb-1.5">
                Location <span className="text-faint font-normal">(optional)</span>
              </label>
              <LocationInput value={location} onChange={setLocation} inputClassName={inputClass} />
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-body mb-1.5">
                Timezone
              </label>
              <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
                {POPULAR_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
                {!POPULAR_TIMEZONES.find((t) => t.value === timezone) && (
                  <option value={timezone}>{getTimezoneLabel(timezone)}</option>
                )}
              </select>
            </div>

            {/* Max participants / capacity (both types) */}
            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-medium text-body mb-1.5">
                {eventType === 'fixed' ? 'Max guests' : 'Max participants'} <span className="text-faint font-normal">(optional)</span>
              </label>
              <input
                id="maxParticipants"
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="No limit"
                min={2}
                max={1000}
                className={inputClass}
              />
              {maxParticipants && parseInt(maxParticipants, 10) > 0 && (
                <p className="text-xs text-faint mt-1">
                  {eventType === 'fixed'
                    ? `Caps RSVPs at ${maxParticipants} — guests see a "spots filled" meter.`
                    : `New participants will be blocked after ${maxParticipants} have joined.`}
                </p>
              )}
            </div>

            {eventType === 'availability' && (
              <>
                {/* Meeting length — moot for all-day (the unit is a whole day) */}
                {!allDay && (
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-body mb-1.5">
                      {copy.form.duration_label}
                    </label>
                    <select id="duration" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={selectClass}>
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Minimum responses */}
                <div>
                  <label htmlFor="minResponses" className="block text-sm font-medium text-body mb-1.5">
                    Responses needed to pick a time{' '}
                    <span className="text-faint font-normal">(including yours, optional)</span>
                  </label>
                  {!minResponsesCustom ? (
                    <select
                      id="minResponses"
                      value={minResponses}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setMinResponsesCustom(true);
                          setMinResponses('');
                        } else {
                          setMinResponses(e.target.value);
                        }
                      }}
                      className={selectClass}
                    >
                      <option value="">No minimum</option>
                      {Array.from({ length: 14 }, (_, i) => i + 2).map((n) => (
                        <option key={n} value={n}>{n} people</option>
                      ))}
                      <option value="custom">Enter a number...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        id="minResponses"
                        type="text"
                        inputMode="numeric"
                        value={minResponses}
                        onChange={(e) => setMinResponses(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="e.g. 25 (minimum 2)"
                        className={inputClass}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setMinResponsesCustom(false); setMinResponses(''); }}
                        className="shrink-0 px-3 py-2 text-xs text-faint hover:text-secondary border border-hairline rounded-xl transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                  {minResponses && parseInt(minResponses, 10) >= 2 && (
                    <p className="text-xs text-faint mt-1">
                      The Pick a Time panel will wait until {minResponses} people have responded, including you.
                    </p>
                  )}
                </div>

                {/* Respond by */}
                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-body mb-1.5">
                    Respond by <span className="text-faint font-normal">(optional)</span>
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    value={responseDeadline}
                    min={minDeadline}
                    onChange={(e) => setResponseDeadline(e.target.value)}
                    className={selectClass}
                  />
                </div>

              </>
            )}

            {/* Additional Details */}
            <div>
              <label className="block text-sm font-medium text-body mb-1.5">
                Additional Details <span className="text-faint font-normal">(optional)</span>
              </label>
              <Suspense fallback={<div className="h-32 rounded-xl border border-strong bg-subtle animate-pulse" />}>
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="Add more context, agenda, directions, or anything guests should know…"
                  minHeight={100}
                />
              </Suspense>
            </div>

            {/* Event color */}
            <EventColorPicker value={color} onChange={setColor} />

            {/* Event photo + logo — cropped/optimized locally, uploaded after create */}
            <EventImagePicker
              kind="photo"
              preview={photoPreview}
              onPick={pickPhoto}
              onClear={clearPhoto}
              label="Event photo"
              hint="Wide hero image. Drag to crop; auto-optimized for fast loading."
              aspect="photo"
            />
            <EventImagePicker
              kind="logo"
              preview={logoPreview}
              onPick={pickLogo}
              onClear={clearLogo}
              label="Event logo"
              hint="Replaces the default lockup. Transparent PNG/SVG works best."
              aspect="logo"
            />

            {/* Guest list privacy */}
            <div className="border-t border-hairline-soft pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideGuestList}
                  onChange={(e) => setHideGuestList(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-strong accent-social-500 cursor-pointer shrink-0"
                />
                <span>
                  <span className="block text-sm font-medium text-body">Hide guest list</span>
                  <span className="block text-xs text-faint mt-0.5">Only you will see who responded — guests still see the totals, just not the names.</span>
                </span>
              </label>
            </div>

            {/* Show / hide modules */}
            <div className="border-t border-hairline-soft pt-4 space-y-3">
              <p className="text-xs font-semibold text-faint uppercase tracking-wider">Show / hide</p>
              {MODULE_TOGGLES.map(({ key, label, hint }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modules[key]}
                    onChange={(e) => setModules((m) => ({ ...m, [key]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-strong accent-social-500 cursor-pointer shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-medium text-body">{label}</span>
                    <span className="block text-xs text-faint mt-0.5">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm animate-fade-in">{error}</p>
      )}

      {/* Progress indicator + Submit */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < filledSteps
                  ? eventType === 'fixed' ? 'bg-teal-500' : 'bg-social-500'
                  : 'bg-fill'
              }`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !isReady}
          className={`
            relative w-full py-3.5 px-4 font-semibold rounded-2xl transition-all duration-300
            ${isReady && !loading
              ? eventType === 'fixed'
                ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-200/50 dark:shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-200/60 dark:hover:shadow-teal-500/40 active:scale-[0.97] cursor-pointer'
                : 'bg-social-500 text-white hover:bg-social-600 shadow-lg shadow-social-200/50 dark:shadow-social-500/30 hover:shadow-xl hover:shadow-social-200/60 dark:hover:shadow-social-500/40 active:scale-[0.97] cursor-pointer'
              : 'bg-fill text-faint cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              {copy.form.submitting}
            </span>
          ) : eventType === 'fixed' ? (
            'Create Event'
          ) : (
            copy.form.submit
          )}
        </button>
      </div>
    </form>
  );
}
