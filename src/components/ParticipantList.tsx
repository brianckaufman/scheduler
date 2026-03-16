'use client';

import type { Participant } from '@/types';

interface ParticipantListProps {
  participants: Participant[];
  currentParticipantId: string;
}

export default function ParticipantList({
  participants,
  currentParticipantId,
}: ParticipantListProps) {
  if (participants.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Participants ({participants.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <span
            key={p.id}
            className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm
              ${p.id === currentParticipantId
                ? 'bg-teal-100 text-teal-700 font-medium'
                : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            {p.name}
            {p.id === currentParticipantId && ' (you)'}
          </span>
        ))}
      </div>
    </div>
  );
}
