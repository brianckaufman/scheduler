'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { useParticipantSession } from '@/hooks/useParticipantSession';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import ParticipantEntry from '@/components/ParticipantEntry';
import TimeGrid from '@/components/TimeGrid';
import ShareLink from '@/components/ShareLink';
import FinalizedBanner from '@/components/FinalizedBanner';
import EditEventModal from '@/components/EditEventModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import type { Event } from '@/types';

interface EventViewProps {
  event: Event;
}

export default function EventView({ event: initialEvent }: EventViewProps) {
  const copy = useCopy();
  const [event, setEvent] = useState(initialEvent);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { participantId, hasSession, saveSession, loaded } = useParticipantSession(event.slug, event.id);
  const { supported: pushSupported, isSubscribed, subscribe } = usePushNotifications(event.id, participantId);
  const [pushDismissed, setPushDismissed] = useState(false);

  // Ref for auto-scrolling to the grid after onboarding
  const gridRef = useRef<HTMLDivElement>(null);
  const [justJoined, setJustJoined] = useState(false);

  // Slot count from TimeGrid (via callback, avoids duplicate real-time subscription)
  const [mySlotCount, setMySlotCount] = useState(0);

  // Show "all set" confirmation after first selection, with a brief delay
  const [showAllSet, setShowAllSet] = useState(false);
  const [prevSlotCount, setPrevSlotCount] = useState(0);

  const handleSlotCountChange = useCallback((count: number) => {
    setMySlotCount(count);
  }, []);

  useEffect(() => {
    if (mySlotCount > 0 && prevSlotCount === 0) {
      const timer = setTimeout(() => setShowAllSet(true), 800);
      return () => clearTimeout(timer);
    }
    if (mySlotCount === 0) {
      setShowAllSet(false);
    }
    setPrevSlotCount(mySlotCount);
  }, [mySlotCount, prevSlotCount]);

  useEffect(() => {
    const token = localStorage.getItem(`organizer_${event.slug}`);
    setIsOrganizer(!!token);
  }, [event.slug]);

  useEffect(() => {
    setPushDismissed(localStorage.getItem(`push_dismissed_${event.id}`) === 'true');
  }, [event.id]);

  // Auto-scroll to grid after joining
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
  const showPushPrompt = pushSupported && !isSubscribed && !pushDismissed && !event.finalized_time;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Event header */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
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
            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {event.organizer_name && (
              <span className="text-xs text-gray-400">{interpolate(copy.event.organized_by, { name: event.organizer_name })}</span>
            )}
            {event.location && (
              <span className="text-xs text-gray-400">{event.location}</span>
            )}
            {event.duration_minutes && (
              <span className="text-xs text-gray-400">
                {interpolate(copy.event.duration_needed, { duration: event.duration_minutes >= 60
                  ? `${event.duration_minutes / 60}h`
                  : `${event.duration_minutes}min` })}
              </span>
            )}
          </div>
          {event.response_deadline && (
            <p className={`text-xs mt-1 ${deadlinePassed ? 'text-red-400' : 'text-amber-500'}`}>
              {deadlinePassed
                ? copy.event.deadline_passed
                : interpolate(copy.event.respond_by, { date: format(new Date(event.response_deadline), 'MMM d'), relative: formatDistanceToNow(new Date(event.response_deadline), { addSuffix: true }) })}
            </p>
          )}
          {!event.finalized_time && (
            <p className="text-sm text-gray-500 mt-2">
              {copy.event.tap_instruction}
            </p>
          )}
        </div>

        {event.finalized_time && (
          <FinalizedBanner
            event={event}
            isOrganizer={isOrganizer}
            organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
            onUnfinalize={() => setEvent({ ...event, finalized_time: null })}
          />
        )}

        {/* Push notification opt-in */}
        {showPushPrompt && (
          <div className="animate-fade-in mb-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">{copy.notifications.title}</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {interpolate(copy.notifications.description, { name: event.organizer_name?.split(' ')[0] || 'the organizer' })}
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

        <div className="mb-4">
          <ShareLink eventName={event.name} isOrganizer={isOrganizer} />
        </div>

        {/* Grid section with scroll target ref */}
        <div ref={gridRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <TimeGrid
            event={event}
            participantId={participantId}
            isOrganizer={isOrganizer}
            organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
            onFinalize={(time) => setEvent({ ...event, finalized_time: time })}
            onMySlotCountChange={handleSlotCountChange}
          />
        </div>

        {/* "You're all set" confirmation */}
        {showAllSet && !event.finalized_time && (
          <div className="animate-fade-in-scale mt-4 bg-teal-50 border border-teal-100 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-teal-800">{copy.event.all_set_title}</p>
            </div>
            <p className="text-xs text-teal-600">
              {interpolate(copy.event.all_set_desc, { count: mySlotCount })}
            </p>
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
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      {showEditModal && (
        <EditEventModal
          event={event}
          organizerToken={localStorage.getItem(`organizer_${event.slug}`) || ''}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => setEvent(updated)}
        />
      )}
    </div>
  );
}
