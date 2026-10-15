# Supabase auth email templates

Supabase's auth emails (confirm signup, reset password, magic link…) are stored
**in the Supabase dashboard, not in this repo** — nothing here deploys them.
These files are the source of truth so they can be diffed and re-pasted if the
dashboard copy is ever lost or overwritten.

Paste into: **Authentication → Emails → Templates**, one per template.

| File | Dashboard template |
|---|---|
| `confirm-signup.html` | Confirm sign up |
| `invite-user.html` | Invite user |
| `magic-link.html` | Magic link or OTP |
| `change-email.html` | Change email address |
| `reset-password.html` | Reset password |
| `reauthentication.html` | Reauthentication |

## Why they exist

The stock Supabase templates are three unstyled lines wrapping a bare
`supabase.co` link. That combination — no branding plus a link whose domain
doesn't match the sender — reads as phishing to spam filters, and the first
real send landed in Gmail's spam folder.

These mirror the branded shell in `src/lib/email.ts` (gradient header, 480px
card, muted footer) so auth mail matches the rest of the product. Each one
also states *why* the recipient got it and that ignoring it is safe, which is
both honest and what filters expect from legitimate transactional mail.

One deliberate difference from `shell()`: the header carries a solid
`background-color` behind the gradient, because Outlook drops `linear-gradient`
and would otherwise render a bare white band.

## Template variables

Go template syntax — **not** the `{{var}}` style used by `src/lib/email.ts`:

- `{{ .ConfirmationURL }}` — the action link
- `{{ .Token }}` — 6-digit code (reauthentication / OTP)
- `{{ .Email }}` / `{{ .NewEmail }}` — change-email only

## Still outstanding

The links still point at `<project-ref>.supabase.co`, which does not match the
`noreply@wegather.you` sender. Branding reduces the spam signal; it does not
remove it. The real fix is Supabase's custom auth domain add-on (~$10/mo),
pointing `auth.wegather.you` at the project so link and sender align.
