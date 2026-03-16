'use client';

import { useEffect, useState } from 'react';
import { useCreatedEvents, type CreatedEvent } from '@/hooks/useCreatedEvents';
import { useCopy } from '@/contexts/CopyContext';
import { format } from 'date-fns';

/**
 * Shows returning users their past events on the homepage.
 * Validates events still exist and prunes deleted ones.
 * Shows finalized date if a time has been picked.
 */
export default function ReturningUserBanner() {
  const { events, loaded, removeEvent, updateEvent } = useCreatedEvents();
  const copy = useCopy();
  const [validatedEvents, setValidatedEvents] = useState<CreatedEvent[]>([]);
  const [validated, setValidated] = useState(false);

  // Validate events still exist and refresh finalized status
  useEffect(() => {
    if (!loaded || events.length === 0) {
      setValidated(true);
      return;
    }

    let cancelled = false;

    async function validateEvents() {
      const results: CreatedEvent[] = [];

      await Promise.all(
        events.map(async (event) => {
          try {
            const res = await fetch(`/api/events/lookup?slug=${encodeURIComponent(event.slug)}`, {
              method: 'GET',
            });
            if (res.ok) {
              const data = await res.json();
              // Update finalized status if it changed
              if (data.finalized_time !== (event.finalizedTime || null)) {
                updateEvent(event.slug, {
                  finalizedTime: data.finalized_time || null,
                  name: data.name || event.name,
                });
                results.push({
                  ...event,
                  finalizedTime: data.finalized_time || null,
                  name: data.name || event.name,
                });
              } else {
                results.push(event);
              }
            } else if (res.status === 404) {
              // Event was deleted — remove from local list
              removeEvent(event.slug);
            } else {
              // Other error — keep it in the list, don't remove
              results.push(event);
            }
          } catch {
            // Network error — keep it, don't remove
            results.push(event);
          }
        })
      );

      if (!cancelled) {
        // Preserve original order
        const slugOrder = events.map((e) => e.slug);
        results.sort((a, b) => slugOrder.indexOf(a.slug) - slugOrder.indexOf(b.slug));
        setValidatedEvents(results);
        setValidated(true);
      }
    }

    validateEvents();
    return () => { cancelled = true; };
  }, [loaded, events, removeEvent, updateEvent]);

  if (!loaded || !validated || validatedEvents.length === 0) return null;

  const returningCopy = copy.returning;
  const welcomeBack = returningCopy?.welcome_back || 'Welcome back';
  const yourEvents = returningCopy?.your_events || 'Your events';
  const newEvent = returningCopy?.new_event || 'New event';

  function formatFinalizedDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return format(date, 'EEE, MMM d · h:mm a');
    } catch {
      return '';
    }
  }

  return (
    <div className="animate-fade-in mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-teal-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900">{welcomeBack}</p>
        </div>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">{yourEvents}</span>
      </div>

      <div className="space-y-1.5">
        {validatedEvents.slice(0, 5).map((event) => (
          <a
            key={event.slug}
            href={`/e/${event.slug}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              event.finalizedTime
                ? 'bg-green-50 group-hover:bg-green-100'
                : 'bg-teal-50 group-hover:bg-teal-100'
            }`}>
              {event.finalizedTime ? (
                <svg
                  className="w-3.5 h-3.5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5 text-teal-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate group-hover:text-teal-700 transition-colors">
                {event.name}
              </p>
              {event.finalizedTime && (
                <p className="text-xs text-green-600 truncate">
                  {formatFinalizedDate(event.finalizedTime)}
                </p>
              )}
              {!event.finalizedTime && (
                <p className="text-xs text-gray-400 truncate">
                  Awaiting responses
                </p>
              )}
            </div>
            <svg
              className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>

      {validatedEvents.length > 5 && (
        <p className="text-[10px] text-gray-400 text-center mt-2">
          +{validatedEvents.length - 5} more
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <a
          href="#create"
          onClick={(e) => {
            e.preventDefault();
            // Scroll to the form below
            document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {newEvent}
        </a>
      </div>
    </div>
  );
}
