'use client';

import { memo, useRef, useCallback } from 'react';

export const PARTICIPANT_COLORS = [
  '#14b8a6', // teal-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#a855f7', // purple-500
];

interface TimeGridSlotProps {
  slotKey: string;
  isMine: boolean;
  othersCount: number;
  totalParticipants: number;
  isAllMatch: boolean;
  participantColors: string[];
  onToggle: (slotKey: string) => void;
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
  participantColors,
  onToggle,
  onDragStart,
  onDragEnter,
  onHold,
  onRelease,
}: TimeGridSlotProps) {
  // Tracks whether mouseDown started a drag (desktop only)
  const mouseDidDrag = useRef(false);

  let bgClass = 'bg-gray-100';
  let extra = '';

  if (isAllMatch) {
    bgClass = 'bg-green-100';
    extra = 'ring-2 ring-green-300';
  } else if (isMine && othersCount > 1) {
    bgClass = 'bg-teal-100';
  } else if (isMine) {
    bgClass = 'bg-teal-50';
  } else if (othersCount > 0) {
    bgClass = 'bg-gray-200';
  }

  // Desktop: mouseDown starts drag mode (toggle + drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    mouseDidDrag.current = true;
    onDragStart(slotKey);
  }, [slotKey, onDragStart]);

  // onClick fires on BOTH desktop and mobile.
  // On desktop: mouseDown already handled it, so skip.
  // On mobile: this is the primary interaction — the browser's native
  // click event already filters out scrolls, so no custom threshold needed.
  const handleClick = useCallback(() => {
    if (mouseDidDrag.current) {
      mouseDidDrag.current = false;
      return; // Desktop mouseDown already toggled
    }
    // Mobile tap — simple, reliable
    onToggle(slotKey);
  }, [slotKey, onToggle]);

  return (
    <button
      type="button"
      data-slot={slotKey}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => onDragEnter(slotKey)}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onHold?.(slotKey); }}
      className={`
        slot-cell w-full min-h-[44px] rounded-lg text-xs font-medium select-none cursor-pointer
        flex items-center justify-center gap-[3px] flex-wrap p-1
        ${bgClass} ${extra}
        ${isMine ? 'slot-selected' : ''} ${isAllMatch ? 'slot-match' : ''}
        active:scale-[0.93] touch-manipulation
      `}
    >
      {participantColors.map((color, i) => (
        <span
          key={i}
          className="inline-block w-[10px] h-[10px] rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      ))}
    </button>
  );
}

const TimeGridSlot = memo(TimeGridSlotInner);
export default TimeGridSlot;
