# The Newsroom — one-time setup

These are the manual steps (dashboard-only, no CLI equivalent) to bring the app
online. Do them once.

## 1. Environment variables

Create `.env.local` in this directory (`solutions/newsroom/web/`) with:

```
# Anthropic (desks + editorial board)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase — Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only; used by the cron

# Scheduled editions
CRON_SECRET=<long-random-string>

# Public site
NEXT_PUBLIC_SITE_URL=https://newsroom.brightpathtechnology.io

# Email distribution to subscribers (Zoho SMTP) — optional; the app runs
# without it (Send button reports "email not configured"). To enable:
ZOHO_SMTP_USER=newsroom@brightpathtechnology.io   # the sending mailbox
ZOHO_SMTP_PASS=<app-specific-password>            # Zoho → Settings → Security → App Passwords
EMAIL_FROM=The Newsroom <newsroom@brightpathtechnology.io>  # optional; defaults to ZOHO_SMTP_USER
ZOHO_SMTP_HOST=smtp.zoho.com                      # optional (use smtp.zoho.com.au / .eu / .in for that DC)
```

> **Zoho note:** generate an **app-specific password** (not your login password)
> under Zoho Mail → Settings → Security → App Passwords, and make sure the
> sending address is a verified Zoho mailbox/domain. Sending is always
> human-triggered per edition (the "Send to subscribers" button) — never an
> auto-blast. For larger lists, Zoho ZeptoMail (transactional API) is an
> alternative; swap the transport in `lib/email.ts`.

Set the same variables in the Vercel project (Settings → Environment Variables).
Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to cron routes,
which `/api/cron/editions` verifies.

## 2. Supabase project

1. Create a Supabase project (or reuse one).
2. SQL Editor → run `supabase/migrations/0001_init.sql`. This creates the
   schema, enables RLS, and adds the ownership policies.
3. Authentication → Providers → enable **Email** (magic link). Add the site URL
   and `https://newsroom.brightpathtechnology.io/auth/callback` (plus
   `http://localhost:3000/auth/callback` for local dev) to the redirect allow-list.

> Can be done via the Supabase MCP `apply_migration` tool instead of the SQL
> editor if you prefer — the migration file is idempotent.

## 3. Vercel project (subdomain)

This is a **separate Vercel project** from `personal-board-of-directors`, pointed
at the same repo:

1. New Project → import the persona-x repo.
2. **Root Directory: `solutions/newsroom/web`** (so this app builds independently
   and `vercel.json`'s crons are picked up).
3. Framework preset: Next.js (auto). Leave build/install at defaults.
4. Add the environment variables from step 1.
5. Deploy. Then add the domain `newsroom.brightpathtechnology.io`
   (Project → Settings → Domains). This ties into the pending Netlify DNS
   migration — add a CNAME `newsroom → cname.vercel-dns.com` in whichever zone is
   authoritative at cutover.

## 4. First run

1. Visit the site → magic-link sign-in.
2. Found a newsroom (two starter desks are seeded).
3. From **The Newsroom**, click **File now** on a desk → it researches the live
   web and files to **The Wire**.
4. On **The Wire**, spike the noise, then **Assemble edition**.
5. Open the edition → **Convene the board** (persona-x review) → **Sign off &
   publish**.
6. On **Editions**, toggle the newsroom public to expose `/read/<slug>` + RSS.

## Cron schedule

`vercel.json` fires `/api/cron/editions` three times daily (UTC): 08:00, 20:00,
02:00 — adjust to your local print cycle. Vercel crons run in UTC.
