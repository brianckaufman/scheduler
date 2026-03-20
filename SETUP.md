# Deployment Setup

## 1. Supabase

Create a new Supabase project, then run these SQL files **in order** in the Supabase SQL Editor:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase-schema.sql` | Base tables: events, participants, availability_slots |
| 2 | `supabase-admin-migration.sql` | site_settings table for admin panel |
| 3 | `supabase-features-migration.sql` | max_participants, event deletion support |
| 4 | `supabase-storage-migration.sql` | Storage bucket for admin-uploaded images |
| 5 | `supabase-migration-push.sql` | Push notification subscriptions (optional) |

> **Note:** `supabase-migration-security.sql` is only needed if you ran the original schema *before* security constraints were added. Skip it for fresh installs — `supabase-schema.sql` already includes them.

After running the SQL, enable Realtime on two tables:
- Supabase Dashboard → Table Editor → `availability_slots` → Realtime: On
- Supabase Dashboard → Table Editor → `participants` → Realtime: On

## 2. Environment Variables

Copy `.env.example` to `.env.local` for local development. For Vercel, add each variable in:
**Project Settings → Environment Variables**

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From Supabase project settings (keep secret) |
| `ADMIN_PASSWORD` | Yes | Choose a strong password for `/admin` |
| `CRON_SECRET` | Yes | Any long random string — Vercel uses it to authenticate cron calls |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Your production domain (e.g. `https://wegather.you`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Only needed for push notifications |
| `VAPID_PRIVATE_KEY` | Optional | Only needed for push notifications |
| `VAPID_EMAIL` | Optional | Only needed for push notifications |

## 3. Vercel Deployment

1. Connect your GitHub repo to Vercel
2. Set all environment variables above in Project Settings
3. Deploy — the `vercel.json` cron job runs automatically at 3 AM UTC daily

## 4. After First Deploy

1. Visit `/admin` and sign in with your `ADMIN_PASSWORD`
2. Set your site name, URL, SEO description, and upload a logo/OG image
3. Configure monetization (Buy Me a Coffee URL) if desired
4. Share a test event link to verify the full flow end-to-end
