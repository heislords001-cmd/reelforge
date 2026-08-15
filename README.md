# Reelforge: AI YouTube Content Studio

Turn one idea into a finished video package: script, scene-by-scene images, and human-like
narration. Built as a **single deployable project**. One repo, one Vercel project, one
domain. With a provider-agnostic AI layer underneath so new AI vendors or capabilities can
be added without touching existing code.

```
"Create a documentary about the fall of the Roman Empire."
        │
        ▼
 ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
 │  Script      │ →  │  Scene       │ →  │  Images +    │
 │  (Groq LLM)  │    │  breakdown   │    │  Narration   │
 └─────────────┘    └──────────────┘    └──────────────┘
                                                │
                                                ▼
                                   Project saved: script, images,
                                   audio, timestamps, downloads
```

## Layout

```
reelforge/
├── src/            React + TypeScript + Tailwind frontend (Vite)
├── api/            Single Vercel serverless function. Wraps the Express app below
├── server-lib/      Express app, routes, services, provider abstraction, Postgres
├── vercel.json      Rewrites: /api/* → the function, everything else → the SPA
└── package.json     One set of dependencies/scripts for both halves
```

This used to be two separate packages deployed as two separate Vercel projects. It's now
one project: `api/index.ts` exports the Express app (built in `server-lib/app.ts`) directly
as a Vercel function, and `vercel.json` routes `/api/*` requests to it while everything else
falls through to the built React app. Same domain, same deploy, no CORS juggling, no
`VITE_API_URL` to keep in sync. The frontend just calls a relative `/api/...` path and it
resolves correctly whether you're running locally or in production.

## Why the provider layer

No route or React component talks to Groq, FLUX, or Chatterbox directly. Every AI capability
is defined as an interface first (`server-lib/providers/types.ts`):

- `ScriptProvider.generateScript()`
- `ImageProvider.generateImage()`
- `VoiceProvider.synthesize()`

`server-lib/providers/registry.ts` is the only place that knows which concrete
implementation backs each capability. Swapping Groq for another LLM, or adding a second
image provider users can pick between, means writing one class and registering it. Nothing
in `services/`, `routes/`, or the frontend changes. See
`server-lib/providers/README.md` for the pattern in detail.

## Local development

Two processes, running together:

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, provider API keys
npm run db:migrate          # applies server-lib/db/schema.sql

npm run dev:api             # Express on :4000
npm run dev                 # Vite on :5173, proxies /api/* to :4000 (see vite.config.ts)
```

Visit `http://localhost:5173`. The frontend never needs to know the API's actual address.
in dev the Vite proxy handles it, in production same-origin handles it.

## Deploying to Vercel

One project this time:

1. New Project → import this repo. Root Directory stays as the repo root (don't set it to
   `src` or anything else. `api/`, `server-lib/`, and the frontend all need to be visible
   at the project root for the build and the function to both work).
2. Framework preset: Vite (should auto-detect from `package.json` + `vite.config.ts`).
3. Add every var from `.env.example` in the dashboard. **`DATABASE_URL` must be a pooled
   connection string** (PgBouncer). On Neon that's the connection string with `-pooler` in
   the hostname from the dashboard, not the direct one. A direct connection string will
   exhaust Postgres's connection limit once Vercel scales to multiple function instances.
   see the comment in `server-lib/config/database.ts` for why.
4. Run `npm run db:migrate` once against that same `DATABASE_URL` from your machine before
   first use. There's no automatic migration step on deploy.
5. Deploy.

**Known limitation:** Vercel serverless functions have a hard max duration
(`vercel.json` requests 60s, which requires at least the Pro plan. Hobby caps lower). The
image and voice generation stages run scene generations in concurrent batches of 3
specifically to stay under that ceiling, and the frontend calls script/images/voice as three
separate requests rather than one combined call. But a long video (12+ scenes) on a lower
tier could still be tight. The real long-term fix if that becomes a constraint is a
background job queue (Vercel Queues, Inngest, Trigger.dev) fronted by a
"start generation, poll for status" API instead of a synchronous request. Bigger than this
initial deploy needs, but worth knowing is the actual answer rather than a workaround piled
on top of function timeouts.

## Google sign in

Users can sign up or sign in with Google, in addition to email and password. The flow is a
plain OAuth2 authorization code exchange (`server-lib/routes/auth.routes.ts`), no third
party auth library, matching the rest of this codebase's preference for direct fetch calls
over heavy SDKs. A short lived, httpOnly cookie carries the CSRF state parameter across the
redirect to Google and back.

**Setup on Google's side:**
1. console.cloud.google.com, APIs and Services, OAuth consent screen: set an app name and
   support email, add the `email`, `profile`, and `openid` scopes
2. APIs and Services, Credentials, Create Credentials, OAuth Client ID, type Web application
3. Under Authorized redirect URIs, add both your production URL and local dev URL:
   `https://yourdomain.vercel.app/api/auth/google/callback` and
   `http://localhost:4000/api/auth/google/callback`
