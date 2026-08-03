import { Suspense } from 'react';
import type { Metadata } from 'next';
import CreateWizard from '@/components/create/CreateWizard';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Create an event',
};

export default async function NewEventPage() {
  const settings = await getSettings();

  return (
    <Suspense>
      <CreateWizard enableFixedEvents={settings.app.enable_fixed_events !== false} />
    </Suspense>
  );
}
