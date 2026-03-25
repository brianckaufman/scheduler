import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

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
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const [
      eventsAll,
      eventsRecent30Count,
      eventsRecent7Count,
      participantsAll,
      slotsCount,
      recentEventsList,
    ] = await Promise.all([
      // All events with all needed columns for aggregation
      supabase
        .from('events')
        .select('id, event_type, finalized_time, created_at, timezone, description, body, location, response_deadline, max_participants, organizer_name, organizer_email, device_type')
        .order('created_at', { ascending: false }),

      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo),

      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo),

      supabase
        .from('participants')
        .select('id, event_id, rsvp, created_at, device_type')
        .order('created_at', { ascending: false }),

      supabase
        .from('availability_slots')
        .select('id', { count: 'exact', head: true }),

      supabase
        .from('events')
        .select('id, name, slug, event_type, finalized_time, created_at, organizer_name, organizer_email, timezone, location, device_type')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const allEvents = eventsAll.data ?? [];
    const allParticipants = participantsAll.data ?? [];
    const totalEvents = allEvents.length;

    // ── Participant map ──────────────────────────────────────────────────────
    const participantsByEvent = new Map<string, number>();
    for (const p of allParticipants) {
      participantsByEvent.set(p.event_id, (participantsByEvent.get(p.event_id) ?? 0) + 1);
    }

    const totalParticipants = allParticipants.length;
    const eventsWithParticipants = [...participantsByEvent.keys()].length;
    const avgParticipants = eventsWithParticipants > 0
      ? Math.round((totalParticipants / eventsWithParticipants) * 10) / 10
      : 0;

    // ── Funnel ───────────────────────────────────────────────────────────────
    const eventsWithAnyParticipant = allEvents.filter(e => (participantsByEvent.get(e.id) ?? 0) >= 1).length;
    const finalizedEvents = allEvents.filter(e => e.finalized_time).length;

    const funnel = {
      created: totalEvents,
      participated: eventsWithAnyParticipant,
      participatedPct: totalEvents > 0 ? Math.round((eventsWithAnyParticipant / totalEvents) * 100) : 0,
      finalized: finalizedEvents,
      // finalization rate among events that got at least 1 participant
      finalizedOfParticipated: eventsWithAnyParticipant > 0
        ? Math.round((finalizedEvents / eventsWithAnyParticipant) * 100)
        : 0,
      finalizedOfTotal: totalEvents > 0 ? Math.round((finalizedEvents / totalEvents) * 100) : 0,
    };

    // ── Group size distribution ──────────────────────────────────────────────
    const buckets = { 0: 0, 1: 0, '2-3': 0, '4-6': 0, '7-10': 0, '11+': 0 };
    for (const e of allEvents) {
      const n = participantsByEvent.get(e.id) ?? 0;
      if (n === 0) buckets[0]++;
      else if (n === 1) buckets[1]++;
      else if (n <= 3) buckets['2-3']++;
      else if (n <= 6) buckets['4-6']++;
      else if (n <= 10) buckets['7-10']++;
      else buckets['11+']++;
    }
    const groupSizeDistribution = Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count,
      pct: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
    }));

    // ── Abandonment (events > 48h old with 0 participants) ───────────────────
    const eligibleEvents = allEvents.filter(e => e.created_at < fortyEightHoursAgo);
    const abandonedEvents = eligibleEvents.filter(e => (participantsByEvent.get(e.id) ?? 0) === 0).length;
    const abandonment = {
      abandoned: abandonedEvents,
      eligible: eligibleEvents.length,
      rate: eligibleEvents.length > 0 ? Math.round((abandonedEvents / eligibleEvents.length) * 100) : 0,
    };

    // ── Median time to finalization (hours) ──────────────────────────────────
    const finalizationHours = allEvents
      .filter(e => e.finalized_time && e.created_at)
      .map(e => (new Date(e.finalized_time!).getTime() - new Date(e.created_at).getTime()) / (1000 * 60 * 60))
      .filter(h => h >= 0)
      .sort((a, b) => a - b);

    const finalizationTime = {
      median: Math.round(median(finalizationHours) * 10) / 10,
      p25: Math.round(percentile(finalizationHours, 25) * 10) / 10,
      p75: Math.round(percentile(finalizationHours, 75) * 10) / 10,
      count: finalizationHours.length,
    };

    // ── Feature adoption ─────────────────────────────────────────────────────
    const feat = (fn: (e: typeof allEvents[0]) => boolean) => {
      const count = allEvents.filter(fn).length;
      return { count, pct: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0 };
    };
    const featureAdoption = {
      location:       feat(e => !!e.location),
      description:    feat(e => !!e.description),
      richText:       feat(e => !!e.body),
      deadline:       feat(e => !!e.response_deadline),
      maxParticipants: feat(e => !!e.max_participants),
      email:          feat(e => !!e.organizer_email),
    };

    // ── Device breakdown ─────────────────────────────────────────────────────
    // Combine participant device_type (more data points) + event organizer device
    const allDevices = [
      ...allParticipants.map(p => p.device_type),
      ...allEvents.map(e => e.device_type),
    ].filter(Boolean);
    const deviceMobile = allDevices.filter(d => d === 'mobile').length;
    const deviceDesktop = allDevices.filter(d => d === 'desktop').length;
    const deviceTotal = deviceMobile + deviceDesktop;
    const deviceBreakdown = {
      mobile: deviceMobile,
      desktop: deviceDesktop,
      unknown: allDevices.filter(d => d === 'unknown').length,
      hasData: deviceTotal > 0,
      mobilePct: deviceTotal > 0 ? Math.round((deviceMobile / deviceTotal) * 100) : 0,
      desktopPct: deviceTotal > 0 ? Math.round((deviceDesktop / deviceTotal) * 100) : 0,
    };

    // ── Repeat organizer rate (approximate via organizer_name) ───────────────
    const nameCounts = new Map<string, number>();
    for (const e of allEvents) {
      if (e.organizer_name) {
        const k = e.organizer_name.toLowerCase().trim();
        nameCounts.set(k, (nameCounts.get(k) ?? 0) + 1);
      }
    }
    const returningNames = [...nameCounts.values()].filter(n => n >= 2).length;
    const namedOrganizers = nameCounts.size;
    const repeatOrganizers = {
      returning: returningNames,
      total: namedOrganizers,
      rate: namedOrganizers > 0 ? Math.round((returningNames / namedOrganizers) * 100) : 0,
    };

    // ── Event type breakdown ─────────────────────────────────────────────────
    const fixedEvents = allEvents.filter(e => e.event_type === 'fixed').length;
    const availEvents = allEvents.filter(e => e.event_type === 'availability').length;

    // ── RSVP breakdown ───────────────────────────────────────────────────────
    const rsvpYes   = allParticipants.filter(p => p.rsvp === 'yes').length;
    const rsvpMaybe = allParticipants.filter(p => p.rsvp === 'maybe').length;
    const rsvpNo    = allParticipants.filter(p => p.rsvp === 'no').length;

    // ── Daily activity (last 30 days) ────────────────────────────────────────
    const dailyMap = new Map<string, { events: number; participants: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyMap.set(d.toISOString().slice(0, 10), { events: 0, participants: 0 });
    }
    for (const e of allEvents) {
      const key = e.created_at.slice(0, 10);
      if (dailyMap.has(key)) dailyMap.get(key)!.events += 1;
    }
    for (const p of allParticipants) {
      const key = p.created_at.slice(0, 10);
      if (dailyMap.has(key)) dailyMap.get(key)!.participants += 1;
    }
    const dailyActivity = [...dailyMap.entries()].map(([date, c]) => ({ date, ...c }));

    // ── Recent events list ───────────────────────────────────────────────────
    const recentEvents = (recentEventsList.data ?? []).map(e => ({
      ...e,
      participant_count: participantsByEvent.get(e.id) ?? 0,
    }));

    // ── Timezone distribution (top 5) ────────────────────────────────────────
    const tzCounts = new Map<string, number>();
    for (const e of allEvents) {
      if (e.timezone) tzCounts.set(e.timezone, (tzCounts.get(e.timezone) ?? 0) + 1);
    }
    const topTimezones = [...tzCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tz, count]) => ({ tz, count, pct: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0 }));

    return NextResponse.json({
      summary: {
        totalEvents,
        fixedEvents,
        availEvents,
        events7d:  eventsRecent7Count.count  ?? 0,
        events30d: eventsRecent30Count.count ?? 0,
        totalParticipants,
        avgParticipants,
        totalSlots: slotsCount.count ?? 0,
        rsvpYes, rsvpMaybe, rsvpNo,
        rsvpTotal: rsvpYes + rsvpMaybe + rsvpNo,
      },
      funnel,
      groupSizeDistribution,
      abandonment,
      finalizationTime,
      featureAdoption,
      deviceBreakdown,
      repeatOrganizers,
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
