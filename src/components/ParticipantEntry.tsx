'use client';

import { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import type { Event } from '@/types';

interface ParticipantEntryProps {
  event: Event;
  onJoin: (id: string, name: string) => void;
}

export default function ParticipantEntry({ event, onJoin }: ParticipantEntryProps) {
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
      setError('Please enter a valid name.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
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
    ? `${event.duration_minutes / 60}h`
    : `${event.duration_minutes} min`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {step === 1 ? (
          /* ── Screen 1: Event details + name entry ── */
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Event header */}
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 px-6 py-5 text-white">
                <h1 className="text-xl font-bold leading-tight">{event.name}</h1>
                {event.description && (
                  <p className="text-teal-100 text-sm mt-1.5 leading-relaxed">{event.description}</p>
                )}
              </div>

              {/* Event details */}
              <div className="px-6 py-4 space-y-2.5 border-b border-gray-100">
                {event.organizer_name && (
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm text-gray-700">Organized by <span className="font-medium">{event.organizer_name}</span></span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">{event.location}</span>
                  </div>
                )}
                {event.duration_minutes && (
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">{durationLabel} needed</span>
                  </div>
                )}
                {event.response_deadline && (
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-sm ${deadlinePassed ? 'text-red-500' : 'text-gray-700'}`}>
                      {deadlinePassed
                        ? 'Response deadline has passed'
                        : `Respond by ${format(new Date(event.response_deadline), 'MMM d')} (${formatDistanceToNow(new Date(event.response_deadline), { addSuffix: true })})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Name entry */}
              <form onSubmit={handleNextStep} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                    maxLength={50}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full py-3 px-4 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-[10px] text-gray-300">
              <p>Powered by Scheduler — free &amp; no account needed</p>
            </div>
          </div>
        ) : (
          /* ── Screen 2: How it works + Pick Times ── */
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Hi {name.trim().split(' ')[0]}, here&apos;s how it works
                </h2>
                <p className="text-sm text-gray-500 mt-1">It only takes a moment</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Tap the times you&apos;re free</p>
                    <p className="text-xs text-gray-500 mt-0.5">Each cell is a 30-minute time slot. Tap to select, tap again to deselect.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Your picks save automatically</p>
                    <p className="text-xs text-gray-500 mt-0.5">No submit button needed — just tap and you&apos;re done.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{event.organizer_name?.split(' ')[0] || 'The organizer'} picks the final time</p>
                    <p className="text-xs text-gray-500 mt-0.5">Once everyone responds, the best time will be chosen.</p>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-3 px-4 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Getting ready...' : 'Pick Your Times'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
