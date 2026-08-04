'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, isPast, addMinutes } from 'date-fns';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useMonetization } from '@/contexts/MonetizationContext';
import { useParticipantSession } from '@/hooks/useParticipantSession';
import { recordRespondedEvent } from '@/hooks/useRespondedEvents';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import ParticipantEntry from '@/components/ParticipantEntry';
import TimeGrid from '@/components/TimeGrid';
import AllDayGrid from '@/components/AllDayGrid';
import RSVPView from '@/components/RSVPView';
import ShareLink from '@/components/ShareLink';
import { FactRow } from '@/components/ui/FactRow';
import { IconChip } from '@/components/ui/IconChip';
import { CalendarIcon, ClockIcon, PinIcon, UserIcon } from '@/components/ui/icons';
import Countdown from '@/components/modules/Countdown';
import MapPreview from '@/components/modules/MapPreview';
import { getModules } from '@/lib/eventConfig';
import { parseLocation } from '@/lib/location';
import { formatEventDateRange } from '@/lib/dateRange';
import FinalizedBanner from '@/components/FinalizedBanner';
import GuestProgressBanner from '@/components/GuestProgressBanner';
import EditEventModal from '@/components/EditEventModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import SupportBanner from '@/components/SupportBanner';
import BookmarkPrompt from '@/components/BookmarkPrompt';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { useCreatedEvents } from '@/hooks/useCreatedEvents';
import Logo from '@/components/Logo';
import RichTextDisplay from '@/components/RichTextDisplay';
import LocationDisplay from '@/components/LocationDisplay';
import { formatDisplayName, firstName } from '@/lib/names';
import type { Event } from '@/types';

interface EventViewProps {
  event: Event;
  organizerAvatar?: string | null;
}

/** Return a short timezone label like "PST", "EST", "GMT+5" for a given IANA timezone. */
function getTzAbbr(isoDateStr: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date(isoDateStr))
      .find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch { return tz; }
}

