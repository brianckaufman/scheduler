'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { useCreatedEvents } from '@/hooks/useCreatedEvents';
import { format } from 'date-fns';

const DEFAULT_VISIBLE = 3;

interface ReturningUserBannerProps {
  createdEvents: ReturnType<typeof useCreatedEvents>;
}

export default function ReturningUserBanner({ createdEvents }: ReturningUserBannerProps) {
  const { events, loaded, removeEvent, updateEvent } = createdEvents;
  const [expanded, setExpanded] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [menuSlug, setMenuSlug] = useState<string | null>(null);

  // Background validation: refresh finalized status, prune deleted events
  const hasValidated = useRef(false);
  useEffect(() => {
    if (!loaded || events.length === 0 || hasValidated.current) return;
    hasValidated.current = true;
    let cancelled = false;

    const eventsSnapshot = [...events];

    async function validateEvents() {
      await Promise.all(
        eventsSnapshot.map(async (event) => {
          try {
            const res = await fetch(`/api/events/lookup?slug=${encodeURIComponent(event.slug)}`);
            if (cancelled) return;
            if (res.ok) {
              const data = await res.json();
              if (data.finalized_time !== (event.finalizedTime || null)) {
                updateEvent(event.slug, {
                  finalizedTime: data.finalized_time || null,
                  name: data.name || event.name,
                });
              }
            } else if (res.status === 404) {
              removeEvent(event.slug);
            }
          } catch {
            // Network error — leave as-is
          }
        })
      );
    }

    validateEvents();
    return () => { cancelled = true; };
  }, [loaded, events, removeEvent, updateEvent]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuSlug) return;
    const handler = () => setMenuSlug(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuSlug]);

  const handleDelete = useCallback((slug: string, eventName: string) => {
    if (!confirm(`Delete "${eventName}" from your events?`)) return;
    setDeletingSlug(slug);
    setMenuSlug(null);
    setTimeout(() => {
      removeEvent(slug);
      setDeletingSlug(null);
    }, 200);
  }, [removeEvent]);

  const handlePin = useCallback((slug: string, pinned: boolean) => {
    updateEvent(slug, { pinned });
    setMenuSlug(null);
  }, [updateEvent]);

  const handleDuplicate = useCallback((event: typeof events[0]) => {
    setMenuSlug(null);
    // Navigate to homepage with pre-filled event data via query params
    const params = new URLSearchParams({ duplicate: event.name });
    window.location.href = `/?${params.toString()}`;
  }, []);

  if (!loaded) return null;

  if (events.length === 0) {
    return (
      <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-sm text-gray-400">No events yet. Create one to get started!</p>
      </div>
    );
  }

  function formatFinalizedDate(isoString: string): string {
    try {
      return format(new Date(isoString), 'EEE, MMM d · h:mm a');
    } catch {
      return '';
    }
  }

  const visibleEvents = expanded ? events : events.slice(0, DEFAULT_VISIBLE);
  const hasMore = events.length > DEFAULT_VISIBLE;
  const hiddenCount = events.length - DEFAULT_VISIBLE;

  return (
    <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
      {/* Auto-delete info */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          Finalized events auto-delete after 24 hours. Pin to keep.
        </p>
      </div>

      {/* Event list */}
      <div className="px-2 pt-1 pb-1">
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
                  {event.pinned && (
                    <svg className="w-3 h-3 text-amber-400 inline mr-1 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                  )}
                  {event.name}
                </p>
                <p className={`text-xs truncate ${event.finalizedTime ? 'text-green-600' : 'text-gray-400'}`}>
                  {event.finalizedTime ? formatFinalizedDate(event.finalizedTime) : 'Awaiting responses'}
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Action menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuSlug(menuSlug === event.slug ? null : event.slug);
                }}
                className="p-1.5 mr-1 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-100 transition-all duration-150 cursor-pointer"
                title="More actions"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {menuSlug === event.slug && (
                <div
                  className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handlePin(event.slug, !event.pinned)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-400" fill={event.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                    {event.pinned ? 'Unpin event' : 'Pin to keep'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(event)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicate event
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={() => handleDelete(event.slug, event.name)}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete event
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show more / less toggle */}
      {hasMore && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full text-center text-xs text-gray-400 hover:text-teal-600 py-1.5 transition-colors cursor-pointer"
          >
            {expanded ? 'Show less' : `Show ${hiddenCount} more event${hiddenCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

    </div>
  );
}
