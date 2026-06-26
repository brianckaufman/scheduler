'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useCreatedEvents, getUserDisplayName } from '@/hooks/useCreatedEvents';
import { useRespondedEvents } from '@/hooks/useRespondedEvents';
import { firstName } from '@/lib/names';
import ReturningUserBanner from './ReturningUserBanner';
import RespondedEventsBanner from './RespondedEventsBanner';

interface HomeTabsProps {
  children: ReactNode; // The EventForm card
}

export default function HomeTabs({ children }: HomeTabsProps) {
  const createdEvents = useCreatedEvents();
  const respondedEvents = useRespondedEvents();
  const { events, loaded } = createdEvents;
  const { events: joined, loaded: joinedLoaded } = respondedEvents;
  const [activeTab, setActiveTab] = useState<'new' | 'events' | 'joined'>('new');
  const [creating, setCreating] = useState(false);

  // EventForm announces when the user has picked a type (begins creating) so we
  // can hide the tab bar and let them focus on building the event.
  useEffect(() => {
    const onCreating = (e: Event) => setCreating((e as CustomEvent<boolean>).detail);
    window.addEventListener('eventform-creating', onCreating);
    return () => window.removeEventListener('eventform-creating', onCreating);
  }, []);

  // Don't show tabs until something exists to list — just render the form.
  const hasCreated = loaded && events.length > 0;
  const hasJoined = joinedLoaded && joined.length > 0;

  if (!hasCreated && !hasJoined) {
    return <>{children}</>;
  }

  const userName = getUserDisplayName();
  const greeting = userName
    ? `${firstName(userName)}'s Events`
    : 'Your Events';

  const tabClass = (active: boolean) =>
    `flex-1 min-w-0 py-2 px-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
      active ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'
    }`;
  const countBadge = (n: number) => (
    <span className="ml-0.5 px-1.5 py-0.5 bg-fill2 text-secondary text-[10px] font-semibold rounded-full shrink-0">
      {n}
    </span>
  );

  return (
    // relative z-20 keeps open row menus (Pin / Duplicate) above the later
    // "See a live example" section, which otherwise paints over them.
    <div className="animate-fade-in relative z-20">
      {/* Tab bar — hidden once the user begins creating an event */}
      {!creating && (
      <div className="flex bg-fill rounded-xl p-1 mb-4 gap-0.5">
        <button type="button" onClick={() => setActiveTab('new')} className={tabClass(activeTab === 'new')}>
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="truncate">New</span>
          </span>
        </button>

        {hasCreated && (
          <button type="button" onClick={() => setActiveTab('events')} className={tabClass(activeTab === 'events')}>
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{greeting}</span>
              {countBadge(events.length)}
            </span>
          </button>
        )}

        {hasJoined && (
          <button type="button" onClick={() => setActiveTab('joined')} className={tabClass(activeTab === 'joined')}>
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">Joined</span>
              {countBadge(joined.length)}
            </span>
          </button>
        )}
      </div>
      )}

      {/* Tab content */}
      {activeTab === 'events' ? (
        <ReturningUserBanner createdEvents={createdEvents} />
      ) : activeTab === 'joined' ? (
        <RespondedEventsBanner respondedEvents={respondedEvents} />
      ) : (
        children
      )}
    </div>
  );
}
