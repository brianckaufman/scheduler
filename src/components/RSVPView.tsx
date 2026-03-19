'use client';

import { useState, useCallback } from 'react';
import { useCopy } from '@/contexts/CopyContext';
import { useRealtimeParticipants } from '@/hooks/useRealtimeParticipants';
import { formatDisplayName } from '@/lib/names';
import type { Event, RsvpValue } from '@/types';

interface RSVPViewProps {
  event: Event;
  participantId: string;
  isOrganizer: boolean;
}

const RSVP_CONFIG = {
  yes: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
    activeClass: 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200',
    hoverClass: 'hover:border-green-400 hover:bg-green-50 hover:text-green-700',
    badgeClass: 'bg-green-100 text-green-700',
  },
  maybe: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    activeClass: 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200',
    hoverClass: 'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  no: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    activeClass: 'bg-red-400 text-white border-red-400 shadow-md shadow-red-200',
    hoverClass: 'hover:border-red-300 hover:bg-red-50 hover:text-red-500',
    badgeClass: 'bg-red-100 text-red-600',
  },
} as const;

export default function RSVPView({ event, participantId, isOrganizer }: RSVPViewProps) {
  const copy = useCopy();
  const rsvpCopy = copy.rsvp;
  const { participants } = useRealtimeParticipants(event.id);
  const [saving, setSaving] = useState(false);

  const me = participants.find((p) => p.id === participantId);
  const myRsvp = me?.rsvp ?? null;

  const handleRsvp = useCallback(async (value: RsvpValue) => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp: value, event_id: event.id }),
      });
      // Real-time subscription updates the UI; no need to manually refresh
    } finally {
      setSaving(false);
    }
  }, [participantId, event.id, saving]);

  // Group participants by RSVP status
  const going = participants.filter((p) => p.rsvp === 'yes');
  const maybe = participants.filter((p) => p.rsvp === 'maybe');
  const cant = participants.filter((p) => p.rsvp === 'no');
  const pending = participants.filter((p) => !p.rsvp);

  const totalResponded = going.length + maybe.length + cant.length;

  const rsvpOptions: { value: RsvpValue; label: string }[] = [
    { value: 'yes', label: rsvpCopy?.going ?? 'Going' },
    { value: 'maybe', label: rsvpCopy?.maybe ?? 'Maybe' },
    { value: 'no', label: rsvpCopy?.cant ?? "Can't make it" },
  ];

  return (
    <div className="space-y-5">
      {/* RSVP prompt */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">
          {myRsvp
            ? (rsvpCopy?.change ?? 'Change response')
            : (rsvpCopy?.heading ?? 'Can you make it?')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {rsvpOptions.map(({ value, label }) => {
            const cfg = RSVP_CONFIG[value];
            const isActive = myRsvp === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleRsvp(value)}
                disabled={saving}
                className={`
                  flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-sm font-semibold
                  transition-all duration-200 active:scale-95 cursor-pointer
                  ${isActive
                    ? cfg.activeClass
                    : `bg-white border-gray-200 text-gray-500 ${cfg.hoverClass}`
                  }
                  ${saving ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                {cfg.icon}
                <span className="text-xs font-semibold leading-tight text-center">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live summary counts */}
      {totalResponded > 0 && (
        <div className="flex items-center gap-3 text-xs font-medium animate-fade-in flex-wrap">
          {going.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {going.length} {rsvpCopy?.going_label ?? 'Going'}
            </span>
          )}
          {maybe.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {maybe.length} {rsvpCopy?.maybe_label ?? 'Maybe'}
            </span>
          )}
          {cant.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {cant.length} {rsvpCopy?.cant_label ?? "Can't make it"}
            </span>
          )}
        </div>
      )}

      {/* Attendee list — visible to everyone */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {rsvpCopy?.attendees_title ?? "Who's coming"}
        </p>

        {participants.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            {rsvpCopy?.no_responses ?? 'No responses yet'}
          </p>
        ) : (
          <div className="space-y-3">
            {[
              { list: going, label: rsvpCopy?.going_label ?? 'Going', cfg: RSVP_CONFIG.yes },
              { list: maybe, label: rsvpCopy?.maybe_label ?? 'Maybe', cfg: RSVP_CONFIG.maybe },
              { list: cant, label: rsvpCopy?.cant_label ?? "Can't make it", cfg: RSVP_CONFIG.no },
              { list: pending, label: rsvpCopy?.pending_label ?? 'Awaiting response', cfg: null },
            ].map(({ list, label, cfg }) =>
              list.length > 0 ? (
                <div key={label} className="animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {cfg ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
                        {label}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((p) => (
                      <span
                        key={p.id}
                        className={`
                          text-xs px-2.5 py-1 rounded-full font-medium border
                          ${p.id === participantId
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                          }
                        `}
                      >
                        {formatDisplayName(p.name)}
                        {p.id === participantId && ' (you)'}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
