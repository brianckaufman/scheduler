'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts up (or down) to `value` with a quick scale "pop" on change. Purely
 * presentational — drop it in place of a number. Honors reduced-motion.
 */
export default function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [pop, setPop] = useState(false);
  const prev = useRef(value);
  const raf = useRef<number>(undefined);

  useEffect(() => {
    if (value === prev.current) return;
    const from = prev.current;
    const to = value;
    prev.current = to;

    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || Math.abs(to - from) > 200) {
      setDisplay(to);
      return;
    }

    setPop(true);
    const start = performance.now();
    const dur = 450;
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    const popOff = setTimeout(() => setPop(false), 280);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      clearTimeout(popOff);
    };
  }, [value]);

  return (
    <span
      className={`inline-block transition-transform duration-150 ${pop ? 'scale-125' : 'scale-100'} ${className ?? ''}`}
    >
      {display}
    </span>
  );
}
