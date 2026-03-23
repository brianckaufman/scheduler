'use client';

import { useState, useCallback } from 'react';
import { format, addMinutes } from 'date-fns';
import { useCopy } from '@/contexts/CopyContext';
import { useMonetization } from '@/contexts/MonetizationContext';
import SupportBanner from './SupportBanner';
import { useRealtimeParticipants } from '@/hooks/useRealtimeParticipants';
import { formatDisplayName } from '@/lib/names';
import type { Event, RsvpValue } from '@/types';

interface RSVPViewProps {
  event: Event;
  participantId: string;
  isOrganizer: boolean;
  organizerToken?: string | null;
}

const RSVP_CONFIG = {
  yes: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
    activeClass: 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200',
    hoverClass: 'hover:border-green-400 hover:bg-green-50 hover:text-green-700',
    dotClass: 'bg-green-400',
  },
  maybe: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    activeClass: 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200',
    hoverClass: 'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
    dotClass: 'bg-amber-400',
  },
  no: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    activeClass: 'bg-red-400 text-white border-red-400 shadow-md shadow-red-200',
    hoverClass: 'hover:border-red-300 hover:bg-red-50 hover:text-red-500',
    dotClass: 'bg-red-400',
  },
} as const;

function generateICS(event: Event): string {
  const start = new Date(event.finalized_time!);
  const end = addMinutes(start, event.duration_minutes || 60);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.name}`,
    event.description ? `DESCRIPTION:${event.description}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

type SectionKey = 'yes' | 'maybe' | 'no' | 'pending';

