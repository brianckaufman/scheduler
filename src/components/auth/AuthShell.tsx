import Link from 'next/link';

/** Centered card used by all auth pages. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-subtle flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-sm text-faint hover:text-secondary mb-4 transition-colors">
          ← Back home
        </Link>
        <div className="bg-surface rounded-2xl shadow-sm border border-hairline-soft p-6">
          <h1 className="text-xl font-bold text-heading text-center">{title}</h1>
          {subtitle && <p className="text-sm text-muted text-center mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="text-center text-sm text-muted mt-4">{footer}</div>}
      </div>
    </div>
  );
}

export const authInputClass =
  'w-full px-4 py-3 rounded-xl border border-hairline bg-surface text-heading placeholder-faint focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent';
export const authButtonClass =
  'w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer';
export const authDivider = (
  <div className="flex items-center gap-3 my-5">
    <div className="h-px flex-1 bg-hairline" />
    <span className="text-xs text-faint">or</span>
    <div className="h-px flex-1 bg-hairline" />
  </div>
);
