'use client';

import { format } from 'date-fns';
import type { Participant } from '@/types';

interface SlotTooltipProps {
  slotKey: string;
  overlapMap: Map<string, Set<string>>;
  participants: Participant[];
  onClose: () => void;
}

export default function SlotTooltip({ slotKey, overlapMap, participants, onClose }: SlotTooltipProps) {
  const participantIds = overlapMap.get(slotKey);
  const participantMap = new Map(participants.map((p) => [p.id, p.name]));
  const time = new Date(slotKey);

  const availableNames = participantIds
    ? Array.from(participantIds).map((id) => participantMap.get(id) || '?')
    : [];
  const unavailableNames = participants
    .filter((p) => !participantIds?.has(p.id))
    .map((p) => p.name);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-2xl shadow-lg p-4 mx-4 mb-4 sm:mb-0 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {format(time, 'EEE, MMM d')} at {format(time, 'h:mm a')}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>
        {availableNames.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-green-600 mb-1">Available ({availableNames.length})</p>
            <div className="flex flex-wrap gap-1">
              {availableNames.map((name) => (
                <span key={name} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{name}</span>
              ))}
            </div>
          </div>
        )}
        {unavailableNames.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Not available ({unavailableNames.length})</p>
            <div className="flex flex-wrap gap-1">
              {unavailableNames.map((name) => (
                <span key={name} className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">{name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
