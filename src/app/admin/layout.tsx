import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel | Scheduler',
  robots: { index: false, follow: false },
};

/**
 * Admin layout. Authentication is handled at the API level and by
 * the admin page component (redirects to /admin/login on 401).
 * This layout is intentionally thin so the login page can render
 * without an auth gate.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
