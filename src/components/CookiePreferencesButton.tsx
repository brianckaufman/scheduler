'use client';

/** Reopens the cookie consent banner so the visitor can change their choice. */
export default function CookiePreferencesButton() {
  const open = () => {
    try {
      localStorage.removeItem('cookie_consent');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <button
      type="button"
      onClick={open}
      className="text-sm text-accent-fg font-medium hover:underline cursor-pointer"
    >
      Cookie preferences
    </button>
  );
}
