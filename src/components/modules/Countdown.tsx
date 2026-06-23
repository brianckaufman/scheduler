'use client';

import { useState, useEffect } from 'react';

/**
 * Live countdown to a target time — 3 cells (days/hrs/min) on --icon-bg.
 * Renders nothing until mounted (avoids hydration mismatch) or once the
 * target has passed. Ticks every 20s — enough for minute granularity.
 */
export default function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  const ms = new Date(target).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return null;

  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hrs = Math.floor((totalMin % (60 * 24)) / 60);
  const min = totalMin % 60;
  const cells: [number, string][] = [[days, 'days'], [hrs, 'hrs'], [min, 'min']];

  return (
    <div className="grid grid-cols-3 gap-2" role="timer" aria-label="Time until the event">
      {cells.map(([value, label]) => (
        <div key={label} className="rounded-chip bg-icon-bg py-2.5 text-center">
          <div className="text-xl font-extrabold text-icon-fg tabular-nums leading-none">{value}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-icon-fg opacity-70 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
