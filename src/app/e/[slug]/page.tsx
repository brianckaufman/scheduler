import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EventView from './EventView';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from('events')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: event ? `${event.name} | Scheduler` : 'Event Not Found',
    description: event
      ? `Tap your availability for "${event.name}"`
      : undefined,
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
