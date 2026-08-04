'use client';

import { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { useBranding } from '@/contexts/BrandingContext';
import { optimizedLogoUrl } from '@/lib/image';
import { formatDisplayName, firstName } from '@/lib/names';
import LocationDisplay from '@/components/LocationDisplay';
import HowItWorksModal from '@/components/HowItWorksModal';
import Button from '@/components/ui/Button';
import { formatEventDateRange } from '@/lib/dateRange';
import type { Event } from '@/types';

interface ParticipantEntryProps {
  event: Event;
  onJoin: (id: string, name: string) => void;
}

/**
 * The guest's front door: everything on ONE screen — what the event is, who's
 * asking, your name, and one big continue button. The old two-screen flow hid
 * the instructions on a one-time interstitial; they now live in a modal the
 * guest can reopen anytime (here and on the event page).
 */
export default function ParticipantEntry({ event, onJoin }: ParticipantEntryProps) {
  const copy = useCopy();
  const branding = useBranding();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHow, setShowHow] = useState(false);

  const isFixed = event.event_type === 'fixed';
  const deadlinePassed = event.response_deadline && isPast(new Date(event.response_deadline));

  // Fixed events use the brand accent (blue); availability events use brand social (violet)
  const headerGradient = isFixed ? 'from-teal-500 to-teal-700' : 'from-social-500 to-social-700';
  const accentRing = isFixed ? 'focus:ring-teal-500' : 'focus:ring-social-500';
  const accentSubtleText = isFixed ? 'text-teal-100' : 'text-social-100';
  const accent = isFixed ? 'teal' : 'social';

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, name: trimmed }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to join. Please try again.');
      setLoading(false);
      return;
    }

    onJoin(data.id, data.name);
  };

  const durationLabel = event.duration_minutes >= 60
    ? `${event.duration_minutes / 60} hour${event.duration_minutes > 60 ? 's' : ''}`
    : `${event.duration_minutes} min`;

  return (
    <div className="min-h-screen bg-subtle flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="bg-surface rounded-2xl shadow-sm border border-hairline-soft overflow-hidden">

          {/* Hero header */}
          <div className={`bg-gradient-to-br ${headerGradient} px-6 py-6 text-white`}>
            {branding.logo_url && (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizedLogoUrl(branding.logo_url, Math.round((branding.logo_height || 40) * 0.7))}
                  alt={branding.site_name}
                  style={{ height: `${Math.round((branding.logo_height || 40) * 0.7)}px` }}
                  className="w-auto object-contain brightness-0 invert"
                />
              </div>
            )}
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${accentSubtleText} opacity-80`}>
              {isFixed ? "You're invited" : "Help pick a time"}
            </p>
            <h1 className="text-2xl font-bold leading-tight">{event.name}</h1>
            {event.description && (
              <p className={`${accentSubtleText} text-sm mt-2 leading-relaxed`}>{event.description}</p>
            )}
          </div>

          {/* Event details */}
          <div className="px-6 py-4 space-y-2.5 border-b border-hairline-soft">
            {isFixed && event.finalized_time && (
              <>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-accent-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span className="text-base font-semibold text-heading">
                    {formatEventDateRange(event.finalized_time, event.finalized_end_date, !!event.all_day, { includeTime: false })}
                  </span>
                </div>
                {!event.all_day && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-accent-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base text-body">
                      {format(new Date(event.finalized_time), 'h:mm a')}
                    </span>
                  </div>
                )}
              </>
            )}

            {event.organizer_name && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-secondary">
                  {interpolate(copy.event.organized_by, { name: formatDisplayName(event.organizer_name) })}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <LocationDisplay location={event.location ?? ''} textClassName="text-sm text-body" />
              </div>
            )}
            {event.duration_minutes && !isFixed && !event.all_day && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-body">{interpolate(copy.event.duration_needed, { duration: durationLabel })}</span>
              </div>
            )}
            {event.response_deadline && !isFixed && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`text-sm ${deadlinePassed ? 'text-red-500' : 'text-body'}`}>
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

          {/* Name entry — the only thing asked before responding */}
          <form onSubmit={handleJoin} className="px-6 py-5 space-y-4">
            <div>
              <label htmlFor="guest-name" className="block text-sm font-medium text-secondary mb-1.5">
                First, what&apos;s your name?
              </label>
              <input
                id="guest-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.onboarding.name_placeholder}
                autoFocus
                maxLength={50}
                className={`w-full px-4 py-3.5 rounded-xl border border-hairline focus:outline-none focus:ring-2 ${accentRing} focus:border-transparent text-base text-heading placeholder-faint`}
                required
              />
              <p className="text-xs text-faint mt-1.5">
                So {firstName(event.organizer_name || 'the organizer')} knows who replied.
              </p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              type="submit"
              variant="primary"
              accent={accent}
              size="lg"
              fullWidth
              loading={loading}
              disabled={!name.trim()}
            >
              {loading
                ? copy.onboarding.submitting
                : isFixed ? 'Continue to RSVP' : 'Continue — pick your times'}
            </Button>
            <Button variant="outline" accent={accent} fullWidth onClick={() => setShowHow(true)}>
              How does this work?
            </Button>
          </form>
        </div>

        <div className="mt-5 text-center text-xs text-faint">
          <p>{copy.onboarding.footer}</p>
        </div>
      </div>

      {showHow && <HowItWorksModal event={event} onClose={() => setShowHow(false)} />}
    </div>
  );
}
