'use client';

import { memo } from 'react';

interface TimeGridSlotProps {
  slotKey: string;
  isMine: boolean;
  othersCount: number;
  totalParticipants: number;
  isAllMatch: boolean;
  onDragStart: (slotKey: string) => void;
  onDragEnter: (slotKey: string) => void;
  onHold?: (slotKey: string) => void;
  onRelease?: () => void;
}

function TimeGridSlotInner({
  slotKey,
  isMine,
  othersCount,
  totalParticipants,
  isAllMatch,
  onDragStart,
  onDragEnter,
  onHold,
  onRelease,
}: TimeGridSlotProps) {
  let bgClass = 'bg-gray-100';
  let extra = '';

  if (isMine && isAllMatch) {
    bgClass = 'bg-teal-400';
    extra = 'ring-2 ring-green-300';
  } else if (isMine) {
    bgClass = 'bg-teal-400';
  } else if (isAllMatch) {
    bgClass = 'bg-green-400';
    extra = 'ring-2 ring-green-300';
  } else if (othersCount > 0) {
    const intensity = Math.min(othersCount / Math.max(totalParticipants, 1), 1);
    bgClass = intensity > 0.5 ? 'bg-green-200' : 'bg-green-100';
  }

  return (
    <button
      type="button"
      data-slot={slotKey}
      onMouseDown={(e) => { e.preventDefault(); onDragStart(slotKey); }}
      onMouseEnter={() => onDragEnter(slotKey)}
      onTouchStart={() => { onDragStart(slotKey); onHold?.(slotKey); }}
      onTouchEnd={() => onRelease?.()}
      onContextMenu={(e) => { e.preventDefault(); onHold?.(slotKey); }}
      className={`
        slot-cell w-full min-h-[44px] rounded-lg transition-colors text-xs font-medium select-none
        ${bgClass} ${extra}
        active:scale-95 touch-manipulation
      `}
    />
  );
}

const TimeGridSlot = memo(TimeGridSlotInner);
export default TimeGridSlot;
