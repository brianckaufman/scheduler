'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ParticipantEntryProps {
  eventId: string;
  eventName: string;
  onJoin: (id: string, name: string) => void;
}

export default function ParticipantEntry({ eventId, eventName, onJoin }: ParticipantEntryProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('participants')
      .insert({ event_id: eventId, name: name.trim() })
      .select()
      .single();

    if (err || !data) {
      setError('Failed to join. Please try again.');
      setLoading(false);
      return;
    }

    onJoin(data.id, data.name);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{eventName}</h1>
          <p className="text-gray-500 text-sm">Enter your name to mark your availability</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-900 placeholder-gray-400"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 px-4 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  );
}
