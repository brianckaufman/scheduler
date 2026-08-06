'use client';

import { memo, useRef, useCallback } from 'react';

export const PARTICIPANT_COLORS = [
  '#0373F6', // 1  brand blue
  '#03D2A3', // 2  brand emerald
  '#6B34EE', // 3  brand violet
  '#F59E0B', // 4  amber
  '#F43F5E', // 5  rose
  '#06B6D4', // 6  cyan
  '#84CC16', // 7  lime
  '#F97316', // 8  orange
  '#EC4899', // 9  pink
  '#6366F1', // 10 indigo
  '#D946EF', // 11 fuchsia
  '#EAB308', // 12 yellow
];

// Max dots to show before switching to count mode
const MAX_DOTS = 6;

// Cross-platform tap feedback:
// - Android/Chrome: use Vibration API
// - iOS/Safari: use a tiny AudioContext click (iOS blocks vibrate entirely)
let audioCtx: AudioContext | null = null;

function haptic() {
  // Try vibration first (works on Android)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(10); } catch { /* ignore */ }
  }

  // AudioContext micro-click for iOS and all platforms
  try {
    if (!audioCtx && typeof AudioContext !== 'undefined') {
      audioCtx = new AudioContext();
    }
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.value = 0.01; // barely audible
      osc.frequency.value = 1800;
      osc.type = 'sine';
      const now = audioCtx.currentTime;
      osc.start(now);
      osc.stop(now + 0.008); // 8ms micro-click
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
    }
  } catch {
    // AudioContext not available, degrade silently
  }
}

interface TimeGridSlotProps {
  slotKey: string;
  isMine: boolean;
  othersCount: number;
  totalParticipants: number;
  isAllMatch: boolean;
  isBest?: boolean;
  /** Enough people are free here to actually pick this time. Drives the loud styling. */
  meetsThreshold?: boolean;
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
  isBest,
  meetsThreshold = false,
  participantColors,
  onToggle,
  onDragStart,
  onDragEnter,
  onHold,
  onRelease,
}: TimeGridSlotProps) {
  const mouseDidDrag = useRef(false);
  void onRelease;

  const totalAvailable = participantColors.length;
  const useCountMode = totalParticipants > MAX_DOTS || totalAvailable > MAX_DOTS;

  // Slot background + ring are driven entirely by theme tokens (defined in
  // globals.css) so the grid flips correctly between light and dark.
  // Empty/others/mine = neutral surfaces, partial = brand emerald heat,
  // full match = brand green, best/selected = accent ring.
  const cellStyle: React.CSSProperties = { backgroundColor: 'var(--t-grid-empty)' };
  const ring = (color: string, width = 2) => {
    cellStyle.boxShadow = `inset 0 0 0 ${width}px ${color}`;
  };
  // Slots that don't yet clear the bar stay deliberately quiet — otherwise every
  // cell you tapped shouts as loudly as the ones that actually work for the group.
  const quietRing = (color: string) =>
    ring(`color-mix(in oklch, ${color} 38%, transparent)`, 1);

  const isPrime = isAllMatch || meetsThreshold;

  if (isAllMatch) {
    cellStyle.backgroundColor = 'var(--t-grid-full)';
    ring('var(--t-success-ring)');
  } else if (totalAvailable > 0 && useCountMode) {
    const fraction = totalAvailable / totalParticipants;
    const alpha = 0.16 + fraction * 0.5;
    cellStyle.backgroundColor = `rgba(var(--t-heat-rgb), ${alpha})`;
    if (meetsThreshold) ring('var(--t-success-ring)');
    else if (isMine) quietRing('var(--t-selected-ring)');
  } else if (meetsThreshold) {
    cellStyle.backgroundColor = 'var(--t-grid-full)';
    ring('var(--t-success-ring)');
  } else if (isMine) {
    cellStyle.backgroundColor = 'var(--t-grid-mine)';
    quietRing('var(--t-selected-ring)');
  } else if (othersCount > 0) {
    cellStyle.backgroundColor = 'var(--t-grid-others)';
  }

  // Best-available slot (most people free, but short of the bar): accent ring so
  // the strongest option still reads, without competing with the prime slots.
  if (isBest && !isPrime) {
    ring('var(--t-best-ring)');
  }

  // Dark-mode heat glow: brighter halo where more people overlap. Intensity is a
  // 0..1 var consumed by .slot-glow in globals.css (light mode ignores it).
  // Only slots that clear the bar (or the best near-miss) get one — a glow on
  // every tapped cell is what flattened the hierarchy.
  let glow = 0;
  if (isPrime) glow = 1;
  else if (isBest) glow = 0.6;
  if (glow > 0) {
    (cellStyle as Record<string, string | number>)['--glow'] = glow;
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
    haptic();
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
        ${isMine ? 'slot-selected' : ''} ${isPrime ? 'slot-match' : ''} ${glow > 0 ? 'slot-glow' : ''}
        active:scale-[0.93] touch-manipulation
      `}
      style={cellStyle}
    >
      {useCountMode ? (
        totalAvailable > 0 && (
          <span className="text-[11px] font-semibold tabular-nums text-heading/80">
            {totalAvailable}
          </span>
        )
      ) : (
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
