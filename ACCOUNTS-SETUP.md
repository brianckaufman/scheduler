# Optional accounts — setup guide

Accounts are powered by **Supabase Auth**. They're optional and non-blocking: anonymous event creation, RSVP, and pick-a-time all keep working. This guide covers the external setup (the code is already in place).

## 1. Run the migration
In **Supabase → SQL Editor**, run `supabase-accounts-migration.sql`. It creates:
- `profiles` (1:1 with auth users, auto-created on signup via trigger)
- `events.user_id` + `participants.user_id` (nullable — anonymous still works)
- `saved_events` (bookmarks) with row-level security

## 2. Enable auth providers
In **Supabase → Authentication → Providers**:
- **Email** — enable. (Confirmation email on by default = best practice.)
- **Google** — enable, then provide a Google OAuth client (next step).

## 3. Create the Google OAuth client
In **Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID** (Web application):
- **Authorized redirect URI:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
  (copy the exact value Supabase shows on the Google provider page)
- Copy the **Client ID** and **Client secret** into the Supabase Google provider settings and save.

## 4. Configure auth URLs in Supabase
In **Supabase → Authentication → URL Configuration**:
- **Site URL:** `https://wegather.you` (your production URL)
- **Redirect URLs:** add
  - `https://wegather.you/auth/callback`
  - `https://wegather.you/reset-password`
  - your Vercel preview pattern, e.g. `https://*.vercel.app/auth/callback` (optional, for previews)
  - `http://localhost:3000/auth/callback` (for local dev)

## 5. (Recommended) Send auth emails from your domain
Supabase's built-in email has low rate limits. In **Supabase → Authentication → Emails / SMTP**, point SMTP at Resend (or your provider) so confirmation + password-reset emails come from `tippingmedia.com`.

## 6. Environment variables (Vercel)
- `ADMIN_EMAILS=brian@tippingmedia.com` — comma-separated list of emails granted **super-admin**. Already in `.env.local`; add it in Vercel too.
- Existing `ADMIN_PASSWORD` stays as an emergency fallback for the admin panel.

## How super-admin works
- Log in with Google as `brian@tippingmedia.com` → you're allowlisted → `/admin` loads.
- The old password login at `/admin/login` still works as a fallback.
- Admin access is granted if **either** the password cookie is valid **or** the signed-in user's email is in `ADMIN_EMAILS`.

## What users get
- **Sign up / Log in** (Google or email + password), **Forgot/Reset password** — `/login`, `/signup`, `/forgot-password`.
- An **account menu** (top-right) and an **/account** page with: profile display name, events they created, events they joined, and saved events.
- A **Save** button on each event page (logged-in users only).
- Creating/joining while logged in links the event to the account automatically.

## Local testing
1. Run the migration on your Supabase project.
2. Enable Email provider (Google needs the OAuth client even for localhost).
3. `npm run build` / deploy, then visit `/signup`.