4. Copy the Client ID and Client Secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`,
   and set `GOOGLE_CALLBACK_URL` to whichever redirect URI matches where you're running

An account signing in with Google that shares an email with an existing password account
gets linked to it automatically rather than creating a duplicate. `password_hash` is
nullable in the schema specifically to allow Google only accounts that never set one.

## Nano Banana (premium image tier)

Premium accounts generate images with Nano Banana (Gemini 3.1 Flash Image) instead of FLUX
Schnell, a genuinely stronger, paid model rather than just more variants of the same free
one. This uses a different Google credential entirely from the OAuth sign in above, a Gemini
API key, not an OAuth client.

**Setup:**
1. aistudio.google.com, sign in, Get API key, create one tied to a Google Cloud project with
   billing enabled (the free tier is rate limited too low for production use)
2. Copy it into `GOOGLE_GEMINI_API_KEY`

Free tier stays on FLUX Schnell regardless, both for cost and because FLUX Dev (a stronger
FLUX tier) turned out to be licensed for non-commercial use only on NVIDIA's hosting, not
something to build a paid product on. Nano Banana solved that same problem with an actually
commercial, paid API instead.

## Billing (trial → premium)

Every new account gets a 30-day trial that behaves exactly like premium. Full-quality
script generation. With no card required. `subscriptionService.isPremiumActive()` is the
one place that decides this: `plan === 'premium'`, or `plan === 'trial'` and
`trial_ends_at` hasn't passed. Once neither is true, script generation quietly falls back
to the free-tier model; nothing breaks, it just gets a weaker model.

Two script models are registered on the same `NVIDIA_API_KEY`. `nvidia-free` (Nemotron) and
`nvidia-premium` (DeepSeek V4 Pro). And `scriptService` asks `subscriptionService` which one
a given user should get on every generation call. Images and voice aren't tier-gated yet;
that's a natural next step if you want a stronger free/premium split later.

**Flow:** Dashboard shows a trial countdown → "Upgrade" hits `/api/billing/checkout`, which
calls Paystack's `/transaction/initialize` with the plan code and redirects the browser to
Paystack's hosted checkout → Paystack redirects back to `/billing/callback?reference=...` →
the frontend calls `/api/billing/verify` for immediate UI feedback, but the **webhook is the
actual source of truth** (`/api/billing/webhook`, signature-verified against the raw request
body, idempotent via the `payment_events` table so Paystack's retries don't double-process).

**Setup on Paystack's side:**
1. Dashboard.paystack.com → Settings → API Keys & Webhooks → copy the secret key
2. Settings → Plans → create your monthly plan → copy the plan code
3. Same Webhooks settings page → set the webhook URL to `<your-domain>/api/billing/webhook`
4. Confirm your account's settlement currency matches `PAYSTACK_CURRENCY`. NGN works by
   default, USD billing needs separate verification on your Paystack account

Swapping to a different processor later (Flutterwave, Stripe) means writing one class that
satisfies `PaymentProvider` (`server-lib/providers/payment/types.ts`) and pointing
`server-lib/providers/payment/index.ts` at it. Routes and `subscriptionService` don't change.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled, if deploying to Vercel) |
| `JWT_SECRET` | Signing secret for auth tokens |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google sign in, from Google Cloud Console |
| `GOOGLE_GEMINI_API_KEY` | Nano Banana image generation for premium accounts, from Google AI Studio, a separate credential from the OAuth one above |
| `NVIDIA_API_KEY` | Powers everything AI: script (free + premium tiers), images (FLUX.1 Schnell), voice (Chatterbox). All on NVIDIA's free build.nvidia.com catalog |
| `GROQ_API_KEY` | Optional. An alternative script provider, not required by default (see `server-lib/providers/registry.ts`) |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | From Paystack's API Keys settings |
| `PAYSTACK_PLAN_CODE` | The recurring plan created in Paystack's dashboard |
| `PAYSTACK_AMOUNT` / `PAYSTACK_CURRENCY` | Main-unit price and currency for that plan |
| `STORAGE_DRIVER` | `s3` or `cloudinary` |
| `S3_*` / `CLOUDINARY_*` | Credentials for whichever storage driver is active |

## Roadmap

The provider registry and the `modules` field on `projects` exist specifically so these
slot in without touching existing code:

- AI video generation (new `VideoProvider` interface)
- Voice cloning (extends `VoiceProvider` with a `cloneVoice()` capability)
- Background music & sound effects (new `AudioLibraryProvider`)
- Subtitle generation (derives from existing script + audio timestamps)
- Thumbnail creator (reuses `ImageProvider` with a dedicated prompt template)
- Team collaboration (new `organizations` / `memberships` tables, already namespaced in schema)
- Public API access (new `api_keys` table + scoped middleware, reuses existing routes)
- Tier-gate images/voice the same way script generation is gated (currently only script checks plan)
- Basic trial-abuse prevention (nothing currently stops repeat signups from farming free trials)
- Password reset flow (doesn't exist yet)
