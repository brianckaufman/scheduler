'use client';

import { useState, lazy, Suspense } from 'react';
import { format, addDays } from 'date-fns';
import type { Event } from '@/types';
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
import LocationInput from '@/components/LocationInput';

const DURATION_OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hr' },
  { value: 90, label: '1.5 hr' },
  { value: 120, label: '2 hr' },
  { value: 180, label: '3 hr' },
  { value: 240, label: '4 hr' },
];

interface EditEventModalProps {
  event: Event;
  organizerToken: string;
  onClose: () => void;
  onSave: (updated: Event) => void;
  onDelete: () => void;
}

type DeleteStep = 'idle' | 'confirm' | 'typing';

export default function EditEventModal({ event, organizerToken, onClose, onSave, onDelete }: EditEventModalProps) {
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description || '');
  const [body, setBody] = useState(event.body || '');
  const [organizerName, setOrganizerName] = useState(event.organizer_name || '');
  const [location, setLocation] = useState(event.location || '');
  const [durationMinutes, setDurationMinutes] = useState(event.duration_minutes);
  const [maxParticipants, setMaxParticipants] = useState<string>(
    event.max_participants ? String(event.max_participants) : ''
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
  const deleteConfirmRequired = 'DELETE';

  const handleSave = async () => {
    if (!name.trim() || !organizerName.trim()) {
      setError('Event name and your name are required');
      return;
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
          description: description.trim() || null,
          body: body.trim() || null,
          organizer_name: organizerName.trim(),
          location: location.trim() || null,
          duration_minutes: durationMinutes,
          max_participants: maxP,
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

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-900 text-sm";
  const selectClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-900 bg-white text-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">Edit Event</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Event name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={inputClass} maxLength={100} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Short description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className={inputClass} maxLength={500} placeholder="Optional — shown as a subtitle" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Full details{' '}
              <span className="text-gray-400 font-normal">(optional — hidden behind "Read more")</span>
            </label>
            <Suspense fallback={<div className="h-28 rounded-xl border border-gray-300 bg-gray-50 animate-pulse" />}>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Agenda, directions, what to bring, dress code…"
                minHeight={90}

              />
            </Suspense>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Your name</label>
              <input type="text" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)}
                className={inputClass} maxLength={50} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <LocationInput value={location} onChange={setLocation} inputClassName={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration needed</label>
              <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className={selectClass}>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Respond by</label>
              <input type="date" value={responseDeadline} min={minDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className={selectClass} />
            </div>
          </div>

          {/* Max participants */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Max participants
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
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
              <p className="text-xs text-gray-400 mt-1">
                Limits this event to {maxParticipants} participant{parseInt(maxParticipants, 10) !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || !organizerName.trim()}
            className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Safe Delete Section */}
          <div className="border-t border-gray-100 pt-4 mt-2">
            {deleteStep === 'idle' && (
              <button
                type="button"
                onClick={() => setDeleteStep('confirm')}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Event
              </button>
            )}

            {deleteStep === 'confirm' && (
              <div className="animate-fade-in bg-red-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                    <p className="text-xs text-red-600 mt-1">
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
                    className="flex-1 py-2 bg-white text-gray-600 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 'typing' && (
              <div className="animate-fade-in bg-red-50 rounded-xl p-4 space-y-3">
                <p className="text-sm text-red-800">
                  Type <strong className="font-mono bg-red-100 px-1.5 py-0.5 rounded">{deleteConfirmRequired}</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder={deleteConfirmRequired}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-gray-900 text-sm font-mono"
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
                    className="flex-1 py-2 bg-white text-gray-600 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
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
