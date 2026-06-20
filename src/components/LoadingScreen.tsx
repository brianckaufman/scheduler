/**
 * Full-viewport loading state — a small brand-gradient grid that blooms
 * diagonally (a nod to the availability grid). Pure CSS (see globals.css), no
 * JS or data, so it paints instantly as a route-level Suspense fallback and the
 * user never sees a blank screen. Respects the pre-paint dark class via tokens.
 */
export default function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-subtle"
      role="status"
      aria-label="Loading"
    >
      <div className="loader-grid" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
