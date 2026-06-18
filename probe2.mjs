import fs from 'fs';
console.log('start');
const raw = fs.readFileSync('.env.local','utf8');
const env = {};
for (const line of raw.split('\n')) {
  const i = line.indexOf('=');
  if (i>0 && !line.trim().startsWith('#')) env[line.slice(0,i).trim()] = line.slice(i+1).trim().replace(/^["']|["']$/g,'');
}
console.log('url present:', !!(env.NEXT_PUBLIC_SUPABASE_URL||env.SUPABASE_URL), 'service key len:', (env.SUPABASE_SERVICE_ROLE_KEY||'').length);
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL||env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const a = await sb.from('events').select('id, organizer_email, device_type').limit(1);
console.log('OLD query (organizer_email,device_type):', a.error ? 'FAILS: '+a.error.message : 'ok rows='+(a.data?.length));
const b = await sb.from('events').select('id, event_type, body, max_participants, organizer_name').limit(1);
console.log('NEW events query:', b.error ? 'FAILS: '+b.error.message : 'ok');
const c = await sb.from('participants').select('id, event_id, rsvp, created_at').limit(1);
console.log('NEW participants query:', c.error ? 'FAILS: '+c.error.message : 'ok');
const ev = await sb.from('events').select('id',{count:'exact',head:true});
const pt = await sb.from('participants').select('id',{count:'exact',head:true});
console.log('counts: events='+ev.count+' participants='+pt.count);
console.log('done');
