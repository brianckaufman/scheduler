// Pre-launch gate for the notification system.
//
// Notifications aren't ready for the public yet, but they need to be
// exercisable against real events with real guests. So: OFF for everyone by
// default, always ON for events owned by an allowlisted admin. Flipping
// settings.app.enable_notifications opens it to everyone.
//
// Everything notification-related — the sends AND the email-collection UI that
// promises them — must go through this. Never ask someone for an address for a
// message that isn't coming.

import type { SiteSettings } from '@/types/settings';

/** Allowlisted admin emails (same env as admin-auth, without the auth lookup). */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || 'brian@tippingmedia.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminAddress(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}

/**
 * Should this event send notifications?
 *
 * Admin ownership is judged by the event's organizer_email. That's cheap (no
 * extra query on a hot path) and good enough for a pre-launch gate — the goal
 * is keeping the feature invisible to ordinary users, not defending a secret.
 */
export function notificationsEnabledForEvent(
  settings: SiteSettings,
  event: { organizer_email?: string | null } | null | undefined,
): boolean {
  if (settings.app.enable_notifications) return true;
  return isAdminAddress(event?.organizer_email);
}

/**
 * Should this signed-in user see notification UI where no event exists yet
 * (i.e. the creation wizard's success screen)?
 */
export function notificationsEnabledForUser(
  settings: SiteSettings,
  userEmail: string | null | undefined,
): boolean {
  if (settings.app.enable_notifications) return true;
  return isAdminAddress(userEmail);
}
