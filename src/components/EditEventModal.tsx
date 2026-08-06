'use client';

import { useState, lazy, Suspense } from 'react';
import { format, addDays } from 'date-fns';
import type { Event } from '@/types';
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
import LocationInput from '@/components/LocationInput';
import EventColorPicker from '@/components/EventColorPicker';
import EventImageUpload from '@/components/EventImageUpload';
import { getModules, MODULE_TOGGLES, FIXED_ONLY_MODULES, type EventModules } from '@/lib/eventConfig';
import { EVENT_KINDS } from '@/lib/eventTypes';
import QuestionsEditor from '@/components/QuestionsEditor';
import DateRangeCalendar from '@/components/DateRangeCalendar';
import {
  TIME_OPTIONS, formatTimeLabel, enumDurationEndTimeOptions, ALLOWED_DURATIONS, formatDurationLabel,
} from '@/lib/timeOptions';
import { zonedToUtc, utcToZoned } from '@/lib/slots';
import { getTimezoneLabel } from '@/lib/timezones';

const DURATION_OPTIONS = ALLOWED_DURATIONS.map((value) => ({
  value,
  label: formatDurationLabel(value),
}));

interface EditEventModalProps {
  event: Event;
  /** Pre-launch gate — hides the organizer-email field until notifications ship. */
  notificationsEnabled?: boolean;
  organizerToken: string;
  onClose: () => void;
  onSave: (updated: Event) => void;
  onDelete: () => void;
}

type DeleteStep = 'idle' | 'confirm' | 'typing';

