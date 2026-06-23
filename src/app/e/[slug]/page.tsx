import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/settings';
import { notFound } from 'next/navigation';
import EventView from './EventView';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps) {
  const { slug } = await params;

  const [supabase, settings] = await Promise.all([
    createClient(),
    getSettings(),
  ]);

  // select('*') tolerates a not-yet-run photo_url migration (vs. erroring on a
  // missing named column and breaking the page metadata).
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  const siteName = settings.seo.site_name || 'Scheduler';
  const siteUrl = settings.seo.site_url || process.env.NEXT_PUBLIC_SITE_URL || '';

  if (!event) {
    return { title: `Event Not Found | ${siteName}` };
  }

  const title = `${event.name} | ${siteName}`;
  const description = event.description
    || `You're invited to "${event.name}"${event.organizer_name ? ` — hosted by ${event.organizer_name}` : ''}. Tap the link to respond.`;
  const eventUrl = siteUrl ? `${siteUrl}/e/${slug}` : undefined;

  // Prefer the event's own hero photo (our cropper outputs 1200×455); fall back
  // to the site OG image (1200×630).
  const ogImage = event.photo_url
    ? { url: event.photo_url as string, width: 1200, height: 455, alt: title }
    : settings.seo.og_image
      ? { url: settings.seo.og_image, width: 1200, height: 630, alt: title }
      : null;

  return {
    title,
    description,
    ...(eventUrl ? { alternates: { canonical: eventUrl } } : {}),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      ...(eventUrl ? { url: eventUrl } : {}),
      title,
      description,
      siteName,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage.url, alt: title }] } : {}),
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!event) notFound();

  // Organizer's public profile (avatar) — adds a trust cue to the event header.
  let organizerAvatar: string | null = null;
  if (event.user_id) {
    const { data: prof } = await supabase
      .from('profiles').select('avatar_url').eq('id', event.user_id).maybeSingle();
    organizerAvatar = prof?.avatar_url ?? null;
  }

  return <EventView event={event} organizerAvatar={organizerAvatar} />;
}