interface AccordionSectionProps {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  dotClass?: string;
  dimWhenEmpty?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ label, count, isOpen, onToggle, dotClass, dimWhenEmpty, children }: AccordionSectionProps) {
  const isEmpty = count === 0;
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between py-2.5 text-left transition-colors cursor-pointer ${
          isEmpty && dimWhenEmpty ? 'opacity-40' : 'hover:bg-gray-50 -mx-1 px-1 rounded-lg'
        }`}
      >
        <div className="flex items-center gap-2">
          {dotClass && !isEmpty && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
          )}
          {(isEmpty || !dotClass) && (
            <span className="w-2 h-2 rounded-full shrink-0 bg-gray-200" />
          )}
          <span className={`text-sm font-medium ${isEmpty && dimWhenEmpty ? 'text-gray-400' : 'text-gray-700'}`}>
            {label}
          </span>
          <span className={`text-xs font-semibold tabular-nums ${isEmpty && dimWhenEmpty ? 'text-gray-300' : 'text-gray-400'}`}>
            {count}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && count > 0 && (
        <div className="pb-2.5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export default function RSVPView({ event, participantId, isOrganizer, organizerToken }: RSVPViewProps) {
  const copy = useCopy();
  const monetization = useMonetization();
  const rsvpCopy = copy.rsvp;
  const { participants, removeParticipant } = useRealtimeParticipants(event.id);
  const [saving, setSaving] = useState(false);
  const [optimisticRsvp, setOptimisticRsvp] = useState<RsvpValue | null>(null);
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(['yes']));

  const me = participants.find((p) => p.id === participantId);
  const myRsvp: RsvpValue | null = optimisticRsvp ?? me?.rsvp ?? null;

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
    setOptimisticRsvp(value);
    setSaving(true);
    try {
      await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp: value, event_id: event.id }),
      });
      setOptimisticRsvp(null);
    } catch {
      setOptimisticRsvp(null);
    } finally {
      setSaving(false);
    }
  }, [participantId, event.id, saving]);

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
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }, [event]);

  const handleCopyDetails = useCallback(async () => {
    const start = new Date(event.finalized_time!);
    const end = addMinutes(start, event.duration_minutes || 60);
    const lines = [
      event.name,
      '',
      format(start, 'EEEE, MMMM d, yyyy'),
      `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
      ...(event.location ? [event.location] : []),
    ];
    const text = lines.join('\n');
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

  // Sort helpers
  const sortByName = <T extends { name: string }>(arr: T[]) =>
    [...arr].sort((a, b) => a.name.localeCompare(b.name));

  const going = sortByName(participants.filter((p) => p.rsvp === 'yes'));
  const maybe = sortByName(participants.filter((p) => p.rsvp === 'maybe'));
  const cant = sortByName(participants.filter((p) => p.rsvp === 'no'));
  const pending = sortByName(participants.filter((p) => !p.rsvp));

  const rsvpOptions: { value: RsvpValue; label: string }[] = [
    { value: 'yes', label: rsvpCopy?.going ?? 'Going' },
    { value: 'maybe', label: rsvpCopy?.maybe ?? 'Maybe' },
    { value: 'no', label: rsvpCopy?.cant ?? "Can't make it" },
  ];

  const showCalendarActions = event.finalized_time && (myRsvp === 'yes' || myRsvp === 'maybe');

  const renderNameList = (list: typeof going) => (
    <ul className="space-y-1 mt-0.5">
      {list.map((p) => (
        <li key={p.id} className="flex items-center justify-between group">
          <span className={`text-sm ${p.id === participantId ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
            {formatDisplayName(p.name)}
            {p.id === participantId && (
              <span className="ml-1 text-xs text-gray-400 font-normal">you</span>
            )}
          </span>
          {isOrganizer && p.id !== participantId && (
            <button
              type="button"
              onClick={() => handleDeleteParticipant(p.id)}
              className="text-xs text-gray-300 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 ml-2 shrink-0"
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
    <div className="space-y-5">
      {/* RSVP prompt */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">
          {myRsvp
            ? (rsvpCopy?.change ?? 'Change response')
            : (rsvpCopy?.heading ?? 'Can you make it?')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {rsvpOptions.map(({ value, label }) => {
            const cfg = RSVP_CONFIG[value];
            const isActive = myRsvp === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleRsvp(value)}
                disabled={saving}
                className={`
                  flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-sm font-semibold
                  transition-all duration-200 active:scale-95 cursor-pointer
                  ${isActive
                    ? cfg.activeClass
                    : `bg-white border-gray-200 text-gray-500 ${cfg.hoverClass}`
                  }
                  ${saving ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                {cfg.icon}
                <span className="text-xs font-semibold leading-tight text-center">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar actions — appear once user says they're going or maybe */}
      {showCalendarActions && (
        <div className="space-y-2 animate-fade-in">
          <button
            type="button"
            onClick={handleDownloadICS}
            className="w-full py-2.5 px-4 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 shadow-sm transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Add to Calendar
          </button>
          <button
            type="button"
            onClick={handleCopyDetails}
            className={`w-full py-2 px-4 border text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 ${
              copied
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy event details
              </>
            )}
          </button>
        </div>
      )}

      {/* Accordion RSVP list */}
      {participants.length > 0 && (
        <div className="border-t border-gray-100 pt-1 animate-fade-in">
          <AccordionSection
            label={rsvpCopy?.going_label ?? 'Going'}
            count={going.length}
            isOpen={openSections.has('yes')}
            onToggle={() => toggleSection('yes')}
            dotClass={RSVP_CONFIG.yes.dotClass}
            dimWhenEmpty
          >
            {renderNameList(going)}
          </AccordionSection>

          <AccordionSection
            label={rsvpCopy?.maybe_label ?? 'Maybe'}
            count={maybe.length}
            isOpen={openSections.has('maybe')}
            onToggle={() => toggleSection('maybe')}
            dotClass={RSVP_CONFIG.maybe.dotClass}
            dimWhenEmpty
          >
            {renderNameList(maybe)}
          </AccordionSection>

          <AccordionSection
            label={rsvpCopy?.cant_label ?? "Can't make it"}
            count={cant.length}
            isOpen={openSections.has('no')}
            onToggle={() => toggleSection('no')}
            dotClass={RSVP_CONFIG.no.dotClass}
            dimWhenEmpty
          >
            {renderNameList(cant)}
          </AccordionSection>

          {pending.length > 0 && (
            <AccordionSection
              label={rsvpCopy?.pending_label ?? 'No response yet'}
              count={pending.length}
              isOpen={openSections.has('pending')}
              onToggle={() => toggleSection('pending')}
            >
              {renderNameList(pending)}
            </AccordionSection>
          )}
        </div>
      )}

      {participants.length === 0 && (
        <p className="text-sm text-gray-400 italic pt-1 border-t border-gray-100">
          {rsvpCopy?.no_responses ?? 'No responses yet'}
        </p>
      )}

      {/* Support nudge — shown once per session after user responds */}
      {myRsvp && monetization.buymeacoffee_url && monetization.show_on_rsvp && (
        <SupportBanner
          url={monetization.buymeacoffee_url}
          cta={monetization.donation_cta}
          message={monetization.donation_message}
          variant="banner"
          sessionKey="support_nudge_rsvp"
        />
      )}
    </div>
  );
}
