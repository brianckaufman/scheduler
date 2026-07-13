'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { formatEventDateRange } from '@/lib/dateRange';
import type { useRespondedEvents, RsvpValue } from '@/hooks/useRespondedEvents';

const DEFAULT_VISIBLE = 3;

interface RespondedEventsBannerProps {
  respondedEvents: ReturnType<typeof useRespondedEvents>;
  /** Heading shown inside the panel (e.g. "Joined"). */
  title?: string;
}

const RSVP_BADGE: Record<RsvpValue, { label: string; cls: string }> = {
  yes: { label: 'Going', cls: 'bg-green-50 text-success-fg dark:bg-[#112D25]' },
  maybe: { label: 'Maybe', cls: 'bg-amber-50 text-amber-600 dark:bg-[#2E2410] dark:text-amber-300' },
  no: { label: "Can't", cls: 'bg-fill2 text-faint' },
};

export default function RespondedEventsBanner({ respondedEvents, title }: RespondedEventsBannerProps) {
  const { events, loaded, removeEvent, updateEvent } = respondedEvents;
  const [expanded, setExpanded] = useState(false);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [menuSlug, setMenuSlug] = useState<string | null>(null);

  // Background validation: refresh finalized status + name, prune deleted events.
  const hasValidated = useRef(false);
  useEffect(() => {
    if (!loaded || events.length === 0 || hasValidated.current) return;
    hasValidated.current = true;
    let cancelled = false;
    const snapshot = [...events];

    (async () => {
      await Promise.all(
        snapshot.map(async (event) => {
          try {
            const res = await fetch(`/api/events/lookup?slug=${encodeURIComponent(event.slug)}`);
            if (cancelled) return;
            if (res.ok) {
              const data = await res.json();
              if (
                data.finalized_time !== (event.finalizedTime || null) ||
                !!data.all_day !== !!event.allDay ||
                data.finalized_end_date !== (event.finalizedEndDate || null) ||
                (data.name && data.name !== event.name)
              ) {
                updateEvent(event.slug, {
                  finalizedTime: data.finalized_time || null,
                  allDay: !!data.all_day,
                  finalizedEndDate: data.finalized_end_date || null,
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
    })();

    return () => { cancelled = true; };
  }, [loaded, events, removeEvent, updateEvent]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuSlug) return;
    const handler = () => setMenuSlug(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuSlug]);

  const handleRemove = useCallback((slug: string) => {
    setRemovingSlug(slug);
    setMenuSlug(null);
    setTimeout(() => {
      removeEvent(slug);
      setRemovingSlug(null);
    }, 200);
  }, [removeEvent]);

  const handlePin = useCallback((slug: string, pinned: boolean) => {
    updateEvent(slug, { pinned });
    setMenuSlug(null);
  }, [updateEvent]);

  if (!loaded) return null;

  if (events.length === 0) {
    return (
      <div className="animate-fade-in bg-surface rounded-2xl shadow-sm border border-hairline-soft p-6 text-center">
        <p className="text-sm text-faint">
          Events you RSVP to or share your availability on will show up here.
        </p>
      </div>
    );
  }

  function subline(event: typeof events[number]): { text: string; tone: string } {
    if (event.finalizedTime) {
      try {
        return {
          text: formatEventDateRange(event.finalizedTime, event.finalizedEndDate, !!event.allDay, { withWeekday: false }),
          tone: 'text-success-fg',
        };
      } catch {
        return { text: 'Date set', tone: 'text-success-fg' };
      }
    }
    return {
      text: event.eventType === 'fixed' ? 'Date set' : 'Awaiting the final time',
      tone: 'text-faint',
    };
  }

  const visibleEvents = expanded ? events : events.slice(0, DEFAULT_VISIBLE);
  const hasMore = events.length > DEFAULT_VISIBLE;
  const hiddenCount = events.length - DEFAULT_VISIBLE;

  return (
    <div className="animate-fade-in bg-surface rounded-2xl shadow-sm border border-hairline-soft overflow-visible">
      <div className="px-4 pt-3 pb-1">
        {title && <h2 className="text-sm font-semibold text-heading mb-0.5">{title}</h2>}
        <p className="text-xs text-faint">
          Events you&apos;ve responded to. Removed a week after they end — pin to keep.
        </p>
      </div>

      <div className="px-2 pt-1 pb-1">
        {visibleEvents.map((event) => {
          const sub = subline(event);
          const badge = event.eventType === 'fixed' && event.rsvp ? RSVP_BADGE[event.rsvp] : null;
          return (
            <div
              key={event.slug}
              className={`group flex items-center rounded-xl transition-all duration-200 ${
                removingSlug === event.slug ? 'opacity-0 scale-95 h-0 overflow-hidden' : ''
              }`}
            >
              <a
                href={`/e/${event.slug}`}
                className="flex-1 flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-subtle transition-colors min-w-0"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                  event.finalizedTime
                    ? 'bg-green-50 dark:bg-[#112D25]'
                    : 'bg-social-50 dark:bg-[#1C1939]'
                }`}>
                  {event.finalizedTime ? (
                    <svg className="w-3.5 h-3.5 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-social-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading truncate group-hover:text-social-fg transition-colors">
                    {event.pinned && (
                      <svg className="w-3 h-3 text-amber-400 inline mr-1 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    )}
                    {event.name}
                  </p>
                  <p className={`text-xs truncate ${sub.tone}`}>{sub.text}</p>
                </div>
                {badge && (
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                )}
                <svg className="w-4 h-4 text-faint2 group-hover:text-social-fg transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuSlug(menuSlug === event.slug ? null : event.slug);
                  }}
                  className="p-1.5 mr-1 text-faint hover:text-social-fg rounded-lg hover:bg-fill transition-all duration-150 cursor-pointer"
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
                    className="absolute right-0 top-8 z-30 bg-surface border border-hairline rounded-xl shadow-lg py-1 w-44 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handlePin(event.slug, !event.pinned)}
                      className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-subtle flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400" fill={event.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                      {event.pinned ? 'Unpin event' : 'Pin to keep'}
                    </button>
                    <div className="border-t border-hairline-soft my-1" />
                    <button
                      type="button"
                      onClick={() => handleRemove(event.slug)}
                      className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-subtle flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove from list
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full text-center text-xs text-faint hover:text-social-fg py-1.5 transition-colors cursor-pointer"
          >
            {expanded ? 'Show less' : `Show ${hiddenCount} more event${hiddenCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
