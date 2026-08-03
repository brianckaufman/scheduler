'use client';

import { useState } from 'react';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';

interface DateRangeCalendarProps {
  /** 'yyyy-MM-dd', or '' if nothing picked yet. */
  startDate: string;
  /** 'yyyy-MM-dd', or '' for a single-day range (same as startDate). */
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  /** Earliest selectable day. Defaults to today. */
  minDate?: Date;
  /** 'single': every tap just moves the one selected day (endDate stays ''). Default 'range'. */
  mode?: 'single' | 'range';
}

/**
 * Two/three-tap date-range picker: tap a start day, tap an end day (tapping
 * the same day again collapses to a single-day range), tap again after a
 * full range is set to start over. Shared by EventForm (all-day RSVP
 * creation) and EditEventModal (rescheduling an all-day RSVP).
 */
export default function DateRangeCalendar({ startDate, endDate, onChange, minDate, mode = 'range' }: DateRangeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => (startDate ? new Date(startDate) : new Date()));
  const today = minDate ?? startOfDay(new Date());
  const rangeEnd = endDate || startDate;

  const handleDayClick = (day: Date) => {
    if (isBefore(day, today)) return;
    const dayStr = format(day, 'yyyy-MM-dd');
    if (mode === 'single') {
      onChange(dayStr, '');
    } else if (!startDate) {
      onChange(dayStr, '');
    } else if (!endDate) {
      if (dayStr < startDate) onChange(dayStr, '');
      else onChange(startDate, dayStr);
    } else {
      onChange(dayStr, '');
    }
  };

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
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-faint font-medium mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const past = isBefore(day, today);
          const dayStr = format(day, 'yyyy-MM-dd');
          const isStart = !!startDate && dayStr === startDate;
          const isEnd = !!rangeEnd && dayStr === rangeEnd;
          const inRange = !!startDate && dayStr >= startDate && dayStr <= rangeEnd;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={past || !inMonth}
              onClick={() => handleDayClick(day)}
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
}
