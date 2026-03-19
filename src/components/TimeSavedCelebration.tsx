'use client';

import { useRef } from 'react';
import { useCopy, interpolate } from '@/contexts/CopyContext';

interface TimeSavedCelebrationProps {
  participantCount: number;
}

/**
 * Enhanced "all set" confirmation with a random time-saved quip.
 * Estimates the number of back-and-forth messages avoided and
 * picks a fun, rotating celebration message.
 */
export default function TimeSavedCelebration({
  participantCount,
}: TimeSavedCelebrationProps) {
  const copy = useCopy();
  const quips = copy.celebration?.time_saved_quips;

  // Pick a random quip once and lock it in so it doesn't change on re-render
  const quipIndex = useRef(
    quips && quips.length > 0 ? Math.floor(Math.random() * quips.length) : -1
  );

  // Estimate messages avoided:
  // In a group of N people, each pair exchanges ~2 messages to coordinate.
  // Formula: N * 2 (minimum back-and-forth per person)
  const textsAvoided = Math.max(participantCount * 2, 4);
  const secondsSaved = participantCount * 20; // ~20s per person reading/replying

  const quip =
    quips && quipIndex.current >= 0
      ? interpolate(quips[quipIndex.current], {
          texts: textsAvoided,
          seconds: secondsSaved,
          participants: participantCount,
        })
      : null;

  return (
    <div className="animate-celebrate mt-4 bg-teal-50 border border-teal-100 rounded-2xl p-5 text-center">
      <div className="flex items-center justify-center gap-2 mb-1.5">
        <svg
          className="w-5 h-5 text-teal-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm font-semibold text-teal-800">
          {copy.event.all_set_title}
        </p>
      </div>

      <p className="text-xs text-teal-600">
        {copy.event.all_set_desc}
      </p>

      {/* Time-saved quip */}
      {quip && (
        <p className="text-xs text-teal-500 mt-2 italic">
          {quip}
        </p>
      )}
    </div>
  );
}
