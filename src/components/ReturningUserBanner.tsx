'use client';

import { useEffect, useState, useCallback } from 'react';
import { useCreatedEvents, getUserDisplayName, type CreatedEvent } from '@/hooks/useCreatedEvents';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { firstName } from '@/lib/names';
import { format } from 'date-fns';

const DEFAULT_VISIBLE = 3;

/**
 * Shows returning users their past events on the homepage.
 * - Collapsible list (shows 3 by default, expandable)
 * - Inline delete with swipe-to-reveal pattern
 * - Personalized "Hi Brian, welcome back!" greeting
 * - Auto-prunes deleted events via lookup API
 */
export default function ReturningUserBanner() {
  const { events, loaded, removeEvent, updateEvent } = useCreatedEvents();
  const copy = useCopy();
  const [validatedEvents, setValidatedEvents] = useState<CreatedEvent[]>([]);
  const [validated, setValidated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setUserName(getUserDisplayName());
  }, []);

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
              removeEvent(event.slug);
            } else {
              results.push(event);
            }
          } catch {
            results.push(event);
          }
        })
      );

      if (!cancelled) {
        const slugOrder = events.map((e) => e.slug);
        results.sort((a, b) => slugOrder.indexOf(a.slug) - slugOrder.indexOf(b.slug));
        setValidatedEvents(results);
        setValidated(true);
      }
    }

    validateEvents();
    return () => { cancelled = true; };
  }, [loaded, events, removeEvent, updateEvent]);

  const handleDelete = useCallback((slug: string, eventName: string) => {
    if (!confirm(`Remove "${eventName}" from your list?`)) return;
    setDeletingSlug(slug);
    // Animate out, then remove
    setTimeout(() => {
      removeEvent(slug);
      setValidatedEvents((prev) => prev.filter((e) => e.slug !== slug));
      setDeletingSlug(null);
    }, 200);
  }, [removeEvent]);

  if (!loaded || !validated || validatedEvents.length === 0) return null;

  const returningCopy = copy.returning;
  const newEvent = returningCopy?.new_event || 'New event';

  function formatFinalizedDate(isoString: string): string {
    try {
      return format(new Date(isoString), 'EEE, MMM d · h:mm a');
    } catch {
      return '';
    }
  }

  const visibleEvents = expanded ? validatedEvents : validatedEvents.slice(0, DEFAULT_VISIBLE);
  const hasMore = validatedEvents.length > DEFAULT_VISIBLE;
  const hiddenCount = validatedEvents.length - DEFAULT_VISIBLE;

  // Personalized greeting
  const greeting = userName
    ? `Hi ${firstName(userName)}, welcome back`
    : (returningCopy?.welcome_back || 'Welcome back');

  return (
    <div className="animate-fade-in mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{greeting}</p>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {validatedEvents.length} event{validatedEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Event list */}
      <div className="px-2 pb-1">
        {visibleEvents.map((event) => (
          <div
            key={event.slug}
            className={`group flex items-center rounded-xl transition-all duration-200 ${
              deletingSlug === event.slug ? 'opacity-0 scale-95 h-0 overflow-hidden' : ''
            }`}
          >
            <a
              href={`/e/${event.slug}`}
              className="flex-1 flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors min-w-0"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                event.finalizedTime
                  ? 'bg-green-50 group-hover:bg-green-100'
                  : 'bg-teal-50 group-hover:bg-teal-100'
              }`}>
                {event.finalizedTime ? (
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-teal-700 transition-colors">
                  {event.name}
                </p>
                <p className={`text-[11px] truncate ${event.finalizedTime ? 'text-green-600' : 'text-gray-400'}`}>
                  {event.finalizedTime ? formatFinalizedDate(event.finalizedTime) : 'Awaiting responses'}
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            {/* Inline delete */}
            <button
              type="button"
              onClick={() => handleDelete(event.slug, event.name)}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 mr-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all duration-150 cursor-pointer"
              title="Remove from list"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Show more / less toggle */}
      {hasMore && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full text-center text-[11px] text-gray-400 hover:text-teal-600 py-1.5 transition-colors cursor-pointer"
          >
            {expanded ? 'Show less' : `Show ${hiddenCount} more event${hiddenCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Create new event link */}
      <div className="px-4 pb-3 pt-1 border-t border-gray-100">
        <a
          href="#create"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer py-1"
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
