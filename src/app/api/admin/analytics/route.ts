import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString();

    // ── Parallel queries ────────────────────────────────────────────────────

    const [
      eventsAll,
      eventsRecent30,
      eventsRecent7,
      participantsAll,
      slotsAll,
      pushSubs,
      recentEventsList,
    ] = await Promise.all([
      // All events (light columns for aggregation)
      supabase
        .from('events')
        .select('id, event_type, finalized_time, created_at, timezone')
        .order('created_at', { ascending: false }),

      // Events in last 30 days
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo),

      // Events in last 7 days
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo),

      // All participants
      supabase
        .from('participants')
        .select('id, event_id, rsvp, created_at')
        .order('created_at', { ascending: false }),

      // All availability slots (count only)
      supabase
        .from('availability_slots')
        .select('id', { count: 'exact', head: true }),

      // Push subscriptions
      supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true }),

      // Recent events for the list view (with more detail)
      supabase
        .from('events')
        .select('id, name, slug, event_type, finalized_time, created_at, organizer_name, timezone, location')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const allEvents      = eventsAll.data    ?? [];
    const allParticipants = participantsAll.data ?? [];

    // ── Aggregate: events ───────────────────────────────────────────────────

    const totalEvents       = allEvents.length;
    const fixedEvents       = allEvents.filter((e) => e.event_type === 'fixed').length;
    const availEvents       = allEvents.filter((e) => e.event_type === 'availability').length;
    const finalizedEvents   = allEvents.filter((e) => e.finalized_time).length;
    const finalizedPercent  = totalEvents > 0 ? Math.round((finalizedEvents / totalEvents) * 100) : 0;

    // ── Aggregate: participants ─────────────────────────────────────────────

    const totalParticipants = allParticipants.length;

    // Average participants per event
    const participantsByEvent = new Map<string, number>();
    for (const p of allParticipants) {
      participantsByEvent.set(p.event_id, (participantsByEvent.get(p.event_id) ?? 0) + 1);
    }
    const eventIds = [...participantsByEvent.keys()];
    const avgParticipants = eventIds.length > 0
      ? Math.round((totalParticipants / eventIds.length) * 10) / 10
      : 0;

    // RSVP breakdown (fixed events only)
    const rsvpYes   = allParticipants.filter((p) => p.rsvp === 'yes').length;
    const rsvpMaybe = allParticipants.filter((p) => p.rsvp === 'maybe').length;
    const rsvpNo    = allParticipants.filter((p) => p.rsvp === 'no').length;
    const rsvpTotal = rsvpYes + rsvpMaybe + rsvpNo;

    // ── Daily breakdown: last 30 days ───────────────────────────────────────

    // Build a map of YYYY-MM-DD → {events, participants}
    const dailyMap = new Map<string, { events: number; participants: number }>();

    // Seed all 30 days with zeros so the chart has no gaps
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { events: 0, participants: 0 });
    }

    for (const e of allEvents) {
      const key = e.created_at.slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.events += 1;
      }
    }

    for (const p of allParticipants) {
      const key = p.created_at.slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.participants += 1;
      }
    }

    const dailyActivity = [...dailyMap.entries()].map(([date, counts]) => ({
      date,
      events: counts.events,
      participants: counts.participants,
    }));

    // ── Recent events with participant counts ────────────────────────────────

    const recentEvents = (recentEventsList.data ?? []).map((e) => ({
      ...e,
      participant_count: participantsByEvent.get(e.id) ?? 0,
    }));

    // ── Timezone distribution (top 5) ───────────────────────────────────────

    const tzCounts = new Map<string, number>();
    for (const e of allEvents) {
      if (e.timezone) {
        tzCounts.set(e.timezone, (tzCounts.get(e.timezone) ?? 0) + 1);
      }
    }
    const topTimezones = [...tzCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tz, count]) => ({ tz, count }));

    // ── Response ────────────────────────────────────────────────────────────

    return NextResponse.json({
      summary: {
        totalEvents,
        fixedEvents,
        availEvents,
        finalizedEvents,
        finalizedPercent,
        events7d:  eventsRecent7.count  ?? 0,
        events30d: eventsRecent30.count ?? 0,
        totalParticipants,
        avgParticipants,
        totalSlots:  slotsAll.count  ?? 0,
        totalPushSubs: pushSubs.count ?? 0,
        rsvpYes,
        rsvpMaybe,
        rsvpNo,
        rsvpTotal,
      },
      dailyActivity,
      recentEvents,
      topTimezones,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
