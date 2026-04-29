# autoreplyr — Setup Guide

## 1. Supabase

1. Create a new Supabase project
2. Go to **SQL Editor** and run `supabase/migrations/001_schema.sql`
3. In **Authentication → Users**, create your admin user with the email you'll set as `ADMIN_EMAIL`
4. Copy your project URL, anon key, and service role key

## 2. Environment Variables

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
ADMIN_EMAIL=you@yourdomain.com
NEXT_PUBLIC_ADMIN_EMAIL=you@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-deployed-url.vercel.app
CRON_SECRET=generate-a-random-secret-here
```

## 3. Twilio

1. Create a Twilio account and buy a phone number for each client
2. For each number, set:
   - **Voice → Status Callback URL**: `https://your-worker.workers.dev/missed-call`
   - **Messaging → Webhook**: `https://your-worker.workers.dev/sms`
3. Set the call status callback to fire on `no-answer` and `busy`

## 4. Cloudflare Worker

```bash
cd worker
npm install
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler deploy
```

## 5. Deploy Next.js to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all env vars from `.env.local`
4. Vercel will automatically run the weekly report cron (Monday 8am UTC) via `vercel.json`

## 6. Onboard a Client (< 10 minutes)

1. Go to `/admin/clients/new`
2. Fill in business details, paste their Twilio number
3. Select industry — flow auto-generates
4. Click Create — auth user created, welcome email sent, system is live

## 7. Resend

1. Create a Resend account
2. Verify your sending domain
3. Update the `from` addresses in `src/lib/email.ts` to match your verified domain

---

## Architecture

```
Caller misses call
  → Twilio StatusCallback → Cloudflare Worker /missed-call
    → Lookup client by Twilio number
    → Create lead record
    → Send opening SMS

Caller replies
  → Twilio Webhook → Cloudflare Worker /sms
    → Log message, advance conversation
    → When complete: score intent
      HIGH → SMS owner + email alert
      MEDIUM → send booking link
      LOW → polite close

Every Monday 8am UTC
  → Vercel Cron → /api/cron/weekly-report
    → Email each active client's weekly summary
```
