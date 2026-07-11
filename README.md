# SST Connect

Mobile-web PWA for Scaler School of Technology students — public feed with
AI-categorized posts, friend requests, 1:1 chat, and an AI-powered
conversational "find people like X" discovery tool. Plus a separate,
single-admin panel (passwordless, gated to one fixed email) for manual
account verification/cleanup and content moderation.

## Repo layout

```
apps/web      Student-facing PWA (Next.js, deployed to Vercel)
apps/admin    Admin panel (Next.js, deployed to Vercel, separate project)
supabase/     SQL migrations -- the source of truth for the database schema
```

Both apps are one npm workspace, but deploy as two independent Vercel
projects (set each one's "Root Directory" accordingly).

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the files in `supabase/migrations/` **in
   order** (`0001` through `0005`). Each is idempotent (`if not exists` /
   `on conflict do nothing`), so re-running is safe.
3. Go to **Authentication -> Providers -> Email** and decide whether to
   require email confirmation on signup:
   - **On** (recommended): students confirm via a real inbox before they can
     log in. Works for personal emails too.
   - **Off**: frictionless signup during the open bootstrap window, at the
     cost of not knowing if the email is real.
4. Go to **Authentication -> URL Configuration** and set:
   - **Site URL**: your production `apps/web` URL (e.g.
     `https://sst-connect.vercel.app`)
   - **Redirect URLs**: add `https://<your-web-app-url>/auth/callback` (and
     `http://localhost:3000/auth/callback` for local dev) -- this is required
     for the "link your Scaler email" flow on the profile page to work.
5. Grab three values from **Project Settings -> API**: the project URL, the
   `anon` public key, and the `service_role` secret key.

Storage buckets (`post-images`, `avatars`) and their policies are created by
migration `0004`, so no manual Storage setup is needed.

## 2. Get a build.nvidia.com API key

Used for feed post categorization and the AI discovery chat, running on
Llama 3.3 70B Instruct (free tier) rather than a paid model provider:

1. Sign in at [build.nvidia.com](https://build.nvidia.com).
2. Open any model page (e.g. Llama 3.3 70B Instruct) and use "Get API Key".
3. That's `NVIDIA_API_KEY` below. The free tier has rate limits (not
   unlimited), so if the discovery chat or categorization start failing
   under real load, that's the first thing to check -- either wait out the
   rate limit or move to a paid NVIDIA tier / different provider.

Both AI routes go through `src/lib/ai/client.ts`, which wraps the `openai`
SDK pointed at NVIDIA's OpenAI-compatible endpoint. Since open-weight models
served this way don't reliably support native function/tool-calling, both
routes prompt for plain JSON and parse it themselves rather than depending
on structured tool-call output -- worth knowing if you swap in a different
model later and responses stop parsing.

## 3. Deploy `apps/web` to Vercel

1. Import the GitHub repo into Vercel as a new project.
2. Set **Root Directory** to `apps/web`.
3. Add environment variables (copy from `apps/web/.env.local.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NVIDIA_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` -- set this to the Vercel URL Vercel assigns you
     (you may need to deploy once first, then add this and redeploy)
4. Deploy. Every push to your main branch auto-redeploys.
5. Add `apps/web/public/icons/icon-192.png` and `icon-512.png` (square PNGs,
   brand-blue background) at some point -- the PWA manifest references them
   for the home-screen icon; without them the app still works, it just won't
   have a custom icon when installed.

To actually install as a "native-feeling" app: open the deployed URL on a
phone and use the browser's "Add to Home Screen" option.

## 4. Deploy `apps/admin` to Vercel

Deploy this as a **second, separate Vercel project** pointed at the same
repo:

1. Import the repo again (or add another project from it).
2. Set **Root Directory** to `apps/admin`.
3. Add environment variables (copy from `apps/admin/.env.local.example`):
   - `SUPABASE_URL` (same project URL as `apps/web` -- no `NEXT_PUBLIC_`
     prefix needed, nothing here reaches a browser bundle)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL` -- set this to `harin.25bcs10680@sst.scaler.com` (or
     whichever address you want to be the one and only admin identity)
   - `ADMIN_SITE_URL` -- the Vercel URL Vercel assigns this project (deploy
     once first, then add this and redeploy)
4. In the Supabase dashboard, under **Authentication -> URL Configuration ->
   Redirect URLs**, add `https://<your-admin-app-url>/auth/callback` (and
   `http://localhost:3000/auth/callback` for local dev). Without this, the
   magic link won't be allowed to redirect back into the admin app.
5. Deploy.

**How login works, by design**: there's no password and no visible login
form. Visiting the deployed URL silently emails a one-time magic link to
whatever `ADMIN_EMAIL` is set to, via Supabase Auth, and renders a blank
page regardless of who's visiting -- anyone else who finds the URL sees
nothing, and any dashboard route hit without a matching, authenticated
session 404s instead of showing an access-denied page. For you, it's just:
open the URL, check that inbox, click the link. Sessions persist via
Supabase's normal refresh-token cookies, so you won't need to repeat this
every visit.

Consider also enabling Vercel's own "Deployment Protection" on this project
as a second layer, since it's a sensitive surface.

## 5. Local development

```bash
npm install
cp apps/web/.env.local.example apps/web/.env.local        # fill in values
cp apps/admin/.env.local.example apps/admin/.env.local    # fill in values
npm run dev:web     # http://localhost:3000
npm run dev:admin   # http://localhost:3000 (different port if both running)
```

## Known gaps / next steps

- **Post comments**: the schema and RLS policies exist (`post_comments`
  table), but there's no UI to write or read comments yet -- only the count
  shows on the feed.
- **Verification deadline reminders**: the in-app countdown banner exists,
  but there's no scheduled email/push reminder job yet (would need Resend or
  similar wired into a cron -- e.g. a Vercel Cron Job hitting an API route).
- **Embeddings-based discovery**: the AI discovery search currently uses
  LLM-extracted structured filters (batch/intent/interest keywords) plus
  keyword overlap ranking, not true semantic embeddings. Upgrading to
  `pgvector` + an embeddings model would catch fuzzier matches (e.g. "night
  owl" matching a bio that never uses that phrase) but needs an embeddings
  API and a backfill pipeline -- a solid v2, not required for launch.
- **Push notifications**: Web Push is mentioned in the plan but not wired
  up; new messages/requests currently only show up when the app is open.
- **Bulk invite-code flow**: batch admissions/onboarding lists aren't
  integrated anywhere -- registration is fully open during the bootstrap
  window by design, per the plan.
