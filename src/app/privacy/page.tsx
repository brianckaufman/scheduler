import { getSettings } from '@/lib/settings';
import { notFound } from 'next/navigation';

export async function generateMetadata() {
  const settings = await getSettings();
  return {
    title: `Privacy Policy | ${settings.seo.site_name || 'Scheduler'}`,
    robots: { index: false },
  };
}

export default async function PrivacyPage() {
  const settings = await getSettings();
  const { legal } = settings;

  if (!legal?.show_privacy) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-teal-600 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </a>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

          {legal?.privacy_policy ? (
            <div
              className="prose prose-sm max-w-none text-gray-700
                [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-gray-900
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-gray-900
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul_li]:my-0.5
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol_li]:my-0.5
                [&_a]:text-teal-600 [&_a]:underline [&_a:hover]:text-teal-700
                [&_p]:my-2 [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: legal.privacy_policy }}
            />
          ) : (
            <p className="text-gray-400 italic">No privacy policy has been set yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
