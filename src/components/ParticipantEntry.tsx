'use client';

import { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCopy, interpolate } from '@/contexts/CopyContext';
import { useBranding } from '@/contexts/BrandingContext';
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

  const deadlinePassed = event.response_deadline && isPast(new Date(event.response_deadline));

  const handleJoin = async () => {
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    // Sanitize: strip any HTML tags, limit length
    const safeName = name.trim().replace(/<[^>]*>/g, '').slice(0, 50);
    if (!safeName) {
      setError(copy.onboarding.error_name);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Check participant limit before joining
    if (event.max_participants) {
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);

      if (count !== null && count >= event.max_participants) {
        setError(`This event is full (max ${event.max_participants} participants).`);
        setLoading(false);
        return;
      }
    }

    const { data, error: err } = await supabase
      .from('participants')
      .insert({ event_id: event.id, name: safeName })
      .select()
      .single();

    if (err || !data) {
      setError('Failed to join. Please try again.');
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {step === 1 ? (
          /* Screen 1: Event details + name entry */
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Event header */}
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 px-6 py-6 text-white">
                {branding.logo_url && (
                  <div className="mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={branding.logo_url}
                      alt={branding.site_name}
                      className="h-7 w-auto object-contain brightness-0 invert"
                    />
                  </div>
                )}
                <h1 className="text-2xl font-bold leading-tight">{event.name}</h1>
                {event.description && (
                  <p className="text-teal-100 text-base mt-2 leading-relaxed">{event.description}</p>
                )}
              </div>

              {/* Event details */}
              <div className="px-6 py-4 space-y-3 border-b border-gray-100">
                {event.organizer_name && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-base text-gray-700">{interpolate(copy.event.organized_by, { name: event.organizer_name })}</span>
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
                {event.duration_minutes && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base text-gray-700">{interpolate(copy.event.duration_needed, { duration: durationLabel })}</span>
                  </div>
                )}
                {event.response_deadline && (
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
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-base text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full py-3.5 px-4 bg-teal-500 text-white text-base font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {copy.onboarding.next}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-[11px] text-gray-300">
              <p>{copy.onboarding.footer}</p>
            </div>
          </div>
        ) : (
          /* Screen 2: How it works + Pick Times */
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {interpolate(copy.onboarding.greeting, { name: name.trim().split(' ')[0] })}
                </h2>
                <p className="text-base text-gray-500 mt-1">{copy.onboarding.greeting_subtitle}</p>
              </div>

              <div className="space-y-5 mb-7">
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                  <div>
                    <p className="text-base font-medium text-gray-800">{copy.onboarding.step1_title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{copy.onboarding.step1_desc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                  <div>
                    <p className="text-base font-medium text-gray-800">{copy.onboarding.step2_title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{copy.onboarding.step2_desc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                  <div>
                    <p className="text-base font-medium text-gray-800">{interpolate(copy.onboarding.step3_title, { organizer: event.organizer_name?.split(' ')[0] || 'The organizer' })}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{copy.onboarding.step3_desc}</p>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-teal-500 text-white text-base font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? copy.onboarding.submitting : copy.onboarding.submit}
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
