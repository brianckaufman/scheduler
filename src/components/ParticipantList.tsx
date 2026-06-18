'use client';

import { formatDisplayName } from '@/lib/names';
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
    <div className="border-t border-hairline-soft pt-3 mt-1">
      <h3 className="text-xs font-semibold text-faint uppercase tracking-wider mb-2">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-1.5">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span className={`text-sm ${p.id === currentParticipantId ? 'font-semibold text-heading' : 'text-secondary'}`}>
              {formatDisplayName(p.name)}
              {p.id === currentParticipantId && (
                <span className="ml-1 text-xs text-faint font-normal">you</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
