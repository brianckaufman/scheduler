import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import ProfileEditor from '@/components/account/ProfileEditor';
import RemoveSavedButton from '@/components/account/RemoveSavedButton';
import AvatarUpload from '@/components/account/AvatarUpload';
import ThemeSetting from '@/components/account/ThemeSetting';
import BrandKitEditor from '@/components/account/BrandKitEditor';

export const dynamic = 'force-dynamic';

interface EventLite {
  id: string;
  slug: string;
  name: string;
  event_type: string;
  finalized_time: string | null;
  user_id?: string | null;
}

function statusLabel(e: EventLite): string {
  if (e.finalized_time) return format(new Date(e.finalized_time), 'EEE MMM d, h:mm a');
  return e.event_type === 'fixed' ? 'Awaiting RSVPs' : 'Collecting availability';
}

function EventRow({ e, action }: { e: EventLite; action?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline-soft last:border-0">
      <Link href={`/e/${e.slug}`} className="min-w-0 flex-1 group">
        <p className="text-sm font-medium text-heading truncate group-hover:text-accent-fg transition-colors">{e.name}</p>
        <p className="text-xs text-muted">{statusLabel(e)}</p>
      </Link>
      {action}
    </li>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children?: React.ReactNode }) {
  return (
    <section className="bg-surface rounded-2xl border border-hairline-soft overflow-hidden">
      <h2 className="text-sm font-semibold text-heading px-4 py-3 border-b border-hairline-soft">
        {title} {count > 0 && <span className="text-faint font-normal">({count})</span>}
      </h2>
      {count === 0 ? <p className="px-4 py-6 text-sm text-muted text-center">{empty}</p> : <ul>{children}</ul>}
    </section>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account');

  const meta = user.user_metadata || {};

  const [{ data: profile }, { data: created }, { data: joinedRaw }, { data: savedRaw }] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('events')
      .select('id, slug, name, event_type, finalized_time, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('participants')
      .select('event_id, events(id, slug, name, event_type, finalized_time, user_id)')
      .eq('user_id', user.id),
    supabase.from('saved_events')
      .select('event_id, created_at, events(id, slug, name, event_type, finalized_time)')
      .order('created_at', { ascending: false }),
  ]);

  const createdEvents: EventLite[] = (created ?? []) as EventLite[];

  // Joined events: dedupe, and drop ones the user created (shown above).
  // Supabase types a to-one embed as an array; at runtime it's a single object.
  const seen = new Set<string>();
  const joinedEvents: EventLite[] = [];
  for (const row of (joinedRaw ?? []) as unknown as { events: EventLite | null }[]) {
    const ev = row.events;
    if (!ev || ev.user_id === user.id || seen.has(ev.id)) continue;
    seen.add(ev.id);
    joinedEvents.push(ev);
  }

  const savedEvents: EventLite[] = ((savedRaw ?? []) as unknown as { events: EventLite | null }[])
    .map((r) => r.events)
    .filter((e): e is EventLite => !!e);

  const displayName = profile?.display_name || meta.display_name || meta.full_name || meta.name || '';
  const avatarUrl = profile?.avatar_url || meta.avatar_url || meta.picture || null;

  return (
    <div className="min-h-screen bg-subtle">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-heading">Your account</h1>
          <Link href="/" className="text-sm text-accent-fg font-medium hover:underline">Create event</Link>
        </div>

        <section className="bg-surface rounded-2xl border border-hairline-soft p-4 space-y-4">
          <AvatarUpload initialUrl={avatarUrl} name={displayName || user.email || 'You'} />
          <ProfileEditor initial={displayName} />
          <ThemeSetting />
          <p className="text-xs text-faint pt-1 border-t border-hairline-soft">
            Signed in as <span className="text-muted">{user.email}</span>
          </p>
        </section>

        <section className="bg-surface rounded-2xl border border-hairline-soft p-4 space-y-4">
          <h2 className="text-sm font-semibold text-heading">Brand kit</h2>
          <BrandKitEditor />
        </section>

        <Section title="Events you created" count={createdEvents.length}
          empty="You haven't created any events yet.">
          {createdEvents.map((e) => <EventRow key={e.id} e={e} />)}
        </Section>

        <Section title="Events you joined" count={joinedEvents.length}
          empty="You haven't responded to any events yet.">
          {joinedEvents.map((e) => <EventRow key={e.id} e={e} />)}
        </Section>

        <Section title="Saved events" count={savedEvents.length}
          empty="Save an event from its page to find it here later.">
          {savedEvents.map((e) => <EventRow key={e.id} e={e} action={<RemoveSavedButton eventId={e.id} />} />)}
        </Section>
      </div>
    </div>
  );
}
