import { Skeleton, FactRowSkeleton } from './Skeleton';

/**
 * Content skeleton for the event page — mirrors the real layout (action row +
 * detail card with fact rows) so the load feels instant and stable, not blank.
 */
export default function EventSkeleton() {
  return (
    <div className="min-h-screen bg-subtle">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Copy / Share / Save action row */}
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 flex-1" />
        </div>

        {/* Detail card */}
        <div className="bg-surface rounded-card shadow-card border border-hairline-soft p-4 space-y-4">
          <Skeleton className="h-6 w-2/3 rounded-chip" />
          <div className="space-y-3">
            <FactRowSkeleton />
            <FactRowSkeleton />
            <FactRowSkeleton />
          </div>
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-44 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
