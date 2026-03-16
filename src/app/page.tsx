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
      </div>
    </div>
  );
}
