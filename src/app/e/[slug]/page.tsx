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

  const { data: event } = await supabase
    .from('events')
    .select('name, description, organizer_name')
    .eq('slug', slug)
    .single();

  const siteName = settings.seo.site_name || 'Scheduler';

  if (!event) {
    return { title: `Event Not Found | ${siteName}` };
  }

  const title = `${event.name} | ${siteName}`;
  const description = event.description
    || `Tap your availability for "${event.name}"${event.organizer_name ? ` organized by ${event.organizer_name}` : ''}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName,
      ...(settings.seo.og_image ? { images: [{ url: settings.seo.og_image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      ...(settings.seo.og_image ? { images: [settings.seo.og_image] } : {}),
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

  return <EventView event={event} />;
}