export default function EditEventModal({
  event,
  notificationsEnabled = false,
  organizerToken,
  onClose,
  onSave,
  onDelete,
}: EditEventModalProps) {
  const isFixed = event.event_type === 'fixed';

  // Reschedule state (fixed events only). Pre-filled from finalized_time in
  // the event's own timezone — not the viewer's browser timezone — so an
  // organizer editing from elsewhere doesn't see a day/hour drift.
  const initialZoned = isFixed && event.finalized_time
    ? utcToZoned(new Date(event.finalized_time), event.timezone)
    : null;
  const [fixedDate, setFixedDate] = useState(initialZoned?.dateStr || '');
  const [fixedEndDate, setFixedEndDate] = useState(event.finalized_end_date || '');
  const [fixedTime, setFixedTime] = useState(initialZoned?.timeStr || '09:00');
  const [fixedEndTime, setFixedEndTime] = useState(() => {
    if (!initialZoned) return '10:00';
    const opts = enumDurationEndTimeOptions(initialZoned.timeStr);
    return opts.find((o) => o.minutes === event.duration_minutes)?.value
      ?? opts.find((o) => o.minutes === 60)?.value
      ?? opts[0]?.value
      ?? '10:00';
  });

  const [name, setName] = useState(event.name);
  const [color, setColor] = useState(event.color || '');
  const [hideGuestList, setHideGuestList] = useState(event.hide_guest_list ?? false);
  const [logoUrl, setLogoUrl] = useState(event.logo_url || '');
  const [photoUrl, setPhotoUrl] = useState(event.photo_url || '');
  const [eventKind, setEventKind] = useState(event.event_kind || 'casual');
  const [modules, setModules] = useState<EventModules>(() => getModules(event));
  const [body, setBody] = useState(event.body || '');
  const [organizerName, setOrganizerName] = useState(event.organizer_name || '');
  const [organizerEmail, setOrganizerEmail] = useState(event.organizer_email || '');
  const [location, setLocation] = useState(event.location || '');
  const [durationMinutes, setDurationMinutes] = useState(event.duration_minutes);
  const [maxParticipants, setMaxParticipants] = useState<string>(
    event.max_participants ? String(event.max_participants) : ''
  );
  const [minResponses, setMinResponses] = useState<string>(
    event.min_responses ? String(event.min_responses) : ''
  );
  const [minBlockDays, setMinBlockDays] = useState<string>(
    event.min_block_days ? String(event.min_block_days) : ''
  );
  // If the saved value is outside the dropdown range, start in custom mode
  const [minResponsesCustom, setMinResponsesCustom] = useState(
    !!event.min_responses && event.min_responses > 15
  );
  const [responseDeadline, setResponseDeadline] = useState(
    event.response_deadline ? format(new Date(event.response_deadline), 'yyyy-MM-dd') : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Safe delete state
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const minDeadline = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const minFixedDate = format(new Date(), 'yyyy-MM-dd');
  const deleteConfirmRequired = 'DELETE';

  const handleSave = async () => {
    if (!name.trim() || !organizerName.trim()) {
      setError('Event name and your name are required');
      return;
    }

    // Reschedule (fixed events only) — only include fields that actually
    // changed, both to avoid an unnecessary "time changed" notification
    // email and to match this file's existing "only send if changed" idiom.
    const reschedule: Record<string, unknown> = {};
    if (isFixed) {
      if (!fixedDate) {
        setError('Event date is required');
        return;
      }
      if (event.all_day) {
        if (fixedEndDate && fixedEndDate < fixedDate) {
          setError('End date must be on or after the start date');
          return;
        }
        const newFinalizedTime = zonedToUtc(fixedDate, '00:00', event.timezone).toISOString();
        const newEndDate = fixedEndDate || fixedDate;
        if (newFinalizedTime !== event.finalized_time) reschedule.finalized_time = newFinalizedTime;
        if (newEndDate !== (event.finalized_end_date || fixedDate)) reschedule.finalized_end_date = newEndDate;
      } else {
        const [sh, sm] = fixedTime.split(':').map(Number);
        const [eh, em] = fixedEndTime.split(':').map(Number);
        const durationMins = (eh * 60 + em) - (sh * 60 + sm);
        if (durationMins <= 0) {
          setError('End time must be after start time');
          return;
        }
        const newFinalizedTime = zonedToUtc(fixedDate, fixedTime, event.timezone).toISOString();
        if (newFinalizedTime !== event.finalized_time) reschedule.finalized_time = newFinalizedTime;
        if (durationMins !== event.duration_minutes) reschedule.duration_minutes = durationMins;
      }
    }

    setSaving(true);
    setError('');

    try {
      const maxP = maxParticipants ? parseInt(maxParticipants, 10) : null;

      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizer_token: organizerToken,
          name: name.trim(),
          body: body.trim() || null,
          organizer_name: organizerName.trim(),
          // Only send when changed, so edits still work if the organizer-email
          // migration hasn't been run (avoids referencing a missing column).
          ...(organizerEmail.trim() !== (event.organizer_email || '')
            ? { organizer_email: organizerEmail.trim() || null }
            : {}),
          location: location.trim() || null,
          // Availability events only — a fixed event's duration comes from
          // the reschedule fields above (derived from start/end time), and
          // it's a meaningless sentinel for all-day events either way.
          ...(!isFixed && !event.all_day && { duration_minutes: durationMinutes }),
          ...reschedule,
          max_participants: maxP,
          min_responses: minResponses ? parseInt(minResponses, 10) : null,
          // Only send when changed, so edits still work if the block-days
          // migration hasn't been run (avoids referencing a missing column).
          ...(minBlockDays !== (event.min_block_days ? String(event.min_block_days) : '')
            ? { min_block_days: minBlockDays ? parseInt(minBlockDays, 10) : null }
            : {}),
          // Only send color when changed, so edits still work if the color
          // migration hasn't been run (avoids referencing a missing column).
          ...(color !== (event.color || '') ? { color: color || null } : {}),
          // Only send when changed, so edits work even if the migration hasn't run.
          ...(hideGuestList !== (event.hide_guest_list ?? false) ? { hide_guest_list: hideGuestList } : {}),
          ...(logoUrl !== (event.logo_url || '') ? { logo_url: logoUrl || null } : {}),
          ...(photoUrl !== (event.photo_url || '') ? { photo_url: photoUrl || null } : {}),
          ...(JSON.stringify(modules) !== JSON.stringify(getModules(event)) ? { config: { modules } } : {}),
          ...(eventKind !== (event.event_kind || 'casual') ? { event_kind: eventKind } : {}),
          response_deadline: responseDeadline
            ? new Date(responseDeadline + 'T23:59:59').toISOString()
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizer_token: organizerToken, delete_event: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-social-500 focus:border-transparent text-heading text-sm";
  const selectClass = "w-full px-3 py-2.5 rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-social-500 text-heading bg-surface text-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-hairline-soft px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-heading">Edit Event</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-faint hover:text-secondary rounded-full hover:bg-fill transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Event name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={inputClass} maxLength={100} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">
              Additional details{' '}
              <span className="text-faint font-normal">(optional — hidden behind "Read more")</span>
            </label>
            <Suspense fallback={<div className="h-28 rounded-xl border border-strong bg-subtle animate-pulse" />}>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Agenda, directions, what to bring, dress code…"
                minHeight={90}

              />
            </Suspense>
          </div>
          <EventColorPicker value={color} onChange={setColor} />
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hideGuestList}
              onChange={(e) => setHideGuestList(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-strong accent-social-500 cursor-pointer shrink-0"
            />
            <span>
              <span className="block text-sm font-medium text-body">Hide guest list</span>
              <span className="block text-xs text-faint mt-0.5">Only you will see who responded — guests still see the totals, just not the names.</span>
            </span>
          </label>

          {/* === Appearance / branding === */}
          <div className="border-t border-hairline-soft pt-4 space-y-4">
            <p className="text-xs font-semibold text-faint uppercase tracking-wider">Appearance</p>
            <EventImageUpload
              eventId={event.id}
              organizerToken={organizerToken}
              kind="photo"
              value={photoUrl}
              onChange={setPhotoUrl}
              label="Event photo"
              hint="Wide hero image. PNG/JPG, max 5MB."
              aspect="photo"
            />
            <EventImageUpload
              eventId={event.id}
              organizerToken={organizerToken}
              kind="logo"
              value={logoUrl}
              onChange={setLogoUrl}
              label="Event logo"
              hint="Replaces the default lockup. Transparent PNG/SVG works best."
              aspect="logo"
            />
          </div>

          {/* === Event type + modules (show / hide) === */}
          <div className="border-t border-hairline-soft pt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-faint uppercase tracking-wider mb-1.5">Event type</label>
              <select
                value={eventKind}
                onChange={(e) => {
                  const k = e.target.value;
                  setEventKind(k);
                  // Re-seed the toggles to the new type's defaults; user can re-tweak.
                  setModules(getModules({ event_kind: k }));
                }}
                className={inputClass}
              >
                {EVENT_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>{k.emoji} {k.label}</option>
                ))}
              </select>
            </div>
            <p className="text-xs font-semibold text-faint uppercase tracking-wider pt-1">Show / hide</p>
            {MODULE_TOGGLES.filter(({ key }) => isFixed || !FIXED_ONLY_MODULES.includes(key)).map(({ key, label, hint }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules[key]}
                  onChange={(e) => setModules((m) => ({ ...m, [key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-strong accent-social-500 cursor-pointer shrink-0"
                />
                <span>
                  <span className="block text-sm font-medium text-body">{label}</span>
                  <span className="block text-xs text-faint mt-0.5">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          {/* === Custom questions === */}
          <div className="border-t border-hairline-soft pt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-faint uppercase tracking-wider">Custom questions</p>
              <p className="text-xs text-faint mt-0.5">Ask guests anything (dietary needs, song requests…). Saved separately.</p>
            </div>
            <QuestionsEditor eventId={event.id} organizerToken={organizerToken} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Your name</label>
            <input type="text" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)}
              className={inputClass} maxLength={50} required />
          </div>
          {notificationsEnabled && (
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Your email <span className="text-faint font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={organizerEmail}
              onChange={(e) => setOrganizerEmail(e.target.value)}
              className={inputClass}
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
            />
            <p className="text-xs text-faint mt-1">
              {isFixed
                ? "We'll email you when people RSVP."
                : "We'll email you once enough people have replied, so you can pick the time."}
            </p>
          </div>
          )}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Location</label>
            <LocationInput value={location} onChange={setLocation} inputClassName={inputClass} />
          </div>

          {/* === Reschedule (fixed/RSVP events only) === */}
          {isFixed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-secondary">
                  {event.all_day ? 'Event date' : 'Event date & time'}
                </label>
                <span className="text-[11px] text-faint">{getTimezoneLabel(event.timezone)}</span>
              </div>
              {event.all_day ? (
                <>
                  <DateRangeCalendar
                    startDate={fixedDate}
                    endDate={fixedEndDate}
                    onChange={(s, e) => { setFixedDate(s); setFixedEndDate(e); }}
                  />
                  {fixedDate && (
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                      {fixedEndDate && fixedEndDate !== fixedDate
                        ? `${fixedDate} – ${fixedEndDate}`
                        : 'Single day — tap another day to make it a range'}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="date"
                    value={fixedDate}
                    min={minFixedDate}
                    onChange={(e) => setFixedDate(e.target.value)}
                    className={selectClass}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Start time</label>
                      <select
                        value={fixedTime}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setFixedTime(newStart);
                          const opts = enumDurationEndTimeOptions(newStart);
                          if (!opts.some((o) => o.value === fixedEndTime)) {
                            setFixedEndTime(opts.find((o) => o.minutes === 60)?.value ?? opts[0]?.value ?? newStart);
                          }
                        }}
                        className={selectClass}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{formatTimeLabel(t)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">End time</label>
                      <select value={fixedEndTime} onChange={(e) => setFixedEndTime(e.target.value)} className={selectClass}>
                        {enumDurationEndTimeOptions(fixedTime).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className={!isFixed && !event.all_day ? 'grid grid-cols-2 gap-3' : ''}>
            {!isFixed && !event.all_day && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Duration needed</label>
                <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className={selectClass}>
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Respond by</label>
              <input type="date" value={responseDeadline} min={minDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className={selectClass} />
            </div>
          </div>

          {/* Max participants */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Max participants
              <span className="text-faint font-normal ml-1">(optional)</span>
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder="No limit"
              min={2}
              max={1000}
              className={inputClass}
            />
            {maxParticipants && parseInt(maxParticipants, 10) > 0 && (
              <p className="text-xs text-faint mt-1">
                Limits this event to {maxParticipants} participant{parseInt(maxParticipants, 10) !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Min responses — availability events only */}
          {event.event_type !== 'fixed' && (
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Responses needed to pick a time
                <span className="text-faint font-normal ml-1">(including yours, optional)</span>
              </label>
              {!minResponsesCustom ? (
                <select
                  value={minResponses}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setMinResponsesCustom(true);
                      setMinResponses('');
                    } else {
                      setMinResponses(e.target.value);
                    }
                  }}
                  className={selectClass}
                >
                  <option value="">No minimum</option>
                  {Array.from({ length: 14 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>
                      {n} people
                    </option>
                  ))}
                  <option value="custom">Enter a number...</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minResponses}
                    onChange={(e) => setMinResponses(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="e.g. 25 (minimum 2)"
                    className={inputClass}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setMinResponsesCustom(false); setMinResponses(''); }}
                    className="shrink-0 px-3 py-2 text-xs text-faint hover:text-secondary border border-hairline rounded-xl transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
              {minResponses && parseInt(minResponses, 10) >= 2 && (
                <p className="text-xs text-faint mt-1">
                  The Pick a Time panel will wait until {minResponses} people have responded, including you.
                </p>
              )}
            </div>
          )}

          {/* Sequential block — all-day availability events only */}
          {event.event_type !== 'fixed' && event.all_day && (
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Require a consecutive block of days?
                <span className="text-faint font-normal ml-1">(for trips, optional)</span>
              </label>
              <select
                value={minBlockDays}
                onChange={(e) => setMinBlockDays(e.target.value)}
                className={selectClass}
              >
                <option value="">No — any overlapping days are fine</option>
                {[2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
                  <option key={n} value={n}>{n} days in a row</option>
                ))}
              </select>
              {minBlockDays && parseInt(minBlockDays, 10) >= 2 && (
                <p className="text-xs text-faint mt-1">
                  Only unbroken blocks of at least {minBlockDays} consecutive days that work for everyone are suggested.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || !organizerName.trim()}
            className="w-full py-3 bg-social-500 text-white font-semibold rounded-xl hover:bg-social-600 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Safe Delete Section */}
          <div className="border-t border-hairline-soft pt-4 mt-2">
            {deleteStep === 'idle' && (
              <button
                type="button"
                onClick={() => setDeleteStep('confirm')}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-[#30181F] rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Event
              </button>
            )}

            {deleteStep === 'confirm' && (
              <div className="animate-fade-in bg-red-50 dark:bg-[#30181F] rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">Are you sure?</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      This will permanently delete <strong>{event.name}</strong> and all participant responses. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep('typing')}
                    className="flex-1 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Yes, delete it
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep('idle')}
                    className="flex-1 py-2 bg-surface text-secondary text-sm font-medium rounded-xl border border-hairline hover:bg-subtle transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 'typing' && (
              <div className="animate-fade-in bg-red-50 dark:bg-[#30181F] rounded-xl p-4 space-y-3">
                <p className="text-sm text-red-800 dark:text-red-300">
                  Type <strong className="font-mono bg-red-100 dark:bg-[#30181F] px-1.5 py-0.5 rounded">{deleteConfirmRequired}</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder={deleteConfirmRequired}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-heading text-sm font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={deleteConfirmText !== deleteConfirmRequired || deleting}
                    className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteStep('idle'); setDeleteConfirmText(''); }}
                    className="flex-1 py-2 bg-surface text-secondary text-sm font-medium rounded-xl border border-hairline hover:bg-subtle transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
