'use client';

import { useState, type ReactNode } from 'react';
import { useCreatedEvents, getUserDisplayName } from '@/hooks/useCreatedEvents';
import { firstName } from '@/lib/names';
import ReturningUserBanner from './ReturningUserBanner';

interface HomeTabsProps {
  children: ReactNode; // The EventForm card
}

export default function HomeTabs({ children }: HomeTabsProps) {
  const createdEvents = useCreatedEvents();
  const { events, loaded } = createdEvents;
  const [activeTab, setActiveTab] = useState<'new' | 'events'>('new');

  // Don't show tabs if no events — just render the form directly
  const hasEvents = loaded && events.length > 0;

  if (!hasEvents) {
    return <>{children}</>;
  }

  const userName = getUserDisplayName();
  const greeting = userName
    ? `${firstName(userName)}'s Events`
    : 'Your Events';

  return (
    <div className="animate-fade-in">
      {/* Tab bar */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'new'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Event
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {greeting}
            <span className="ml-0.5 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-semibold rounded-full">
              {events.length}
            </span>
          </span>
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'new' ? (
        children
      ) : (
        <ReturningUserBanner createdEvents={createdEvents} />
      )}
    </div>
  );
}
