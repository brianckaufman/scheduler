import { Resend } from 'resend';
import type { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/settings';
import { buildICS, googleCalendarUrl, type CalendarEvent } from '@/lib/calendar';
import type { EmailTemplate } from '@/types/settings';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function configured(): boolean {
  if (!resend || !EMAIL_FROM) {
    console.warn('Resend not configured (RESEND_API_KEY / EMAIL_FROM) — skipping email');
    return false;
  }
  return true;
}

/** Replace {{var}} placeholders. Unknown placeholders become empty strings. */
function interpolate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (k in vars ? vars[k] : ''));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

/** Turn a plain-text template body (with blank-line paragraphs) into HTML. */
function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px;color:#364153;font-size:15px;line-height:1.6;">${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function primaryButton(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#0373F6;color:#ffffff;text-decoration:none;text-align:center;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function calendarButtons(cal: CalendarEvent): string {
  const gcal = googleCalendarUrl(cal);
  return `<div style="margin-top:4px;">
    <a href="${escapeHtml(gcal)}" style="display:inline-block;background:#0373F6;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600;margin:0 8px 8px 0;">Add to Google Calendar</a>
    <span style="display:inline-block;color:#6a7282;font-size:13px;">…or open the attached .ics for Apple / Outlook.</span>
  </div>`;
}

interface Donation {
  url: string;
  label: string;
}

/** A subtle "support this app" row with the Buy Me a Coffee link. */
function donationRow(d: Donation): string {
  return `<tr><td style="padding:4px 28px 20px;text-align:center;">
    <div style="border-top:1px solid #f3f4f6;padding-top:18px;">
      <a href="${escapeHtml(d.url)}" style="display:inline-block;background:#FFDD00;color:#0F151B;text-decoration:none;padding:10px 20px;border-radius:999px;font-size:14px;font-weight:600;">${escapeHtml(d.label)}</a>
    </div>
  </td></tr>`;
}

/** Wrap inner content in the branded shell (gradient header + footer note). */
function shell(innerHtml: string, footerNote: string, donation?: Donation): string {
  return `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#0373F6,#6B34EE);padding:20px 24px;text-align:center;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;">WeGather</span>
      </td></tr>
      <tr><td style="padding:28px 28px 8px;">${innerHtml}</td></tr>
      ${donation ? donationRow(donation) : ''}
      <tr><td style="padding:8px 28px 28px;"><p style="margin:0;color:#99a1af;font-size:12px;line-height:1.5;">${escapeHtml(footerNote)}</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Read the Buy Me a Coffee donation link from settings, if configured. */
function donationFrom(settings: Awaited<ReturnType<typeof getSettings>>): Donation | undefined {
  const url = settings.monetization?.buymeacoffee_url?.trim();
  if (!url) return undefined;
  return { url, label: settings.monetization.donation_cta?.trim() || 'Buy me a coffee ☕' };
}

/** Append the donation link to a plain-text body. */
function donationText(d?: Donation): string {
  return d ? `\n\n— — —\n${d.label}: ${d.url}` : '';
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  ics?: string;
}

async function sendOne(args: SendArgs): Promise<boolean> {
  try {
    await resend!.emails.send({
      from: EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
      ...(args.ics
        ? { attachments: [{ filename: 'event.ics', content: Buffer.from(args.ics, 'utf-8') }] }
        : {}),
    });
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

// ── Participant-facing: time finalized / changed (with calendar) ──────────────

interface FinalizeArgs {
  variant: 'time_finalized' | 'time_changed';
  eventName: string;
  organizerName: string;
  timeStr: string;
  eventUrl: string;
  calendar: CalendarEvent;
}

export async function sendParticipantTimeEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  args: FinalizeArgs
) {
  if (!configured()) return;

  const settings = await getSettings();
  const tpl: EmailTemplate = settings.emailNotifications[args.variant];
  if (!tpl?.enabled) return;
  const donation = donationFrom(settings);

  let recipients: { name: string; email: string }[] = [];
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('name, email')
      .eq('event_id', eventId)
      .not('email', 'is', null);
    if (error) {
      console.warn(`${args.variant}: participant query failed (email column missing?):`, error.message);
      return;
    }
    recipients = (data ?? []).filter((p): p is { name: string; email: string } => !!p.email);
  } catch {
    return;
  }
  if (recipients.length === 0) return;

  const ics = buildICS(args.calendar);

  const results = await Promise.allSettled(
    recipients.map((p) => {
      const vars = {
        name: p.name.split(' ')[0] || 'there',
        eventName: args.eventName,
        organizerName: args.organizerName,
        time: args.timeStr,
        link: args.eventUrl,
      };
      const inner =
        bodyToHtml(interpolate(tpl.body, vars)) +
        calendarButtons(args.calendar) +
        `<div style="margin-top:16px;">${primaryButton('View event', args.eventUrl)}</div>`;
      return sendOne({
        to: p.email,
        subject: interpolate(tpl.subject, vars),
        html: shell(inner, 'You added your email when marking availability for this event.', donation),
        text: `${interpolate(tpl.body, vars)}\n\n${args.eventUrl}${donationText(donation)}`,
        ics,
      });
    })
  );
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  console.log(`${args.variant}: ${sent}/${recipients.length} sent for event ${eventId}`);
}

// ── Organizer-facing: min responses reached / new response ────────────────────

interface OrganizerArgs {
  kind: 'min_responses_reached' | 'new_response';
  organizerEmail: string;
  organizerName: string;
  eventName: string;
  eventUrl: string;
  count?: number;
  minResponses?: number;
  participantName?: string;
}

export async function sendOrganizerEmail(args: OrganizerArgs) {
  if (!configured()) return;
  if (!args.organizerEmail) return;

  const settings = await getSettings();
  const tpl: EmailTemplate = settings.emailNotifications[args.kind];
  if (!tpl?.enabled) return;
  const donation = donationFrom(settings);

  const vars: Record<string, string> = {
    organizerName: args.organizerName.split(' ')[0] || 'there',
    eventName: args.eventName,
    link: args.eventUrl,
    count: String(args.count ?? ''),
    minResponses: String(args.minResponses ?? ''),
    participantName: args.participantName ?? '',
  };
  const label = args.kind === 'min_responses_reached' ? 'Pick a time' : 'View responses';
  const inner =
    bodyToHtml(interpolate(tpl.body, vars)) +
    `<div style="margin-top:16px;">${primaryButton(label, args.eventUrl)}</div>`;

  const ok = await sendOne({
    to: args.organizerEmail,
    subject: interpolate(tpl.subject, vars),
    html: shell(inner, "You're the organizer of this event. You can turn these emails off in your event settings.", donation),
    text: `${interpolate(tpl.body, vars)}\n\n${args.eventUrl}${donationText(donation)}`,
  });
  console.log(`${args.kind}: ${ok ? 'sent' : 'failed'} to organizer for "${args.eventName}"`);
}
