/**
 * Segmented RSVP breakdown — going / maybe / can't proportions + a legend.
 * Aggregate only (privacy-safe). Status colors stay fixed regardless of brand.
 */
export default function RsvpProgress({
  going,
  maybe,
  cant,
}: {
  going: number;
  maybe: number;
  cant: number;
}) {
  const total = going + maybe + cant;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-fill" role="img" aria-label={`${going} going, ${maybe} maybe, ${cant} can't`}>
        {going > 0 && <div style={{ width: pct(going) }} className="bg-green-500" />}
        {maybe > 0 && <div style={{ width: pct(maybe) }} className="bg-amber-400" />}
        {cant > 0 && <div style={{ width: pct(cant) }} className="bg-fill2" />}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-secondary">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /><b className="text-heading tabular-nums">{going}</b> going</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /><b className="text-heading tabular-nums">{maybe}</b> maybe</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-fill2" /><b className="text-heading tabular-nums">{cant}</b> can&apos;t</span>
      </div>
    </div>
  );
}
