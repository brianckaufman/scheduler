import { createBrowserClient } from '@supabase/ssr';

// Explicit singleton — ensures all hooks share one WebSocket connection
// for real-time subscriptions (avoids duplicate connections / missed events)
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