export default function EventView({ event: initialEvent, organizerAvatar }: EventViewProps) {
  const copy = useCopy();
  const branding = useBranding();
  const monetization = useMonetization();
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { participantId, hasSession, saveSession, loaded } = useParticipantSession(event.slug, event.id);
  const { removeEvent, updateEvent } = useCreatedEvents();
  const { supported: pushSupported, isSubscribed, subscribe } = usePushNotifications(event.id, participantId);
  const [pushDismissed, setPushDismissed] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const [justJoined, setJustJoined] = useState(false);
  const [hasSelections, setHasSelections] = useState(false);
  // Guest progress: has a saved response / has unsaved changes (from grid or RSVP view)
  const [guestResponded, setGuestResponded] = useState(false);
  const [guestPending, setGuestPending] = useState(false);
  const [guestQuestionsPending, setGuestQuestionsPending] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [participantName, setParticipantName] = useState(() => {
    try {
      const stored = typeof window !== 'undefined'
        ? localStorage.getItem(`participant_${initialEvent.slug}`)
        : null;
      return stored ? (JSON.parse(stored).name as string) : '';
    } catch { return ''; }
  });

  const isFixed = event.event_type === 'fixed';

  const handleSlotCountChange = useCallback((count: number) => {
    if (count > 0) setHasSelections(true);
  }, []);

  const handleResponseStateChange = useCallback(
    (responded: boolean, pending: boolean, questionsPending = false) => {
      setGuestResponded(responded);
      setGuestPending(pending);
      setGuestQuestionsPending(questionsPending);
    },
    [],
  );

  useEffect(() => {
    const token = localStorage.getItem(`organizer_${event.slug}`);
    setIsOrganizer(!!token);
  }, [event.slug]);

  // Remember events the user responds to (someone else's events) so they appear
  // in the "Joined" tab on the homepage. We check the organizer token directly
  // (not the isOrganizer state, which resolves a render later) so we never log
  // the organizer's own event — those already show under their own events.
  useEffect(() => {
    if (!loaded || !hasSession || !participantId) return;
    if (localStorage.getItem(`organizer_${event.slug}`)) return;
    recordRespondedEvent(event.slug, event.name, {
      eventType: event.event_type as 'fixed' | 'availability',
      finalizedTime: event.finalized_time ?? null,
      allDay: event.all_day,
      finalizedEndDate: event.finalized_end_date ?? null,
    });
  }, [loaded, hasSession, participantId, event.slug, event.name, event.event_type, event.finalized_time, event.all_day, event.finalized_end_date]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('just_created') === 'true') {
        sessionStorage.removeItem('just_created');
        setShowCelebration(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setPushDismissed(localStorage.getItem(`push_dismissed_${event.id}`) === 'true');
  }, [event.id]);

  useEffect(() => {
    if (justJoined && gridRef.current) {
      const timer = setTimeout(() => {
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setJustJoined(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [justJoined]);

  const handleJoin = (id: string, name: string) => {
    saveSession(id, name);
    setParticipantName(name);
    setJustJoined(true);
  };

  const handleDeleteEvent = () => {
    localStorage.removeItem(`organizer_${event.slug}`);
    localStorage.removeItem(`participant_${event.slug}`);
    localStorage.removeItem(`push_dismissed_${event.id}`);
    removeEvent(event.slug);
    router.push('/');
  };

  const handleEnableNotifications = async () => {
    const success = await subscribe();
    if (!success) {
      localStorage.setItem(`push_dismissed_${event.id}`, 'true');
      setPushDismissed(true);
    }
  };

  const handleDismissNotifications = () => {
    localStorage.setItem(`push_dismissed_${event.id}`, 'true');
    setPushDismissed(true);
  };

  if (!loaded) {
    return <SkeletonLoader />;
  }

  if (!hasSession || !participantId) {
    return (
      <ParticipantEntry
        event={event}
        onJoin={handleJoin}
      />
    );
  }

  const deadlinePassed = event.response_deadline && isPast(new Date(event.response_deadline));
  // Only show push prompt for availability events (fixed events have no time to announce)
  const showPushPrompt = !isFixed && pushSupported && !isSubscribed && !pushDismissed && !event.finalized_time && !isOrganizer;

  const modules = getModules(event);
  // Per-event accent + independent icon-chip overrides, applied as inline vars.
  const rootStyle: Record<string, string> = {};
  if (event.color) rootStyle['--accent-base'] = event.color;
  if (event.icon_bg) rootStyle['--icon-bg'] = event.icon_bg;
  if (event.icon_fg) rootStyle['--icon-fg'] = event.icon_fg;

  return (
    <div
      className={`min-h-screen bg-subtle${event.color ? ' event-accent' : ''}`}
      style={Object.keys(rootStyle).length ? (rootStyle as React.CSSProperties) : undefined}
    >
      {/* Spotify-style ambient backdrop: the event photo stretched, heavily
          blurred and faded so the desktop margins take on the image's colors.
          Desktop only — on mobile the card already fills the width. */}
      {event.photo_url && (
        <div
          aria-hidden
          className="hidden md:block fixed inset-0 z-0 bg-cover bg-center blur-3xl scale-150 opacity-[0.18] dark:opacity-[0.28] pointer-events-none"
          style={{ backgroundImage: `url("${event.photo_url}")` }}
        />
      )}
      {showCelebration && <ConfettiCelebration onComplete={() => setShowCelebration(false)} />}
      <div className="max-w-lg mx-auto px-4 py-6 relative z-10">
        {/* Guest progress guide — always tells a guest where they are.
            Fixed events always carry finalized_time (it's their event date),
            so only availability events hide the banner once finalized. */}
        {!isOrganizer && (isFixed || !event.finalized_time) && (
          <GuestProgressBanner
            eventType={event.event_type}
            responded={guestResponded}
            pending={guestPending}
            questionsPending={guestQuestionsPending}
          />
        )}
        {/* Logo — per-event logo wins, else the global brand lockup */}
        {(event.logo_url || branding.logo_url) && (
          <div className="mb-4 flex justify-center">
            <a href="/" className="relative inline-flex items-center justify-center px-6 py-1.5">
              {/* Soft surface halo so the lockup reads on any ambient bg / brand color, both modes */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 65% 75% at 50% 50%, color-mix(in oklch, var(--color-surface) 42%, transparent) 0%, transparent 68%)' }}
              />
              {event.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.logo_url} alt="" style={{ height: branding.logo_height || 40 }} className="relative w-auto object-contain" />
              ) : (
                <span className="relative"><Logo height={branding.logo_height || 40} /></span>
              )}
            </a>
          </div>
        )}

        {/* Hero photo with overlapping brand date chip (fixed events) */}
        {event.photo_url && (
          <div className="mb-4 relative rounded-card overflow-hidden h-[194px] bg-fill shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.photo_url} alt="" className="w-full h-full object-cover" />
            {isFixed && event.finalized_time && (
              <div className="absolute left-3 bottom-3 rounded-chip bg-teal-500 text-white px-3 py-1.5 text-center shadow-float">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 leading-none">
                  {format(new Date(event.finalized_time), 'MMM')}
                </div>
                <div className="text-lg font-extrabold leading-none mt-0.5">
                  {format(new Date(event.finalized_time), 'd')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Finalized banner — availability events only, when a time has been picked */}
        {event.finalized_time && !isFixed && (
          <FinalizedBanner
            event={event}
            isOrganizer={isOrganizer}
            organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
            onUnfinalize={() => setEvent({ ...event, finalized_time: null })}
            participantName={participantName}
          />
        )}

        {/* Push notification opt-in (availability events only) */}
        {showPushPrompt && (
          <div className="animate-fade-in mb-4 bg-blue-50 dark:bg-[#0D223A] border border-teal-500 rounded-2xl p-4 flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-accent-fg">{interpolate(copy.notifications.title, { name: firstName(event.organizer_name || 'the organizer') })}</p>
              <p className="text-xs text-accent-fg mt-0.5">
                {interpolate(copy.notifications.description, { name: firstName(event.organizer_name || 'the organizer') })}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="px-3 py-1.5 bg-teal-500 text-white text-xs font-semibold rounded-full hover:bg-teal-600 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  {copy.notifications.enable}
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotifications}
                  className="px-3 py-1.5 text-accent-fg text-xs font-medium hover:text-accent-fg transition-colors cursor-pointer"
                >
                  {copy.notifications.dismiss}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookmark prompt — availability events only, organizer only, not yet finalized */}
        {!isFixed && isOrganizer && !event.finalized_time && <BookmarkPrompt eventSlug={event.slug} />}

        <div className="mb-4">
          <ShareLink event={event} isOrganizer={isOrganizer} />
        </div>

        {/* Main card: event details + grid/RSVP */}
        <div ref={gridRef} className="bg-surface rounded-2xl shadow-sm border border-hairline-soft p-4">
          {/* Event details header */}
          <div className="mb-4 pb-4 border-b border-hairline-soft">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <a
                  href="/"
                  className="shrink-0 p-1 -ml-1 text-faint2 hover:text-social-fg rounded-lg hover:bg-fill transition-colors cursor-pointer"
                  title="Back to home"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
                <h1 className="text-xl font-bold text-heading truncate">{event.name}</h1>
              </div>
              {isOrganizer && (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="shrink-0 p-1.5 text-faint hover:text-social-fg rounded-lg hover:bg-fill transition-colors cursor-pointer"
                  title="Edit event"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>

            {isFixed && event.finalized_time ? (
              <>
                {/* Fixed event: vertical fact rows */}
                <div className="space-y-3 mt-1">
                  <FactRow
                    icon={<CalendarIcon />}
                    value={<span className="font-semibold text-heading">{formatEventDateRange(event.finalized_time, event.finalized_end_date, !!event.all_day, { includeTime: false })}</span>}
                  />
                  {!event.all_day && (
                    <FactRow
                      icon={<ClockIcon />}
                      value={
                        <span className="font-semibold text-heading">
                          {format(new Date(event.finalized_time), 'h:mm a')}
                          {' – '}
                          {format(addMinutes(new Date(event.finalized_time), event.duration_minutes || 60), 'h:mm a')}
                          {event.timezone && (
                            <span className="ml-1.5 text-xs font-normal text-faint">
                              {getTzAbbr(event.finalized_time, event.timezone)}
                            </span>
                          )}
                        </span>
                      }
                    />
                  )}
                  {event.location && (
                    <FactRow
                      icon={<PinIcon />}
                      value={<LocationDisplay location={event.location ?? ''} textClassName="text-sm text-body" />}
                    />
                  )}
                  {modules.organizer && event.organizer_name && (
                    <div className="flex items-center gap-3">
                      {organizerAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={organizerAvatar} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-chip object-cover shrink-0 ring-1 ring-hairline" />
                      ) : (
                        <IconChip><UserIcon /></IconChip>
                      )}
                      <span className="text-sm text-secondary">
                        {interpolate(copy.event.organized_by, { name: formatDisplayName(event.organizer_name) })}
                      </span>
                    </div>
                  )}
                </div>
                {isFixed && event.finalized_time && modules.countdown && (
                  <div className="mt-4">
                    <Countdown target={event.finalized_time} />
                  </div>
                )}
                {/* Additional details — a single rich-text block for both event types */}
                {modules.description && event.body && <RichTextDisplay html={event.body} />}
              </>
            ) : (
              <>
                {/* Availability event: additional details, then vertical detail rows */}
                {modules.description && event.body && <RichTextDisplay html={event.body} />}
                <div className="space-y-3 mt-3">
                  {modules.organizer && event.organizer_name && (
                    <div className="flex items-center gap-3">
                      {organizerAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={organizerAvatar} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-chip object-cover shrink-0 ring-1 ring-hairline" />
                      ) : (
                        <IconChip><UserIcon /></IconChip>
                      )}
                      <span className="text-sm text-secondary">
                        {interpolate(copy.event.organized_by, { name: formatDisplayName(event.organizer_name) })}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <FactRow
                      icon={<PinIcon />}
                      value={<LocationDisplay location={event.location ?? ''} textClassName="text-sm text-body" />}
                    />
                  )}
                  {!event.all_day && event.duration_minutes && (
                    <FactRow
                      icon={<ClockIcon />}
                      value={
                        <span className="text-secondary">
                          {interpolate(copy.event.duration_needed, { duration: event.duration_minutes >= 60
                            ? `${event.duration_minutes / 60} hour${event.duration_minutes > 60 ? 's' : ''}`
                            : `${event.duration_minutes} min` })}
                        </span>
                      }
                    />
                  )}
                  {event.response_deadline && (
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-sm ${deadlinePassed ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                        {deadlinePassed
                          ? copy.event.deadline_passed
                          : interpolate(copy.event.respond_by, {
                              date: format(new Date(event.response_deadline), 'MMM d'),
                              relative: formatDistanceToNow(new Date(event.response_deadline), { addSuffix: true }),
                            })}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Map preview — physical-location events, when the module is on */}
          {modules.map && event.location && parseLocation(event.location).type !== 'virtual' && (
            <div className="mb-4">
              <MapPreview eventId={event.id} location={event.location} />
            </div>
          )}

          {/* Body: TimeGrid for availability, RSVPView for fixed */}
          {isFixed ? (
            <RSVPView
              event={event}
              participantId={participantId}
              participantName={participantName}
              isOrganizer={isOrganizer}
              organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
              onResponseStateChange={handleResponseStateChange}
            />
          ) : event.all_day ? (
            <AllDayGrid
              event={event}
              participantId={participantId}
              participantName={participantName}
              isOrganizer={isOrganizer}
              organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
              onFinalize={(startISO, endDate) => {
                setEvent({ ...event, finalized_time: startISO, finalized_end_date: endDate });
                updateEvent(event.slug, { finalizedTime: startISO });
                setShowCelebration(true);
              }}
              onMySlotCountChange={handleSlotCountChange}
              onResponseStateChange={handleResponseStateChange}
            />
          ) : (
            <TimeGrid
              event={event}
              participantId={participantId}
              participantName={participantName}
              isOrganizer={isOrganizer}
              organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
              onFinalize={(time) => {
                setEvent({ ...event, finalized_time: time });
                updateEvent(event.slug, { finalizedTime: time });
                setShowCelebration(true);
              }}
              onMySlotCountChange={handleSlotCountChange}
              onResponseStateChange={handleResponseStateChange}
            />
          )}
        </div>

        {/* Donation banner — shown after selections for availability events */}
        {!isFixed && hasSelections && !event.finalized_time && monetization.buymeacoffee_url && monetization.show_on_success && (
          <div className="mt-4">
            <SupportBanner
              url={monetization.buymeacoffee_url}
              cta={monetization.donation_cta}
              message={monetization.donation_message}
              variant="banner"
              sessionKey="support_nudge_avail"
            />
          </div>
        )}

        {/* Viral CTA footer — self-contained surface so the copy stays legible
            over any ambient backdrop, in light or dark mode. */}
        <div className="mt-8 mb-4">
          <div className="mx-auto max-w-sm rounded-card bg-surface/70 backdrop-blur-md border border-hairline shadow-sm px-6 py-6 text-center">
            <p className="text-sm text-secondary mb-3">{copy.event.cta_prompt}</p>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#101828] dark:bg-[#232B36] text-white text-sm font-medium rounded-full hover:opacity-90 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {copy.event.cta_button}
            </a>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditEventModal
          event={event}
          organizerToken={localStorage.getItem(`organizer_${event.slug}`) || ''}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => setEvent(updated)}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}
