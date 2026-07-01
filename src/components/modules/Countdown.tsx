'use client';

import { useState, useEffect } from 'react';

/**
 * Live countdown to a target time — 4 cells (days/hrs/min/sec) on --icon-bg.
 * Renders nothing until mounted (avoids hydration mismatch) or once the
 * target has passed. Ticks every second so the seconds cell visibly moves.
 */
export default function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  const ms = new Date(target).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return null;

  const totalSec = Math.floor(ms / 1_000);
  const days = Math.floor(totalSec / (60 * 60 * 24));
  const hrs = Math.floor((totalSec % (60 * 60 * 24)) / (60 * 60));
  const min = Math.floor((totalSec % (60 * 60)) / 60);
  const sec = totalSec % 60;
  const cells: [number, string][] = [[days, 'days'], [hrs, 'hrs'], [min, 'min'], [sec, 'sec']];

  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-label="Time until the event">
      {cells.map(([value, label]) => (
        <div key={label} className="rounded-chip bg-icon-bg py-2.5 text-center">
          <div className="text-xl font-extrabold text-icon-fg tabular-nums leading-none">{value}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-icon-fg opacity-70 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
