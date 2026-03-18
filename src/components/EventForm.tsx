'use client';

import { useState, useEffect, useRef } from 'react';
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
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

export default function EventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = useCopy();
  const { addEvent } = useCreatedEvents();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [responseDeadline, setResponseDeadline] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('17:00');
  const [timezone, setTimezone] = useState(detectUserTimezone);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  // Progress tracking
  const hasName = name.trim().length > 0;
  const hasOrganizer = organizerName.trim().length > 0;
  const hasDates = selectedDates.length > 0;
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

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900 text-sm">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400 font-medium mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
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
                  ${past ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer active:scale-90'}
                  ${selected ? 'bg-teal-500 text-white shadow-sm shadow-teal-200 animate-pop' : ''}
                  ${!selected && !past && inMonth ? 'text-gray-700 hover:bg-gray-100' : ''}
                  ${isToday(day) && !selected ? 'ring-1 ring-teal-400' : ''}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organizerName.trim() || selectedDates.length === 0) return;
    if (timeStart >= timeEnd) {
      setError(copy.form.error_time);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          organizerName: organizerName.trim() || null,
          location: location.trim() || null,
          durationMinutes,
          maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
          responseDeadline: responseDeadline
            ? new Date(responseDeadline + 'T23:59:59').toISOString()
            : null,
          dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
          timeStart,
          timeEnd,
          timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      const { slug, organizerToken, organizerParticipantId, organizerName: returnedName } = await res.json();
      localStorage.setItem(`organizer_${slug}`, organizerToken);
      if (organizerParticipantId && returnedName) {
        localStorage.setItem(
          `participant_${slug}`,
          JSON.stringify({ id: organizerParticipantId, name: returnedName })
        );
      }
      // Flag that this is a fresh creation for celebration animation
      sessionStorage.setItem('just_created', 'true');
      addEvent(slug, name.trim());
      saveUserDisplayName(organizerName.trim());
      router.push(`/e/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-900 placeholder-gray-400 transition-shadow duration-200";
  const selectClass = "w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-900 bg-white transition-shadow duration-200";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* === Section 1: Event Details === */}
      <div className="space-y-4 stagger-children">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label htmlFor="organizerName" className="block text-sm font-medium text-gray-700 mb-1.5">
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

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
            {copy.form.description_label}
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

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1.5">
            {copy.form.location_label}
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={copy.form.location_placeholder}
            className={inputClass}
            maxLength={100}
          />
        </div>
      </div>

      {/* Subtle divider */}
      <div className="border-t border-gray-100" />

      {/* === Section 2: Scheduling === */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {copy.form.dates_label}
          </label>
          {renderCalendar()}
          {selectedDates.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 animate-fade-in">
              <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-teal-600 font-medium">
                {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="timeStart" className="block text-sm font-medium text-gray-700 mb-1.5">
              {copy.form.earliest_label}
            </label>
            <select id="timeStart" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className={selectClass}>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{formatTimeLabel(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timeEnd" className="block text-sm font-medium text-gray-700 mb-1.5">
              {copy.form.latest_label}
            </label>
            <select id="timeEnd" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className={selectClass}>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{formatTimeLabel(t)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={selectClass}
          >
            {POPULAR_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
            {!POPULAR_TIMEZONES.find((t) => t.value === timezone) && (
              <option value={timezone}>{getTimezoneLabel(timezone)}</option>
            )}
          </select>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1.5">
            {copy.form.duration_label}
          </label>
          <select
            id="duration"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className={selectClass}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* === Optional section (collapsed by default) === */}
      <div>
        {!showOptional && (
          <button
            type="button"
            onClick={() => setShowOptional(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            More options
          </button>
        )}

        {showOptional && (
          <div className="space-y-4 animate-slide-down">
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Additional options</p>
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1.5">
                {copy.form.deadline_label}
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

            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-1.5">
                Max participants <span className="text-gray-400 font-normal">(optional)</span>
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
                <p className="text-xs text-gray-400 mt-1">
                  New participants will be blocked after {maxParticipants} have joined
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm animate-fade-in">{error}</p>
      )}

      {/* Progress indicator + Submit */}
      <div className="space-y-3 pt-1">
        {/* Mini progress */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < filledSteps ? 'bg-teal-400' : 'bg-gray-100'
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
              ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-200/50 hover:shadow-xl hover:shadow-teal-200/60 active:scale-[0.97] cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
          ) : (
            copy.form.submit
          )}
        </button>
      </div>
    </form>
  );
}
