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

const SCROLL_THRESHOLD = 30; // pixels of movement before we consider it a scroll (needs to be generous for iPhone tap jitter)

interface TimeGridSlotProps {
  slotKey: string;
  isMine: boolean;
  othersCount: number;
  totalParticipants: number;
  isAllMatch: boolean;
  participantColors: string[];
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
  onDragStart,
  onDragEnter,
  onHold,
  onRelease,
}: TimeGridSlotProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didScroll = useRef(false);

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    didScroll.current = false;
  }, []);

  const handleTouchMoveLocal = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || didScroll.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStart.current.x);
    const dy = Math.abs(touch.clientY - touchStart.current.y);
    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
      didScroll.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!didScroll.current && touchStart.current) {
      onDragStart(slotKey);
    }
    touchStart.current = null;
    didScroll.current = false;
    onRelease?.();
  }, [slotKey, onDragStart, onRelease]);

  return (
    <button
      type="button"
      data-slot={slotKey}
      onMouseDown={(e) => { e.preventDefault(); onDragStart(slotKey); }}
      onMouseEnter={() => onDragEnter(slotKey)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMoveLocal}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onHold?.(slotKey); }}
      className={`
        slot-cell w-full min-h-[44px] rounded-lg text-xs font-medium select-none
        flex items-center justify-center gap-[3px] flex-wrap p-1
        ${bgClass} ${extra}
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
