import { PARTICIPANT_COLORS } from '../TimeGridSlot';
import { formatDisplayName, firstName } from '@/lib/names';

/**
 * Overlapping avatar stack + count summary. Anonymous participants render as
 * an initial on a stable color; an organizer photo (or any future avatars)
 * could slot in later. Privacy-aware: caller decides whether to pass names.
 */
export default function AttendeeStack({
  names,
  total,
  label,
  showNames = true,
}: {
  names: string[];
  total: number;
  label?: string;
  showNames?: boolean;
}) {
  if (total <= 0) return null;
  const shown = showNames ? names.slice(0, 5) : [];
  const extra = total - shown.length;

  return (
    <div className="flex items-center gap-2.5">
      {shown.length > 0 && (
        <div className="flex -space-x-2">
          {shown.map((n, i) => (
            <span
              key={i}
              title={formatDisplayName(n)}
              className="w-7 h-7 rounded-full ring-2 ring-surface flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length] }}
            >
              {(firstName(n)[0] || '?').toUpperCase()}
            </span>
          ))}
          {extra > 0 && (
            <span className="w-7 h-7 rounded-full ring-2 ring-surface bg-fill2 text-secondary flex items-center justify-center text-[10px] font-bold">
              +{extra}
            </span>
          )}
        </div>
      )}
      <span className="text-sm font-semibold text-body">{label ?? `${total} going`}</span>
    </div>
  );
}
