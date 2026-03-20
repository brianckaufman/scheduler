'use client';

import { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { useBranding } from '@/contexts/BrandingContext';
import { optimizedLogoUrl } from '@/lib/image';
import { formatDisplayName, firstName } from '@/lib/names';
import type { Event } from '@/types';

interface ParticipantEntryProps {
  event: Event;
  onJoin: (id: string, name: string) => void;
}

export default function ParticipantEntry({ event, onJoin }: ParticipantEntryProps) {
  const copy = useCopy();
  const branding = useBranding();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFixed = event.event_type === 'fixed';
  const deadlinePassed = event.response_deadline && isPast(new Date(event.response_deadline));

  const accentFrom = isFixed ? 'from-blue-500' : 'from-teal-500';
  const accentTo = isFixed ? 'to-blue-600' : 'to-teal-600';
  const accentRing = isFixed ? 'focus:ring-blue-400' : 'focus:ring-teal-400';
  const accentBtn = isFixed
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-teal-500 hover:bg-teal-600';
  const accentNum = isFixed ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600';

  const handleJoin = async () => {
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError(copy.onboarding.error_name);
      setLoading(false);
      return;
    }

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

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep(2);
  };

  // Duration display helper
  const durationLabel = event.duration_minutes >= 60
    ? `${event.duration_minutes / 60} hour${event.duration_minutes > 60 ? 's' : ''}`
    : `${event.duration_minutes} min`;

  // Step 2 content varies by event type
  const step2Steps = isFixed
    ? [
        { title: copy.onboarding.rsvp_step1_title, desc: copy.onboarding.rsvp_step1_desc },
        { title: copy.onboarding.rsvp_step2_title, desc: copy.onboarding.rsvp_step2_desc },
        { title: copy.onboarding.rsvp_step3_title, desc: copy.onboarding.rsvp_step3_desc },
      ]
    : [
        { title: copy.onboarding.step1_title, desc: copy.onboarding.step1_desc },
        { title: copy.onboarding.step2_title, desc: copy.onboarding.step2_desc },
        {
          title: interpolate(copy.onboarding.step3_title, { organizer: firstName(event.organizer_name || 'The organizer') }),
          desc: copy.onboarding.step3_desc,
        },
      ];

  const step2Subtitle = isFixed
    ? copy.onboarding.rsvp_greeting_subtitle
    : copy.onboarding.greeting_subtitle;

  const step2SubmitLabel = isFixed
    ? copy.onboarding.rsvp_submit
    : copy.onboarding.submit;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Back to home */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-teal-600 transition-colors cursor-pointer mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </a>
        {step === 1 ? (
          /* Screen 1: Event details + name entry */
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Event header */}
              <div className={`bg-gradient-to-br ${accentFrom} ${accentTo} px-6 py-6 text-white`}>
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
                <h1 className="text-2xl font-bold leading-tight">{event.name}</h1>
                {event.description && (
                  <p className={`${isFixed ? 'text-blue-100' : 'text-teal-100'} text-base mt-2 leading-relaxed`}>
                    {event.description}
                  </p>
                )}
              </div>

              {/* Event details */}
              <div className="px-6 py-4 space-y-3 border-b border-gray-100">
                {event.organizer_name && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-base text-gray-700">{interpolate(copy.event.organized_by, { name: formatDisplayName(event.organizer_name!) })}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-base text-gray-700">{event.location}</span>
                  </div>
                )}
                {event.duration_minutes && !isFixed && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base text-gray-700">{interpolate(copy.event.duration_needed, { duration: durationLabel })}</span>
                  </div>
                )}
                {event.response_deadline && !isFixed && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-base ${deadlinePassed ? 'text-red-500' : 'text-gray-700'}`}>
                      {deadlinePassed
                        ? copy.event.deadline_passed
                        : interpolate(copy.event.respond_by, { date: format(new Date(event.response_deadline), 'MMM d'), relative: formatDistanceToNow(new Date(event.response_deadline), { addSuffix: true }) })}
                    </span>
                  </div>
                )}
              </div>

              {/* Name entry */}
              <form onSubmit={handleNextStep} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">{copy.onboarding.name_label}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={copy.onboarding.name_placeholder}
                    autoFocus
                    maxLength={50}
                    className={`w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 ${accentRing} focus:border-transparent text-base text-gray-900 placeholder-gray-400`}
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className={`w-full py-3.5 px-4 ${accentBtn} text-white text-base font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                >
                  {copy.onboarding.next}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-400">
              <p>{copy.onboarding.footer}</p>
            </div>
          </div>
        ) : (
          /* Screen 2: How it works */
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center mb-6">
                {/* Logo on step 2 */}
                {branding.logo_url ? (
                  <div className="flex justify-center mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={optimizedLogoUrl(branding.logo_url, branding.logo_height || 40)}
                      alt={branding.site_name}
                      style={{ height: `${branding.logo_height || 40}px` }}
                      className="w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className={`mx-auto w-14 h-14 rounded-full ${isFixed ? 'bg-blue-50' : 'bg-teal-50'} flex items-center justify-center mb-3`}>
                    {isFixed ? (
                      <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-7 h-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900">
                  {interpolate(copy.onboarding.greeting, { name: firstName(name.trim()) })}
                </h2>
                <p className="text-base text-gray-500 mt-1">{step2Subtitle}</p>
              </div>

              <div className="space-y-5 mb-7">
                {step2Steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3.5">
                    <div className={`shrink-0 w-8 h-8 rounded-full ${accentNum} flex items-center justify-center text-sm font-bold mt-0.5`}>{i + 1}</div>
                    <div>
                      <p className="text-base font-medium text-gray-800">{s.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleJoin}
                disabled={loading}
                className={`w-full py-3.5 px-4 ${accentBtn} text-white text-base font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
              >
                {loading ? copy.onboarding.submitting : step2SubmitLabel}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                &larr; {copy.onboarding.back}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
