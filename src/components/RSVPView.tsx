'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCopy } from '@/contexts/CopyContext';
import { useMonetization } from '@/contexts/MonetizationContext';
import SupportBanner from './SupportBanner';
import ConfettiCelebration from './ConfettiCelebration';
import AnimatedNumber from './AnimatedNumber';
import { IconChip } from './ui/IconChip';
import { UsersIcon, PlusIcon, MinusIcon } from './ui/icons';
import AttendeeStack from './modules/AttendeeStack';
import RsvpProgress from './modules/RsvpProgress';
import GuestQuestions from './GuestQuestions';
import GuestDoneCard from './GuestDoneCard';
import HowItWorksModal from './HowItWorksModal';
import OrganizerResponses from './OrganizerResponses';
import { getModules } from '@/lib/eventConfig';
import type { EventQuestion } from '@/lib/questions';
import { useRealtimeParticipants } from '@/hooks/useRealtimeParticipants';
import { recordRespondedEvent } from '@/hooks/useRespondedEvents';
import { formatDisplayName, firstName } from '@/lib/names';
import { buildInviteText } from '@/lib/invite';
import { parseLocation, locationLabel } from '@/lib/location';
import { buildICS } from '@/lib/calendar';
import { formatEventDateRange } from '@/lib/dateRange';
import type { Event, RsvpValue } from '@/types';

interface RSVPViewProps {
  event: Event;
  participantId: string;
  participantName?: string;
  isOrganizer: boolean;
  organizerToken?: string | null;
  /** Reports (savedResponse, unsavedChanges) so the page can show progress. */
  onResponseStateChange?: (responded: boolean, pending: boolean) => void;
}

// ── Face icon SVGs ──────────────────────────────────────────────────────────

const SmileFace = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <path d="M8.5 14.5 Q12 17.5 15.5 14.5" />
  </svg>
);

const MaybeFace = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <path d="M9 15 Q10.5 13.5 12 15 Q13.5 16.5 15 15" />
  </svg>
);

const FrownFace = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <path d="M8.5 16 Q12 13 15.5 16" />
  </svg>
);

// ── RSVP config ─────────────────────────────────────────────────────────────

const RSVP_CONFIG = {
  yes: {
    icon: <SmileFace />,
    activeClass: 'bg-green-500 text-white border-green-500 dark:border-[#123428] shadow-md shadow-green-200 dark:shadow-green-500/30',
    hoverClass: 'hover:border-green-400 hover:bg-green-50 dark:hover:bg-[#112D25] hover:text-success-fg',
    dotClass: 'bg-green-400',
  },
  maybe: {
    icon: <MaybeFace />,
    activeClass: 'bg-amber-400 text-white border-amber-400 dark:border-[#3a2f17] shadow-md shadow-amber-200 dark:shadow-amber-500/25',
    hoverClass: 'hover:border-amber-300 dark:hover:border-[#3a2f17] hover:bg-amber-50 dark:hover:bg-[#302817] hover:text-amber-700 dark:hover:text-amber-400',
    dotClass: 'bg-amber-400',
  },
  no: {
    icon: <FrownFace />,
    activeClass: 'bg-strong text-white border-strong shadow-md shadow-fill2',
    hoverClass: 'hover:border-strong hover:bg-subtle hover:text-secondary',
    dotClass: 'bg-strong',
  },
} as const;

// ── Accordion section ────────────────────────────────────────────────────────

type SectionKey = 'yes' | 'maybe' | 'no' | 'pending';

function AccordionSection({
  label, count, isOpen, onToggle, dotClass, dimWhenEmpty, children,
}: {
  label: string; count: number; isOpen: boolean; onToggle: () => void;
  dotClass?: string; dimWhenEmpty?: boolean; children: React.ReactNode;
}) {
  const isEmpty = count === 0;
  return (
    <div className="border-b border-hairline-soft last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between py-2.5 text-left transition-colors cursor-pointer rounded-lg ${
          isEmpty && dimWhenEmpty ? 'opacity-40' : 'hover:bg-subtle'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${!isEmpty && dotClass ? dotClass : 'bg-fill2'}`} />
          <span className={`text-sm font-medium ${isEmpty && dimWhenEmpty ? 'text-faint' : 'text-body'}`}>{label}</span>
          <span className={`text-xs font-semibold tabular-nums ${isEmpty && dimWhenEmpty ? 'text-faint2' : 'text-faint'}`}><AnimatedNumber value={count} /></span>
        </div>
        <svg className={`w-4 h-4 text-faint transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && count > 0 && <div className="pb-2.5 animate-fade-in">{children}</div>}
    </div>
  );
}

