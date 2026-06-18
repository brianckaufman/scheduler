import { Resend } from 'resend';
import type { createClient } from '@/lib/supabase/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface FinalizePayload {
  eventName: string;
  organizerName: string;
  timeStr: string;
  url: string; // absolute event URL
}

/**
 * Email every participant who provided an address that the organizer has picked
 * a final time. Best-effort: skips silently if Resend isn't configured, the
 * email column doesn't exist yet, or no one opted in. Mirrors sendPushNotifications.
 */
export async function sendFinalizeEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  payload: FinalizePayload
) {
  if (!resend || !EMAIL_FROM) {
    console.warn('Resend not configured (RESEND_API_KEY / EMAIL_FROM) — skipping finalize emails');
    return;
  }

  // Pull opted-in recipients. Wrapped so a missing `email` column (migration not
  // run yet) can't throw — it just yields no recipients.
  let recipients: { name: string; email: string }[] = [];
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('name, email')
      .eq('event_id', eventId)
      .not('email', 'is', null);
    if (error) {
      console.warn('Finalize emails: participant query failed (email column missing?):', error.message);
      return;
    }
    recipients = (data ?? []).filter((p): p is { name: string; email: string } => !!p.email);
  } catch (err) {
    console.warn('Finalize emails: skipped —', err);
    return;
  }

  if (recipients.length === 0) return;

  const subject = `${payload.eventName}: the time is set`;

  const results = await Promise.allSettled(
    recipients.map((p) =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: p.email,
        subject,
        text:
          `Hi ${p.name.split(' ')[0] || 'there'},\n\n` +
          `${payload.organizerName} picked the time for "${payload.eventName}":\n\n` +
          `  ${payload.timeStr}\n\n` +
          `Details: ${payload.url}\n\n` +
          `You're getting this because you added your email when marking availability for this event.`,
        html: finalizeHtml(p.name, payload),
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`Finalize emails: ${sent} sent, ${failed} failed for event ${eventId}`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

function finalizeHtml(name: string, p: FinalizePayload): string {
  const first = escapeHtml(name.split(' ')[0] || 'there');
  return `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0373F6,#6B34EE);padding:24px;text-align:center;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">The time is set 🎉</span>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 12px;color:#364153;font-size:15px;">Hi ${first},</p>
          <p style="margin:0 0 20px;color:#364153;font-size:15px;line-height:1.6;">
            ${escapeHtml(p.organizerName)} picked the time for
            <strong style="color:#101828;">${escapeHtml(p.eventName)}</strong>:
          </p>
          <div style="background:#F3F8FF;border:1px solid #C7DEFF;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
            <span style="color:#014598;font-size:18px;font-weight:600;">${escapeHtml(p.timeStr)}</span>
          </div>
          <a href="${escapeHtml(p.url)}" style="display:block;background:#0373F6;color:#ffffff;text-decoration:none;text-align:center;padding:13px;border-radius:999px;font-size:15px;font-weight:600;">View event</a>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;">
          <p style="margin:0;color:#99a1af;font-size:12px;line-height:1.5;">
            You're getting this because you added your email when marking availability for this event.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
