'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useParticipantSession } from '@/hooks/useParticipantSession';
import ParticipantEntry from '@/components/ParticipantEntry';
import TimeGrid from '@/components/TimeGrid';
import ShareLink from '@/components/ShareLink';
import FinalizedBanner from '@/components/FinalizedBanner';
import type { Event } from '@/types';

interface EventViewProps {
  event: Event;
}

export default function EventView({ event: initialEvent }: EventViewProps) {
  const [event, setEvent] = useState(initialEvent);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const { participantId, hasSession, saveSession, loaded } = useParticipantSession(event.slug, event.id);

  useEffect(() => {
    const token = localStorage.getItem(`organizer_${event.slug}`);
    setIsOrganizer(!!token);
  }, [event.slug]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
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
      </div>
    </div>
  );
}
