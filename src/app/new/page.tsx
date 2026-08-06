import { Suspense } from 'react';
import type { Metadata } from 'next';
import CreateWizard from '@/components/create/CreateWizard';
import { getSettings } from '@/lib/settings';
import { createClient } from '@/lib/supabase/server';
import { notificationsEnabledForUser } from '@/lib/notifyGate';

export const metadata: Metadata = {
  title: 'Create an event',
};

export default async function NewEventPage() {
  const [settings, supabase] = await Promise.all([getSettings(), createClient()]);

  // No event exists yet at this point, so the gate keys off the signed-in
  // user instead of the event's organizer email.
  const { data: { user } } = await supabase.auth.getUser();
  const notificationsOn = notificationsEnabledForUser(settings, user?.email);

  return (
    <Suspense>
      <CreateWizard
        enableFixedEvents={settings.app.enable_fixed_events !== false}
        notificationsEnabled={notificationsOn}
      />
    </Suspense>
  );
}
