'use client';

import { useEffect, useState } from 'react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({ message, onUndo, onDismiss, duration = 4000 }: UndoToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const handleUndo = () => {
    onUndo();
    setExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`${exiting ? 'animate-toast-out' : 'animate-toast-in'} flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-2xl shadow-lg shadow-gray-900/20 text-sm max-w-[90vw]`}
      >
        <span>{message}</span>
        <button
          type="button"
          onClick={handleUndo}
          className="shrink-0 px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
