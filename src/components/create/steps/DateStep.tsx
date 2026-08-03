'use client';

import { format } from 'date-fns';
import ChoiceCard from '@/components/ui/ChoiceCard';
import StepHeader from '@/components/ui/StepHeader';
import DateRangeCalendar from '@/components/DateRangeCalendar';
import MultiDayCalendar from '@/components/create/MultiDayCalendar';
import type { EventDraft } from '@/hooks/useEventDraft';

interface DateStepProps {
  draft: EventDraft;
  stepNumber: number;
  totalSteps: number;
  accent: 'social' | 'teal';
}

/**
 * Step: when. Top pair of ChoiceCards picks "specific times" vs "whole days"
 * (replacing the old all-day checkbox); below it, the right calendar for the
 * event type.
 */
export default function DateStep({ draft, stepNumber, totalSteps, accent }: DateStepProps) {
  const isFixed = draft.eventType === 'fixed';

  return (
    <div>
      <StepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        accent={accent}
        title={isFixed ? 'When is it?' : 'Which days might work?'}
        subtitle={
          isFixed
            ? 'Tap the day of your event on the calendar.'
            : 'Tap every day that could work — your guests will say which ones suit them.'
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <ChoiceCard
          title="Specific times"
          description={isFixed ? 'It starts at a set time' : 'Compare times of day'}
          accent={accent}
          compact
          selected={!draft.allDay}
          onClick={() => draft.setAllDay(false)}
        />
        <ChoiceCard
          title="Whole days"
          description={isFixed ? 'An all-day event' : 'Just compare days'}
          accent={accent}
          compact
          selected={draft.allDay}
          onClick={() => { draft.setAllDay(true); if (isFixed) draft.setFixedEndDate(''); }}
        />
      </div>

      <div className="bg-surface rounded-2xl border border-hairline p-4">
        {isFixed ? (
          <>
            <DateRangeCalendar
              startDate={draft.fixedDate}
              endDate={draft.allDay ? draft.fixedEndDate : ''}
              onChange={(start, end) => {
                draft.setFixedDate(start);
                draft.setFixedEndDate(draft.allDay ? end : '');
              }}
              mode={draft.allDay ? 'range' : 'single'}
            />
            {draft.fixedDate && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-teal-600 mt-3">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {draft.allDay && draft.fixedEndDate && draft.fixedEndDate !== draft.fixedDate
                  ? `${format(new Date(draft.fixedDate + 'T12:00'), 'EEE, MMM d')} – ${format(new Date(draft.fixedEndDate + 'T12:00'), 'EEE, MMM d')}`
                  : format(new Date(draft.fixedDate + 'T12:00'), 'EEEE, MMMM d')}
                {draft.allDay && !draft.fixedEndDate && (
                  <span className="text-faint font-normal">— tap another day to make it a range</span>
                )}
              </p>
            )}
          </>
        ) : (
          <>
            <MultiDayCalendar selectedDates={draft.selectedDates} onToggle={draft.toggleDate} />
            {draft.selectedDates.length > 0 && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-social-600 mt-3">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {draft.selectedDates.length} {draft.selectedDates.length === 1 ? 'day' : 'days'} selected
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
