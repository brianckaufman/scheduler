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
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';

interface MultiDayCalendarProps {
  selectedDates: Date[];
  onToggle: (date: Date) => void;
}

/**
 * Multi-select month calendar for proposing candidate days (Find-a-Time).
 * Extracted from the old EventForm's inline renderCalendar. Day cells are
 * generously sized (min-h-11) so they're unmistakably tappable.
 */
export default function MultiDayCalendar({ selectedDates, onToggle }: MultiDayCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

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
          aria-label="Previous month"
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          className="p-2.5 text-secondary bg-fill hover:bg-fill2 rounded-xl border border-hairline transition-colors cursor-pointer"
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
          aria-label="Next month"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2.5 text-secondary bg-fill hover:bg-fill2 rounded-xl border border-hairline transition-colors cursor-pointer"
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
          const selected = selectedDates.some((d) => isSameDay(d, day));
          const past = isBefore(day, today);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={past || !inMonth}
              onClick={() => onToggle(day)}
              className={`
                min-h-11 rounded-lg text-sm font-medium transition-all duration-150
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
}