// ── Confirmation bottom sheet ────────────────────────────────────────────────

const MODAL_CONTENT: Record<RsvpValue, { headline: string; subtext: string; showCalendar: boolean }> = {
  yes: {
    headline: "You're in! 🎉",
    subtext: "We'll see you there. Don't forget to add it to your calendar.",
    showCalendar: true,
  },
  maybe: {
    headline: "Hope you can make it! 🤞",
    subtext: "Bookmark this page and come back when you know for sure — updating your RSVP is one tap.",
    showCalendar: false,
  },
  no: {
    headline: "We'll miss you 😔",
    subtext: "Changed your mind later? Come back anytime and update your RSVP.",
    showCalendar: false,
  },
};

function RsvpModal({
  rsvp, event, onClose, onDownloadICS, onCopyDetails,
}: {
  rsvp: RsvpValue;
  event: Event;
  onClose: () => void;
  onDownloadICS: () => void;
  onCopyDetails: () => void;
}) {
  const monetization = useMonetization();
  const [shareCopied, setShareCopied] = useState(false);
  const content = MODAL_CONTENT[rsvp];
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const inviteText = buildInviteText(event, url);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: event.name, text: inviteText, url });
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(inviteText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteText;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile: bottom sheet. Desktop: centered dialog */}
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center animate-slide-up">
        <div className="relative w-full max-w-md bg-surface shadow-2xl pb-safe md:pb-0 rounded-t-3xl md:rounded-3xl md:max-h-[90vh] md:overflow-y-auto">

          {/* Drag handle — mobile only */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 rounded-full bg-fill2" />
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-fill text-faint hover:bg-fill2 hover:text-secondary transition-colors cursor-pointer z-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-6 pt-4 md:pt-6 pb-8 space-y-5">

            {/* Confirmation message */}
            <div className="text-center py-2">
              <h2 className="text-xl font-bold text-heading">{content.headline}</h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xs mx-auto">{content.subtext}</p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {content.showCalendar && event.finalized_time && (
                <>
                  <button
                    type="button"
                    onClick={() => { onDownloadICS(); onClose(); }}
                    className="w-full py-3 px-4 bg-social-500 text-white text-sm font-semibold rounded-xl hover:bg-social-600 transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Add to Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => { onCopyDetails(); onClose(); }}
                    className="w-full py-2.5 px-4 border border-hairline text-sm font-medium rounded-xl text-secondary hover:bg-subtle transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy event details
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2.5 px-4 border border-hairline text-sm font-medium rounded-xl text-secondary hover:bg-subtle transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
              >
                {shareCopied ? (
                  <>
                    <svg className="w-4 h-4 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-success-fg">Invite copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share this event
                  </>
                )}
              </button>
            </div>

            {/* Done — a clear, obvious way out (the × alone was easy to miss) */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 bg-teal-500 hover:bg-teal-600 text-white text-base font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer"
            >
              Done
            </button>

            {/* Divider */}
            <div className="border-t border-hairline-soft" />

            {/* App promotion */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-faint uppercase tracking-wider">Planning something?</p>
              <a
                href="/"
                className="w-full py-2.5 px-4 bg-[#101828] dark:bg-[#232B36] text-white text-sm font-semibold rounded-xl hover:bg-[#101828] dark:hover:bg-[#232B36] transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Start your own event — it&apos;s free
              </a>

              {monetization.buymeacoffee_url && monetization.show_on_rsvp && (
                <a
                  href={monetization.buymeacoffee_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 border border-amber-200 dark:border-[#3a2f17] bg-amber-50 dark:bg-[#302817] text-amber-700 dark:text-amber-400 text-sm font-medium rounded-xl hover:bg-amber-100 dark:hover:bg-[#302817] transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
                >
                  ☕ {monetization.donation_cta}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function RSVPView({ event, participantId, participantName, isOrganizer, organizerToken, onResponseStateChange }: RSVPViewProps) {
  const copy = useCopy();
  const rsvpCopy = copy.rsvp;
  const { participants, removeParticipant } = useRealtimeParticipants(event.id);
  const [saving, setSaving] = useState(false);
  const [optimisticRsvp, setOptimisticRsvp] = useState<RsvpValue | null>(null);
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());
  const [showGuests, setShowGuests] = useState(true);
  const [modalRsvp, setModalRsvp] = useState<RsvpValue | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [optimisticGuests, setOptimisticGuests] = useState<number | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [guestSavedFlash, setGuestSavedFlash] = useState(false);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${event.id}/questions`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => {});
  }, [event.id]);

  const me = participants.find((p) => p.id === participantId);
  const myRsvp: RsvpValue | null = optimisticRsvp ?? me?.rsvp ?? null;

  // Report answered-state so the page-level progress banner tracks it.
  const savedRsvp = me?.rsvp ?? null;
  useEffect(() => {
    onResponseStateChange?.(!!savedRsvp, false);
  }, [savedRsvp, onResponseStateChange]);

  // Keep the homepage "Joined" entry's RSVP status in sync. Skip the organizer's
  // own event (it lives under their own events, not the joined list).
  useEffect(() => {
    if (!myRsvp) return;
    if (localStorage.getItem(`organizer_${event.slug}`)) return;
    recordRespondedEvent(event.slug, event.name, {
      eventType: 'fixed',
      finalizedTime: event.finalized_time ?? null,
      allDay: event.all_day,
      finalizedEndDate: event.finalized_end_date ?? null,
      rsvp: myRsvp,
    });
  }, [myRsvp, event.slug, event.name, event.finalized_time, event.all_day, event.finalized_end_date]);

  // Capacity: when a max is set, the cap counts "yes" responders plus the
  // guests they're bringing. Drives the public "spots filled" meter + limits.
  const myGuests = optimisticGuests ?? me?.guest_count ?? 0;
  const headcount = participants.reduce((s, p) => (p.rsvp === 'yes' ? s + 1 + (p.guest_count || 0) : s), 0);
  const cap = event.max_participants ?? null;
  const capPct = cap ? Math.min(100, Math.round((headcount / cap) * 100)) : 0;
  const isFull = cap !== null && headcount >= cap;
  const myContribution = me?.rsvp === 'yes' ? 1 + (me?.guest_count ?? 0) : 0;
  // Most guests I can add: remaining capacity minus my own seat (or 10 if no cap).
  const maxGuestsForMe = cap !== null ? Math.max(0, cap - (headcount - myContribution) - 1) : 10;

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRsvp = useCallback(async (value: RsvpValue) => {
    if (saving) return;
    setCapacityError(null);
    // Quick tactile confirmation on tap.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(12); } catch { /* ignore */ }
    }
    setOptimisticRsvp(value);
    setSaving(true);

    try {
      const res = await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp: value, event_id: event.id, guest_count: value === 'yes' ? myGuests : 0 }),
      });
      if (!res.ok) {
        // e.g. the event filled up between render and tap.
        const d = await res.json().catch(() => ({}));
        setOptimisticRsvp(null);
        setCapacityError(d.error || 'Could not save your RSVP. Please try again.');
        return;
      }
      // Confirmation modal + confetti only after a confirmed save.
      setModalRsvp(value);
      if (value === 'yes' && getModules(event).confetti) setShowConfetti(true);
      setOptimisticRsvp(null);
    } catch {
      setOptimisticRsvp(null);
      setCapacityError('Could not save your RSVP. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [participantId, event.id, saving, myGuests]);

  const handleGuestChange = useCallback(async (delta: number) => {
    const current = optimisticGuests ?? me?.guest_count ?? 0;
    const next = Math.max(0, Math.min(maxGuestsForMe, current + delta));
    if (next === current) return;
    setCapacityError(null);
    setOptimisticGuests(next);
    try {
      const res = await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp: 'yes', event_id: event.id, guest_count: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setOptimisticGuests(null);
        setCapacityError(d.error || 'Could not update your guest count.');
        return;
      }
      setOptimisticGuests(null);
      // Visible confirmation — this control auto-saves, so say so.
      setGuestSavedFlash(true);
      setTimeout(() => setGuestSavedFlash(false), 2000);
    } catch {
      setOptimisticGuests(null);
      setCapacityError('Could not update your guest count.');
    }
  }, [participantId, event.id, me?.guest_count, optimisticGuests, maxGuestsForMe]);

  const handleDeleteParticipant = useCallback(async (pid: string) => {
    if (!organizerToken) return;
    removeParticipant(pid);
    await fetch(`/api/events/${event.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizer_token: organizerToken, participant_id: pid }),
    });
  }, [event.id, organizerToken, removeParticipant]);

  const handleDownloadICS = useCallback(() => {
    const ics = buildICS({
      name: event.name,
      startISO: event.finalized_time!,
      durationMinutes: event.duration_minutes || 60,
      description: event.description,
      location: event.location ? locationLabel(parseLocation(event.location)) : null,
      allDay: event.all_day,
      endDateISO: event.finalized_end_date,
    });
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }, [event]);

  const handleCopyDetails = useCallback(async () => {
    const dateLine = formatEventDateRange(event.finalized_time!, event.finalized_end_date, !!event.all_day);
    const text = [
      event.name, '',
      dateLine,
      ...(event.location ? [locationLabel(parseLocation(event.location))] : []),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [event]);

  // Sorted helpers
  const sortByName = <T extends { name: string }>(arr: T[]) =>
    [...arr].sort((a, b) => a.name.localeCompare(b.name));

  const going   = sortByName(participants.filter((p) => p.rsvp === 'yes'));
  const maybe   = sortByName(participants.filter((p) => p.rsvp === 'maybe'));
  const cant    = sortByName(participants.filter((p) => p.rsvp === 'no'));
  const pending = sortByName(participants.filter((p) => !p.rsvp));

  // When the organizer hides the guest list, only they see the names; everyone
  // else still sees the aggregate totals.
  const canSeeNames = isOrganizer || !event.hide_guest_list;
  const modules = getModules(event);

  const rsvpOptions: { value: RsvpValue; label: string }[] = [
    { value: 'yes',   label: rsvpCopy?.going ?? 'Going' },
    { value: 'maybe', label: rsvpCopy?.maybe ?? 'Maybe' },
    { value: 'no',    label: rsvpCopy?.cant  ?? "Can't make it" },
  ];

  const renderNameList = (list: typeof going) => (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-0.5">
      {list.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-1 min-w-0 group">
          <span className={`text-sm truncate ${p.id === participantId ? 'font-semibold text-heading' : 'text-secondary'}`}>
            {formatDisplayName(p.name)}
            {(p.guest_count ?? 0) > 0 && <span className="ml-1 text-xs font-semibold text-social-fg">+{p.guest_count}</span>}
            {p.id === participantId && <span className="ml-1 text-xs text-faint font-normal">you</span>}
          </span>
          {isOrganizer && p.id !== participantId && (
            <button
              type="button"
              onClick={() => handleDeleteParticipant(p.id)}
              className="text-xs text-faint2 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 ml-2 shrink-0"
              title="Remove"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Confetti burst on Going / Maybe */}
      {showConfetti && <ConfettiCelebration onComplete={() => setShowConfetti(false)} />}

      <div className="space-y-5">
        {/* Persistent "you're done" confirmation — guests who have answered */}
        {!isOrganizer && savedRsvp && !optimisticRsvp && (
          <GuestDoneCard
            event={event}
            participantId={participantId}
            participantName={participantName || ''}
            savedCount={0}
            mode="rsvp"
            rsvpStatus={savedRsvp}
            onShowHow={() => setShowHow(true)}
          />
        )}

        {/* RSVP buttons — the guest's one job, so they come first */}
        <div>
          <p className="text-sm font-semibold text-body mb-3">
            {myRsvp ? (rsvpCopy?.change ?? 'Change response') : (rsvpCopy?.heading ?? 'Can you make it?')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {rsvpOptions.map(({ value, label }) => {
              const cfg = RSVP_CONFIG[value];
              const isActive = myRsvp === value;
              // Can't claim a "Going" spot once the event is full (unless already in).
              const blocked = value === 'yes' && isFull && !isActive;
              const disabled = saving || blocked;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRsvp(value)}
                  disabled={disabled}
                  className={`
                    flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl border-2 text-sm font-semibold
                    transition-all duration-200 active:scale-95 cursor-pointer
                    ${isActive ? cfg.activeClass : `bg-surface border-hairline text-muted ${cfg.hoverClass}`}
                    ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  {cfg.icon}
                  <span className="text-xs font-semibold leading-tight text-center">{blocked ? 'Full' : label}</span>
                </button>
              );
            })}
          </div>

          {/* Guest stepper — when Going, bring +N (bounded by remaining capacity) */}
          {myRsvp === 'yes' && (maxGuestsForMe > 0 || myGuests > 0) && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-hairline px-3 py-2.5 animate-fade-in">
              <span className="text-sm text-body">
                {guestSavedFlash ? (
                  <span className="inline-flex items-center gap-1 font-medium text-success-fg animate-fade-in">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                ) : (
                  <>
                    Bringing guests?
                    {myGuests > 0 && <span className="text-faint"> · you +{myGuests}</span>}
                  </>
                )}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleGuestChange(-1)}
                  disabled={myGuests <= 0}
                  aria-label="Remove a guest"
                  className="w-9 h-9 flex items-center justify-center rounded-chip bg-icon-bg text-icon-fg hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold tabular-nums w-5 text-center">{myGuests}</span>
                <button
                  type="button"
                  onClick={() => handleGuestChange(1)}
                  disabled={myGuests >= maxGuestsForMe}
                  aria-label="Add a guest"
                  className="w-9 h-9 flex items-center justify-center rounded-chip bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {capacityError && (
            <p className="mt-2 text-sm text-red-500 dark:text-red-400 animate-fade-in">{capacityError}</p>
          )}
        </div>

        {/* Calendar actions — secondary, below RSVP once answered */}
        {myRsvp === 'yes' && event.finalized_time && modules.calendar && (
          <div className="space-y-2 animate-fade-in">
            <button type="button" onClick={handleDownloadICS}
              className="w-full py-2.5 px-4 bg-social-500 text-white text-sm font-semibold rounded-xl hover:bg-social-600 shadow-sm transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Add to Calendar
            </button>
            <button type="button" onClick={handleCopyDetails}
              className={`w-full py-2 px-4 border text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 ${
                copied ? 'bg-social-500 border-social-500 text-white' : 'bg-surface border-hairline text-secondary hover:bg-subtle'
              }`}>
              {copied ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Copied!</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>Copy event details</>
              )}
            </button>
          </div>
        )}

        {/* Custom questions — guests answer once they're going/maybe */}
        {questions.length > 0 && participantId && (myRsvp === 'yes' || myRsvp === 'maybe') && (
          <GuestQuestions eventId={event.id} participantId={participantId} questions={questions} />
        )}

        {/* Organizer: collapsible view of all answers */}
        {questions.length > 0 && isOrganizer && organizerToken && (
          <OrganizerResponses eventId={event.id} organizerToken={organizerToken} questions={questions} />
        )}

        {/* Who's coming — social proof, demoted below the guest's own job */}
        {modules.attendeeStack && going.length > 0 && (
          <AttendeeStack
            names={going.map((p) => p.name)}
            total={going.length}
            showNames={canSeeNames}
            label={`${going.length} going`}
          />
        )}

        {/* Capacity meter — only when the organizer set a max */}
        {cap !== null && (
          <div className="rounded-xl border border-hairline-soft bg-subtle p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-body">
                <span className="tabular-nums">{headcount}</span>
                <span className="text-faint font-normal"> of {cap} spots filled</span>
              </span>
              {isFull ? (
                <span className="text-xs font-semibold text-red-500 dark:text-red-400">Full</span>
              ) : capPct >= 80 ? (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Almost full</span>
              ) : (
                <span className="text-xs font-medium text-faint tabular-nums">{Math.max(0, cap - headcount)} left</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-fill overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : capPct >= 80 ? 'bg-amber-500' : 'bg-social-500'}`}
                style={{ width: `${Math.max(capPct, headcount > 0 ? 6 : 0)}%` }}
              />
            </div>
          </div>
        )}

        {/* RSVP breakdown */}
        {modules.rsvpProgress && participants.length > 0 && (
          <RsvpProgress going={going.length} maybe={maybe.length} cant={cant.length} />
        )}

        {/* Guest list — collapsible (shown by default) */}
        {participants.length > 0 && (
          <div className="border-t border-hairline-soft pt-1 animate-fade-in">
            {canSeeNames ? (
            <>
            <button
              type="button"
              onClick={() => setShowGuests((v) => !v)}
              className="w-full flex items-center justify-between py-2.5 text-left rounded-lg hover:bg-subtle transition-colors cursor-pointer"
            >
              <span className="text-sm font-semibold text-body">
                {rsvpCopy?.guests_label ?? 'Guest list'}
                <span className="ml-1.5 text-xs font-medium text-faint tabular-nums">{participants.length}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-faint">
                {showGuests ? (rsvpCopy?.hide ?? 'Hide') : (rsvpCopy?.show ?? 'Show')}
                <svg className={`w-4 h-4 transition-transform duration-200 ${showGuests ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {showGuests && (
              <div className="animate-fade-in">
                <AccordionSection label={rsvpCopy?.going_label ?? 'Going'} count={going.length}
                  isOpen={openSections.has('yes')} onToggle={() => toggleSection('yes')}
                  dotClass={RSVP_CONFIG.yes.dotClass} dimWhenEmpty>
                  {renderNameList(going)}
                </AccordionSection>
                <AccordionSection label={rsvpCopy?.maybe_label ?? 'Maybe'} count={maybe.length}
                  isOpen={openSections.has('maybe')} onToggle={() => toggleSection('maybe')}
                  dotClass={RSVP_CONFIG.maybe.dotClass} dimWhenEmpty>
                  {renderNameList(maybe)}
                </AccordionSection>
                <AccordionSection label={rsvpCopy?.cant_label ?? "Can't make it"} count={cant.length}
                  isOpen={openSections.has('no')} onToggle={() => toggleSection('no')}
                  dotClass={RSVP_CONFIG.no.dotClass} dimWhenEmpty>
                  {renderNameList(cant)}
                </AccordionSection>
                {pending.length > 0 && (
                  <AccordionSection label={rsvpCopy?.pending_label ?? 'No response yet'} count={pending.length}
                    isOpen={openSections.has('pending')} onToggle={() => toggleSection('pending')}>
                    {renderNameList(pending)}
                  </AccordionSection>
                )}
              </div>
            )}
            </>
            ) : (
              <div className="py-2.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-secondary">
                  <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${RSVP_CONFIG.yes.dotClass}`} /><b className="text-heading tabular-nums">{going.length}</b> {rsvpCopy?.going ?? 'Going'}</span>
                  <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${RSVP_CONFIG.maybe.dotClass}`} /><b className="text-heading tabular-nums">{maybe.length}</b> {rsvpCopy?.maybe ?? 'Maybe'}</span>
                  <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${RSVP_CONFIG.no.dotClass}`} /><b className="text-heading tabular-nums">{cant.length}</b> {rsvpCopy?.cant ?? "Can't"}</span>
                </div>
                <p className="text-xs text-faint mt-1.5">Only the organizer can see who&apos;s responded.</p>
              </div>
            )}
          </div>
        )}

        {participants.length === 0 && (
          <div className="border-t border-hairline-soft pt-5 flex flex-col items-center text-center gap-2">
            <IconChip size="lg"><UsersIcon /></IconChip>
            <p className="text-sm font-semibold text-body">Be the first to RSVP</p>
            <p className="text-xs text-muted">{rsvpCopy?.no_responses ?? 'Tap a response above — replies show up here.'}</p>
          </div>
        )}
      </div>

      {/* Confirmation bottom sheet */}
      {modalRsvp && (
        <RsvpModal
          rsvp={modalRsvp}
          event={event}
          onClose={() => setModalRsvp(null)}
          onDownloadICS={handleDownloadICS}
          onCopyDetails={handleCopyDetails}
        />
      )}

      {/* Reopenable instructions */}
      {showHow && <HowItWorksModal event={event} onClose={() => setShowHow(false)} />}
    </>
  );
}
