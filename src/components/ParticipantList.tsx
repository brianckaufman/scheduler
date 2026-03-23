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
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-1">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center">
            <span className={`text-sm ${p.id === currentParticipantId ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
              {p.name}
              {p.id === currentParticipantId && (
                <span className="ml-1 text-xs text-gray-400 font-normal">you</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
