'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

export default function EventForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [responseDeadline, setResponseDeadline] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('17:00');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = startOfDay(new Date());
  const minDeadline = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const toggleDate = (date: Date) => {
    if (isBefore(date, today)) return;
    setSelectedDates((prev) => {
      const exists = prev.find((d) => isSameDay(d, date));
      if (exists) return prev.filter((d) => !isSameDay(d, date));
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
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
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            &larr;
          </button>
          <span className="font-medium text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            &rarr;
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
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
                  ${selected ? 'bg-teal-500 text-white shadow-sm shadow-teal-200' : ''}
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
    if (!name.trim() || selectedDates.length === 0) return;
    if (timeStart >= timeEnd) {
      setError('End time must be after start time');
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
          responseDeadline: responseDeadline
            ? new Date(responseDeadline + 'T23:59:59').toISOString()
            : null,
          dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
          timeStart,
          timeEnd,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      const { slug, organizerToken, organizerParticipantId, organizerName: returnedName } = await res.json();
      localStorage.setItem(`organizer_${slug}`, organizerToken);
      // Auto-save the organizer as a participant so they skip the name entry screen
      if (organizerParticipantId && returnedName) {
        localStorage.setItem(
          `participant_${slug}`,
          JSON.stringify({ id: organizerParticipantId, name: returnedName })
        );
      }
      router.push(`/e/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-900 placeholder-gray-400";
  const selectClass = "w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-900 bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          What&apos;s the event?
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team dinner, study group, game night..."
          className={inputClass}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Quick meeting to discuss Q2 goals..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="organizerName" className="block text-sm font-medium text-gray-700 mb-1">
            Your name (optional)
          </label>
          <input
            id="organizerName"
            type="text"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder="Who's organizing?"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location (optional)
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Zoom, office, cafe..."
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Which days could work?
        </label>
        {renderCalendar()}
        {selectedDates.length > 0 && (
          <p className="mt-2 text-sm text-teal-600">
            {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="timeStart" className="block text-sm font-medium text-gray-700 mb-1">
            Earliest time
          </label>
          <select id="timeStart" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className={selectClass}>
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{formatTimeLabel(t)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="timeEnd" className="block text-sm font-medium text-gray-700 mb-1">
            Latest time
          </label>
          <select id="timeEnd" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className={selectClass}>
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{formatTimeLabel(t)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            How long do you need?
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
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
            Respond by (optional)
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
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim() || selectedDates.length === 0}
        className="w-full py-3 px-4 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 hover:shadow-md hover:shadow-teal-200 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
