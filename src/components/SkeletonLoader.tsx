'use client';

export default function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-48 rounded-lg" />
          <div className="skeleton-shimmer h-4 w-64 rounded-md" />
          <div className="flex gap-3 mt-2">
            <div className="skeleton-shimmer h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-3 w-20 rounded" />
          </div>
        </div>

        {/* Share buttons skeleton */}
        <div className="flex gap-2">
          <div className="skeleton-shimmer flex-1 h-10 rounded-xl" />
          <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
        </div>

        {/* Grid card skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          {/* Status bar */}
          <div className="skeleton-shimmer h-12 rounded-xl" />

          {/* Grid header */}
          <div className="grid grid-cols-4 gap-1">
            <div /> {/* Time label column */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="skeleton-shimmer h-3 w-8 rounded" />
                <div className="skeleton-shimmer h-3 w-6 rounded" />
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {Array.from({ length: 8 }, (_, row) => (
            <div key={row} className="grid grid-cols-4 gap-1">
              <div className="skeleton-shimmer h-3 w-14 rounded ml-auto" />
              {[1, 2, 3].map((col) => (
                <div key={col} className="skeleton-shimmer h-11 rounded-lg" />
              ))}
            </div>
          ))}

          {/* Participants skeleton */}
          <div className="space-y-2 pt-2">
            <div className="skeleton-shimmer h-4 w-28 rounded" />
            <div className="flex gap-2">
              <div className="skeleton-shimmer h-7 w-20 rounded-full" />
              <div className="skeleton-shimmer h-7 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
