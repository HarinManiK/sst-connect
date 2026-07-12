# SST Connect

Mobile-web PWA for Scaler School of Technology students — public feed with
AI-categorized posts, friend requests, 1:1 chat, and an AI-powered
conversational "find people like X" discovery tool. Plus a separate,
single-admin panel for account verification/cleanup and moderation, hidden
behind a secret URL.

## How the pieces fit together

| Piece | What it is | Where it runs |
|---|---|---|
| `apps/web` | The student app (Next.js PWA) | Vercel (project #1) |
| `apps/admin` | Your admin panel (Next.js) | Vercel (project #2) |
| `supabase/` | Database schema (SQL migrations) | Supabase (Postgres + Auth + Realtime + Storage) |
| AI features | Post categorization + discovery chat | Google AI Studio / Gemini (Flash models, free tier) |
| Sign-in | "Continue with Google" for students; Google for the admin too | Google Cloud (one free OAuth client) |

**Follow the parts in order.** They're arranged so you never have to come
back and redo an earlier step — each part only needs things you already
have by the time you reach it.

Accounts you'll need (all free): [supabase.com](https://supabase.com),
[vercel.com](https://vercel.com),
[aistudio.google.com](https://aistudio.google.com/apikey), and a Google
account for [console.cloud.google.com](https://console.cloud.google.com).

---

## Part 1 — Supabase (database)

### 1.1 Create the project and run the migrations

1. At [supabase.com](https://supabase.com), create a project (any name,
   region closest to Bengaluru, e.g. Mumbai).
2. In the left sidebar, open **SQL Editor**.
3. In this repo, open `supabase/migrations/0001_init.sql`, copy the whole
   file, paste it into the SQL editor, and click **Run**. You should see
   "Success. No rows returned".
4. Repeat for `0002`, `0003`, `0004`, `0005`, and `0006` — **in that
   order**. All six are safe to re-run if you're not sure whether one
   already ran.

### 1.2 Copy your three keys

1. In the left sidebar, click **Project Settings** (gear icon), then
   **API** (sometimes under "Configuration").
2. Copy these three values into a scratch note — you'll paste them into
   Vercel in Parts 3 and 4:
   - **Project URL** — like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting `eyJ...`
   - **service_role / secret key** — also `eyJ...`. This one bypasses all
     security rules. Never share it, never commit it, never put it in
     anything that starts with `NEXT_PUBLIC_`.

### 1.3 One auth setting

1. Left sidebar → **Authentication** → find the **Email** provider settings
   (under "Sign In / Providers" or "Providers", depending on dashboard
   version).
2. Turn **off** "Secure email change" (if it's on). With it on, a student
   linking their Scaler email would have to confirm from *both* their old
   personal inbox *and* the new Scaler inbox; off means just the Scaler
   inbox, which is the one we actually care about proving they own.

That's all for Supabase for now. (Google sign-in setup comes in Part 5,
after Vercel gives you your app URLs.)

---

## Part 2 — Gemini API key (the AI)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   and sign in with a Google account.
2. Click **Create API key** and copy it into your scratch note.

Both AI features (post categorization + discovery chat) run on Gemini's
free-tier **Flash** models. The app uses a **fallback chain**: it tries one
model, and if that one is momentarily rate-limited, it automatically drops
to the next. The default order is
`gemini-2.5-flash → gemini-2.0-flash → gemini-2.5-flash-lite`.

The free tier is capped at roughly **1,500 requests/day** (resets midnight
US Pacific) and ~10–15 requests/minute, per Google account. If you ever
want to change the chain (e.g. a newer model shows up in AI Studio), set
the optional `GEMINI_MODELS` env var to a comma-separated list — no code
change needed. Confirm the exact names available to your key at
[aistudio.google.com](https://aistudio.google.com/).

---

## Part 3 — Deploy the student app to Vercel

1. At [vercel.com](https://vercel.com), click **Add New → Project** and
   import the `sst-connect` GitHub repo.
2. Before deploying, set **Root Directory** to `apps/web` (click **Edit**
   next to Root Directory and pick the folder).
3. Expand **Environment Variables** and add these four (values from your
   scratch note):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
   | `GEMINI_API_KEY` | your Gemini key |

4. Click **Deploy**, wait for it to finish, and note the URL it gives you
   (like `https://sst-connect.vercel.app`). Write it in your scratch note
   as the **web URL**.

Don't open the app yet — sign-in won't work until Part 5. Every future
`git push` to `master` redeploys automatically.

> **PWA icons (whenever, not blocking):** drop `icon-192.png` and
> `icon-512.png` (square PNGs) into `apps/web/public/icons/` and push, and
> the app gets a proper home-screen icon when students install it.

---

## Part 4 — Deploy the admin panel to Vercel

Same repo, second Vercel project:

1. **Add New → Project**, import `sst-connect` again.
2. Set **Root Directory** to `apps/admin`.
3. Add these five environment variables:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL (same as before) |
   | `SUPABASE_ANON_KEY` | the anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
   | `ADMIN_EMAIL` | `harin.25bcs10680@sst.scaler.com` |
   | `ADMIN_ENTRY_SECRET` | a long random slug — see below |

   `ADMIN_ENTRY_SECRET` is the hidden door. Make it long and unguessable
   (e.g. run `openssl rand -hex 16`, or mash out 25+ random characters —
   letters/numbers only, no spaces or slashes).

4. Deploy, and note this URL too (the **admin URL**).

**How admin login works:** the admin app shows a 404 on every path — no
login page, no trace it's anything at all. The one exception:
`https://<admin-url>/<ADMIN_ENTRY_SECRET>` immediately bounces you to
Google sign-in. Sign in with the `ADMIN_EMAIL` Google account and you land
on the dashboard; any other Google account gets signed out and 404'd.
**Bookmark the secret URL on your own devices** — that bookmark is
effectively your key. If it ever leaks, change `ADMIN_ENTRY_SECRET` in
Vercel and redeploy (the leaked path goes back to 404; your email check is
still the real gate either way).

---

## Part 5 — Google sign-in

You now have every URL this needs. One Google OAuth client covers both apps.

### 5.1 Supabase side, first half

1. Supabase dashboard → **Authentication** → **Sign In / Providers** (or
   "Providers") → click **Google**.
2. Toggle **Enable Sign in with Google** on.
3. Copy the **Callback URL (for OAuth)** shown there — it looks like
   `https://abcdefgh.supabase.co/auth/v1/callback`. Keep this tab open.

### 5.2 Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com), sign
   in, and create a **New Project** (top-left project dropdown → New
   Project → name it `sst-connect` → Create → make sure it's selected).
2. Search **"OAuth consent screen"** in the top search bar and open it.
3. Choose **External**, click **Create**, then fill in:
   - App name: `SST Connect`
   - User support email: yours
   - Developer contact email (bottom): yours
   Click **Save and Continue** through the remaining screens (Scopes, Test
   users — leave defaults).
4. Search **"Credentials"** (under APIs & Services) → **+ Create
   Credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `SST Connect Web`
   - **Authorized JavaScript origins** — add three, one at a time:
     - your web URL (e.g. `https://sst-connect.vercel.app`)
     - your admin URL
     - `http://localhost:3000`
   - **Authorized redirect URIs** — add exactly one: the Supabase callback
     URL from step 5.1 (`https://abcdefgh.supabase.co/auth/v1/callback`)
   - Click **Create**.
5. A popup shows the **Client ID** and **Client Secret** — copy both. (Find
   them again anytime under Credentials → click the client's name.)
6. **Publish the app — easy to miss, breaks everything if skipped:** go
   back to **OAuth consent screen** and click **Publish App** (status:
   Testing → In production). While it says *Testing*, only Google accounts
   you hand-list as "test users" can sign in — every other student gets an
   "Access blocked" error. This app only asks for basic profile/email, so
   publishing doesn't require Google's review process.

### 5.3 Supabase side, second half

1. Back in the Supabase tab from 5.1, paste the **Client ID** and **Client
   Secret** into the Google provider's fields and click **Save**.

---

## Part 6 — Tell Supabase your app URLs

1. Supabase dashboard → **Authentication** → **URL Configuration**.
2. **Site URL**: your web URL (e.g. `https://sst-connect.vercel.app`).
3. **Redirect URLs** — add all four:
   - `https://<web-url>/auth/callback`
   - `https://<admin-url>/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3001/auth/callback`

   (The first two make sign-in work in production; the last two are for
   local dev — web runs on port 3000, admin on 3001.)

---

## Part 7 — Test it

Student app (on your phone, ideally):

1. Open the web URL → you should land on a "Continue with Google" page.
2. Sign in with any Google account → Google's account picker → you land on
   the feed. Your name and photo should already be on the Profile tab.
3. Make a post → it appears immediately; within a few seconds it picks up a
   category chip (hot/tech/culture/general).
4. Profile tab → link your Scaler email → confirmation lands in the Scaler
   inbox → after clicking it, your profile shows "Verified" with the right
   batch.
5. "Add to Home Screen" from the browser menu installs it like an app.

Admin panel:

6. Open `https://<admin-url>/<your-ADMIN_ENTRY_SECRET>` → Google → you're
   in the dashboard. Then confirm the stealth: open the bare admin URL in a
   private/incognito window — it should 404.

---

## Local development

```bash
npm install
cp apps/web/.env.local.example apps/web/.env.local        # fill in values
cp apps/admin/.env.local.example apps/admin/.env.local    # fill in values
npm run dev:web     # http://localhost:3000
npm run dev:admin   # http://localhost:3001
```

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Google shows **"Access blocked: This app has not completed verification"** or only your account works | Consent screen still in *Testing* — do step 5.6 (Publish App). |
| Google shows **redirect_uri_mismatch** | The Supabase callback URL in Google's "Authorized redirect URIs" doesn't exactly match step 5.1's value. |
| After Google sign-in you bounce back to the login page | Your app's `/auth/callback` URL is missing from Supabase → URL Configuration → Redirect URLs (Part 6). |
| Admin secret URL shows 404 | `ADMIN_ENTRY_SECRET` in Vercel doesn't match what you typed, or you edited env vars without redeploying (Vercel → Deployments → Redeploy). |
| Admin login loops to 404 after Google | You signed in with a Google account whose email ≠ `ADMIN_EMAIL`. |
| Posts never get categorized | Bad/rate-limited `GEMINI_API_KEY`, or every model in the chain is exhausted; check the Vercel function logs for the web project. |
| Discovery chat says "AI is busy right now" | The whole Gemini model chain is rate-limited (you've hit the free-tier RPM/daily cap). Wait for the window to reset, or widen `GEMINI_MODELS`. |
| "Link your Scaler email" mail never arrives | Supabase's built-in mailer is heavily rate-limited (a few emails/hour). Fine for testing; before launch, plug a real SMTP provider into Supabase (Project Settings → Auth → SMTP). |
| Everything 500s after Supabase was idle | Free-tier projects pause after ~1 week of inactivity — unpause from the Supabase dashboard (or upgrade to Pro before launch). |

---

## Known gaps / next steps

- **Comments UI** — schema + permissions exist; feed shows counts, but
  there's no screen to read/write comments yet.
- **"For You" is just newest-first** — no personalization signal yet; the
  category tabs are the real filter for now.
- **Avatar upload** — Google profile photos come through automatically, but
  there's no in-app photo upload yet (storage bucket + policies are ready).
- **Push notifications** — new messages/requests only show while the app is
  open.
- **Duplicate accounts** — a student who signs up with a personal Google
  account and later signs in directly with their Scaler Google account (instead
  of using "link your Scaler email") gets two accounts; merge/cleanup is
  manual via the admin panel.
- **Deadline reminder emails** — the in-app countdown banner exists; a
  scheduled reminder email (Vercel Cron + an email provider) doesn't.
- **Deleted users' images** — deleting an account removes the user and
  their rows, but uploaded images stay in Storage (orphaned, invisible).
