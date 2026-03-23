'use client';

import { useState, useEffect, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  delay: number;
  shape: 'circle' | 'square' | 'strip';
}

const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#f59e0b', '#34d399', '#fb7185', '#38bdf8', '#fbbf24'];

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 30,
    y: 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.8,
    velocityX: (Math.random() - 0.5) * 100,
    velocityY: -(40 + Math.random() * 60),
    delay: Math.random() * 300,
    shape: (['circle', 'square', 'strip'] as const)[Math.floor(Math.random() * 3)],
  }));
}

/**
 * Confetti celebration that triggers once on mount.
 * Used when an event is successfully created.
 */
export default function ConfettiCelebration({ onComplete }: { onComplete?: () => void }) {
  const [particles] = useState(() => createParticles(40));
  const [visible, setVisible] = useState(true);

  const handleComplete = useCallback(() => {
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(handleComplete, 2000);
    return () => clearTimeout(timer);
  }, [handleComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}ms`,
            '--vx': `${p.velocityX}px`,
            '--vy': `${p.velocityY}px`,
            '--rot': `${p.rotation}deg`,
          } as React.CSSProperties}
        >
          {p.shape === 'circle' && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color, transform: `scale(${p.scale})` }}
            />
          )}
          {p.shape === 'square' && (
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: p.color, transform: `scale(${p.scale}) rotate(${p.rotation}deg)` }}
            />
          )}
          {p.shape === 'strip' && (
            <div
              className="w-1 h-3 rounded-full"
              style={{ backgroundColor: p.color, transform: `scale(${p.scale}) rotate(${p.rotation}deg)` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
