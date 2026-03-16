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

// Max dots to show before switching to count mode
const MAX_DOTS = 6;

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
  const mouseDidDrag = useRef(false);
  // Suppress unused var warning — onRelease kept for API compatibility
  void onRelease;

  const totalAvailable = participantColors.length;
  const useCountMode = totalParticipants > MAX_DOTS || totalAvailable > MAX_DOTS;

  // Heat-map background: intensity based on fraction of participants available
  let bgClass = 'bg-gray-100';
  let extra = '';
  let heatStyle: React.CSSProperties | undefined;

  if (isAllMatch) {
    bgClass = 'bg-green-100';
    extra = 'ring-2 ring-green-300';
  } else if (totalAvailable > 0 && useCountMode) {
    // Heat-map: more people = deeper teal
    const fraction = totalAvailable / totalParticipants;
    const alpha = 0.12 + fraction * 0.45; // 12% to 57% opacity
    bgClass = '';
    heatStyle = { backgroundColor: `rgba(20, 184, 166, ${alpha})` }; // teal
    if (isMine) {
      extra = 'ring-2 ring-teal-300';
    }
  } else if (isMine && othersCount > 1) {
    bgClass = 'bg-teal-100';
  } else if (isMine) {
    bgClass = 'bg-teal-50';
  } else if (othersCount > 0) {
    bgClass = 'bg-gray-200';
  }

  // Desktop drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    mouseDidDrag.current = true;
    onDragStart(slotKey);
  }, [slotKey, onDragStart]);

  const handleClick = useCallback(() => {
    if (mouseDidDrag.current) {
      mouseDidDrag.current = false;
      return;
    }
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
      style={heatStyle}
    >
      {useCountMode ? (
        // Count mode: show number instead of dots for large groups
        totalAvailable > 0 && (
          <span className={`text-[11px] font-bold ${
            isAllMatch ? 'text-green-700' : isMine ? 'text-teal-700' : 'text-teal-600'
          }`}>
            {totalAvailable}
          </span>
        )
      ) : (
        // Dot mode: show individual colored dots for small groups
        participantColors.map((color, i) => (
          <span
            key={i}
            className="inline-block w-[10px] h-[10px] rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        ))
      )}
    </button>
  );
}

const TimeGridSlot = memo(TimeGridSlotInner);
export default TimeGridSlot;
