'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useParticipantSession } from '@/hooks/useParticipantSession';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import ParticipantEntry from '@/components/ParticipantEntry';
import TimeGrid from '@/components/TimeGrid';
import ShareLink from '@/components/ShareLink';
import FinalizedBanner from '@/components/FinalizedBanner';
import EditEventModal from '@/components/EditEventModal';
import type { Event } from '@/types';

interface EventViewProps {
  event: Event;
}

export default function EventView({ event: initialEvent }: EventViewProps) {
  const [event, setEvent] = useState(initialEvent);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { participantId, hasSession, saveSession, loaded } = useParticipantSession(event.slug, event.id);
  const { supported: pushSupported, isSubscribed, subscribe } = usePushNotifications(event.id, participantId);
  const [pushDismissed, setPushDismissed] = useState(false);

  // Track user's slot count for "all set" feedback
  const { slots: allSlots } = useRealtimeSlots(event.id);
  const mySlotCount = useMemo(() => {
    if (!participantId) return 0;
    return allSlots.filter((s) => s.participant_id === participantId).length;
  }, [allSlots, participantId]);

  // Show "all set" confirmation after first selection, with a brief delay
  const [showAllSet, setShowAllSet] = useState(false);
  const [prevSlotCount, setPrevSlotCount] = useState(0);

  useEffect(() => {
    // Went from 0 → 1+ slots: user just started selecting
    if (mySlotCount > 0 && prevSlotCount === 0) {
      const timer = setTimeout(() => setShowAllSet(true), 800);
      return () => clearTimeout(timer);
    }
    // Went back to 0: hide the message
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!hasSession || !participantId) {
    return (
      <ParticipantEntry
        eventId={event.id}
        eventName={event.name}
        onJoin={(id, name) => saveSession(id, name)}
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
              <span className="text-xs text-gray-400">Organized by {event.organizer_name}</span>
            )}
            {event.location && (
              <span className="text-xs text-gray-400">{event.location}</span>
            )}
            {event.duration_minutes && (
              <span className="text-xs text-gray-400">
                {event.duration_minutes >= 60
                  ? `${event.duration_minutes / 60}h`
                  : `${event.duration_minutes}min`}
                {' '}needed
              </span>
            )}
          </div>
          {event.response_deadline && (
            <p className={`text-xs mt-1 ${deadlinePassed ? 'text-red-400' : 'text-amber-500'}`}>
              {deadlinePassed
                ? 'Response deadline has passed'
                : `Respond by ${format(new Date(event.response_deadline), 'MMM d')} (${formatDistanceToNow(new Date(event.response_deadline), { addSuffix: true })})`}
            </p>
          )}
          {!event.finalized_time && (
            <p className="text-sm text-gray-500 mt-2">
              Tap the times you&apos;re available
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
              <p className="text-sm font-medium text-blue-900">Get notified when a time is picked</p>
              <p className="text-xs text-blue-600 mt-0.5">
                We&apos;ll send you a notification when {event.organizer_name?.split(' ')[0] || 'the organizer'} finalizes the time.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full hover:bg-blue-700 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotifications}
                  className="px-3 py-1.5 text-blue-600 text-xs font-medium hover:text-blue-800 transition-colors cursor-pointer"
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <ShareLink eventName={event.name} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <TimeGrid
            event={event}
            participantId={participantId}
            isOrganizer={isOrganizer}
            organizerToken={localStorage.getItem(`organizer_${event.slug}`)}
            onFinalize={(time) => setEvent({ ...event, finalized_time: time })}
          />
        </div>

        {/* "You're all set" confirmation */}
        {showAllSet && !event.finalized_time && (
          <div className="animate-fade-in-scale mt-4 bg-teal-50 border border-teal-100 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-teal-800">You&apos;re all set!</p>
            </div>
            <p className="text-xs text-teal-600">
              {mySlotCount} time{mySlotCount !== 1 ? 's' : ''} selected. You can change your availability anytime by tapping the grid above.
            </p>
          </div>
        )}

        {/* Viral CTA footer */}
        <div className="mt-8 mb-4 text-center">
          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400 mb-2">Need to schedule your own event?</p>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create your own — it&apos;s free
            </a>
            <p className="text-[10px] text-gray-300 mt-2">No account needed</p>
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
