/**
 * Loading skeleton primitive — prefer these over spinners for content areas
 * (§6 of the brief). Honors prefers-reduced-motion (the pulse stills).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-field bg-fill ${className}`} aria-hidden="true" />;
}

/** A ready-made fact-row skeleton (chip + two lines). */
export function FactRowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-9 h-9 rounded-chip" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3.5 w-40 max-w-full" />
      </div>
    </div>
  );
}
