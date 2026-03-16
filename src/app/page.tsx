import EventForm from '@/components/EventForm';
import { getSettings } from '@/lib/settings';

export default async function Home() {
  const settings = await getSettings();
  const { copy: { home } } = settings;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-6">
          {settings.branding.logo_url && (
            <div className="mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.branding.logo_url}
                alt={settings.seo.site_name || 'Logo'}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {home.title}
          </h1>
          <p className="text-gray-500">
            {home.subtitle}
          </p>
        </div>

        {/* How it works */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1.5">
              <div className="mx-auto w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-base font-bold">1</div>
              <p className="text-xs text-gray-700 font-medium">{home.step1_title}</p>
              <p className="text-[10px] text-gray-400">{home.step1_desc}</p>
            </div>
            <div className="space-y-1.5">
              <div className="mx-auto w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-base font-bold">2</div>
              <p className="text-xs text-gray-700 font-medium">{home.step2_title}</p>
              <p className="text-[10px] text-gray-400">{home.step2_desc}</p>
            </div>
            <div className="space-y-1.5">
              <div className="mx-auto w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-base font-bold">3</div>
              <p className="text-xs text-gray-700 font-medium">{home.step3_title}</p>
              <p className="text-[10px] text-gray-400">{home.step3_desc}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <EventForm />
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-[10px] text-gray-300">
          <p>{home.footer}</p>
        </div>
      </div>
    </div>
  );
}
