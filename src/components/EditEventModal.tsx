'use client';

import { useState } from 'react';
import { format, addDays } from 'date-fns';
import type { Event } from '@/types';

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
}

export default function EditEventModal({ event, organizerToken, onClose, onSave }: EditEventModalProps) {
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description || '');
  const [organizerName, setOrganizerName] = useState(event.organizer_name || '');
  const [location, setLocation] = useState(event.location || '');
  const [durationMinutes, setDurationMinutes] = useState(event.duration_minutes);
  const [responseDeadline, setResponseDeadline] = useState(
    event.response_deadline ? format(new Date(event.response_deadline), 'yyyy-MM-dd') : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const minDeadline = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const handleSave = async () => {
    if (!name.trim() || !organizerName.trim()) {
      setError('Event name and your name are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizer_token: organizerToken,
          name: name.trim(),
          description: description.trim() || null,
          organizer_name: organizerName.trim(),
          location: location.trim() || null,
          duration_minutes: durationMinutes,
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className={inputClass} maxLength={500} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Your name</label>
              <input type="text" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)}
                className={inputClass} maxLength={50} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                className={inputClass} maxLength={100} placeholder="Optional" />
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

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || !organizerName.trim()}
            className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
