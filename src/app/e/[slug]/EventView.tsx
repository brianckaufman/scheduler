'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useMonetization } from '@/contexts/MonetizationContext';
import { useParticipantSession } from '@/hooks/useParticipantSession';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import ParticipantEntry from '@/components/ParticipantEntry';
import TimeGrid from '@/components/TimeGrid';
import RSVPView from '@/components/RSVPView';
import ShareLink from '@/components/ShareLink';
import FinalizedBanner from '@/components/FinalizedBanner';
import EditEventModal from '@/components/EditEventModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import SupportBanner from '@/components/SupportBanner';
import BookmarkPrompt from '@/components/BookmarkPrompt';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { useCreatedEvents } from '@/hooks/useCreatedEvents';
import { optimizedLogoUrl } from '@/lib/image';
import { formatDisplayName, firstName } from '@/lib/names';
import type { Event } from '@/types';

interface EventViewProps {
  event: Event;
}

export default function EventView({ event: initialEvent }: EventViewProps) {
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);

  const isFixed = event.event_type === 'fixed';

  const handleSlotCountChange = useCallback((count: number) => {
    if (count > 0) setHasSelections(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(`organizer_${event.slug}`);
    setIsOrganizer(!!token);
  }, [event.slug]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {showCelebration && <ConfettiCelebration onComplete={() => setShowCelebration(false)} />}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Logo */}
        {branding.logo_url && (
          <div className="mb-4 flex justify-center">
            <a href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optimizedLogoUrl(branding.logo_url, branding.logo_height || 40)}
                alt={branding.site_name}
                style={{ height: `${branding.logo_height || 40}px` }}
                className="w-auto object-contain"
              />
            </a>
          </div>
        )}

        {/* Finalized banner — always shown for fixed events, shown when picked for availability */}
        {event.finalized_time && (
          <FinalizedBanner
            event={event}
            isOrganizer={isOrganizer}
            organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
            onUnfinalize={() => setEvent({ ...event, finalized_time: null })}
          />
        )}

        {/* Push notification opt-in (availability events only) */}
        {showPushPrompt && (
          <div className="animate-fade-in mb-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">{interpolate(copy.notifications.title, { name: firstName(event.organizer_name || 'the organizer') })}</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {interpolate(copy.notifications.description, { name: firstName(event.organizer_name || 'the organizer') })}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full hover:bg-blue-700 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  {copy.notifications.enable}
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotifications}
                  className="px-3 py-1.5 text-blue-600 text-xs font-medium hover:text-blue-800 transition-colors cursor-pointer"
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
          <ShareLink eventName={event.name} isOrganizer={isOrganizer} />
        </div>

        {/* Main card: event details + grid/RSVP */}
        <div ref={gridRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          {/* Event details header */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <a
                  href="/"
                  className="shrink-0 p-1 -ml-1 text-gray-300 hover:text-teal-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Back to home"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
                <h1 className="text-xl font-bold text-gray-900 truncate">{event.name}</h1>
              </div>
              {isOrganizer && (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Edit event"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-gray-500 mt-1">{event.description}</p>
            )}
            {event.body && (
              <div className="mt-2">
                <p className={`text-sm text-gray-500 leading-relaxed whitespace-pre-wrap ${bodyExpanded ? '' : 'line-clamp-3'}`}>
                  {event.body}
                </p>
                {event.body.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setBodyExpanded((v) => !v)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-1 cursor-pointer"
                  >
                    {bodyExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {event.organizer_name && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {interpolate(copy.event.organized_by, { name: formatDisplayName(event.organizer_name) })}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </span>
              )}
              {event.duration_minutes && !isFixed && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {interpolate(copy.event.duration_needed, { duration: event.duration_minutes >= 60
                    ? `${event.duration_minutes / 60}h`
                    : `${event.duration_minutes}min` })}
                </span>
              )}
            </div>
            {event.response_deadline && !isFixed && (
              <p className={`text-xs mt-1 ${deadlinePassed ? 'text-red-400' : 'text-amber-500'}`}>
                {deadlinePassed
                  ? copy.event.deadline_passed
                  : interpolate(copy.event.respond_by, {
                      date: format(new Date(event.response_deadline), 'MMM d'),
                      relative: formatDistanceToNow(new Date(event.response_deadline), { addSuffix: true }),
                    })}
              </p>
            )}
            {/* Instruction line — different for each mode */}
            {!isFixed && !event.finalized_time && (
              <p className="text-sm text-gray-500 mt-2">
                {copy.event.tap_instruction}
              </p>
            )}
            {isFixed && !event.finalized_time && (
              <p className="text-sm text-gray-500 mt-2">
                {copy.rsvp?.heading ?? 'Can you make it?'}
              </p>
            )}
          </div>

          {/* Body: TimeGrid for availability, RSVPView for fixed */}
          {isFixed ? (
            <RSVPView
              event={event}
              participantId={participantId}
              isOrganizer={isOrganizer}
            />
          ) : (
            <TimeGrid
              event={event}
              participantId={participantId}
              isOrganizer={isOrganizer}
              organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
              onFinalize={(time) => {
                setEvent({ ...event, finalized_time: time });
                updateEvent(event.slug, { finalizedTime: time });
                setShowCelebration(true);
              }}
              onMySlotCountChange={handleSlotCountChange}
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
            />
          </div>
        )}

        {/* Viral CTA footer */}
        <div className="mt-8 mb-4 text-center">
          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400 mb-2">{copy.event.cta_prompt}</p>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {copy.event.cta_button}
            </a>
            <p className="text-[10px] text-gray-300 mt-2">{copy.event.cta_footer}</p>

            {monetization.buymeacoffee_url && monetization.show_on_event && (
              <div className="mt-3">
                <SupportBanner
                  url={monetization.buymeacoffee_url}
                  cta={monetization.donation_cta}
                  variant="inline"
                />
              </div>
            )}
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
