import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()];}));
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

async function testCols(table, cols) {
  for (const c of cols) {
    const { error } = await sb.from(table).select(c).limit(1);
    console.log(`${table}.${c.padEnd(18)} ${error ? 'MISSING  ('+error.message.slice(0,60)+')' : 'OK'}`);
  }
}
console.log('=== column existence probe ===');
await testCols('events', ['id','event_type','finalized_time','created_at','timezone','description','body','location','response_deadline','max_participants','organizer_name','organizer_email','device_type','min_responses','all_day','finalized_end_date','min_block_days']);
await testCols('participants', ['id','event_id','name','created_at','rsvp','device_type']);
const { count: ev } = await sb.from('events').select('id',{count:'exact',head:true});
const { count: pt } = await sb.from('participants').select('id',{count:'exact',head:true});
const { count: sl } = await sb.from('availability_slots').select('id',{count:'exact',head:true});
console.log(`\n=== row counts ===\nevents=${ev}  participants=${pt}  slots=${sl}`);
// Reproduce the ORIGINAL failing query:
const orig = await sb.from('events').select('id, event_type, organizer_email, device_type').limit(1);
console.log(`\noriginal events select (with organizer_email,device_type): ${orig.error ? 'FAILS → '+orig.error.message.slice(0,70) : 'ok'}`);
