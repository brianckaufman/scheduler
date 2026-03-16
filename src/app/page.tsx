import EventForm from '@/components/EventForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Scheduler
          </h1>
          <p className="text-gray-500">
            Find a time that works for everyone. No accounts needed.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <EventForm />
        </div>

        {/* How it works */}
        <div className="mt-10 space-y-4">
          <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider">How it works</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-lg font-bold">1</div>
              <p className="text-xs text-gray-600 font-medium">Create an event</p>
              <p className="text-[10px] text-gray-400">Pick dates & time range</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-lg font-bold">2</div>
              <p className="text-xs text-gray-600 font-medium">Share the link</p>
              <p className="text-[10px] text-gray-400">Everyone taps availability</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-lg font-bold">3</div>
              <p className="text-xs text-gray-600 font-medium">Pick the best time</p>
              <p className="text-[10px] text-gray-400">See overlap instantly</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-[10px] text-gray-300">
          <p>Free forever. No sign-up. No spam.</p>
        </div>
      </div>
    </div>
  );
}
