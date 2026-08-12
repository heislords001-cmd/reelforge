-- Reelforge schema
-- Design notes:
--   * UUID primary keys throughout so future federation / API access is painless.
--   * `projects.status` tracks pipeline progress so the UI can resume a partial generation.
--   * `scenes` is the join between script and media — one row per beat, holding both the
--     image and (eventually) video/subtitle rows that belong to it, keeping generation
--     modules decoupled from each other.
--   * `generation_jobs` gives every provider call an audit trail (cost, latency, retries)
--     without coupling the providers table to any single AI vendor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  -- Billing: every user starts on a trial that behaves exactly like premium (full model
  -- tier) until trial_ends_at passes, at which point subscriptionService downgrades them
  -- to the free-tier model unless an active subscription row exists.
  plan            TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','premium','free')),
  trial_ends_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe to re-run against a database created before billing existed — adds the columns
-- without touching existing rows' other data. New users get the defaults above regardless.
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days');

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'paystack',
  customer_code       TEXT,
  subscription_code   TEXT,
  plan_code           TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','past_due','cancelled')),
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Paystack retries webhooks that don't return 200 fast enough — this table makes handling
-- idempotent so a retried "charge.success" doesn't double-process.
CREATE TABLE IF NOT EXISTS payment_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider        TEXT NOT NULL DEFAULT 'paystack',
  event_id        TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Untitled project',
  prompt          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','script_ready','images_ready','voice_ready','complete','failed')),
  -- free-form settings snapshot: target length, tone, voice category, image style, etc.
  settings        JSONB NOT NULL DEFAULT '{}',
  -- reserved for future modules (video, subtitles, thumbnails) to attach state
  -- without new columns/migrations on the hot path.
  modules         JSONB NOT NULL DEFAULT '{}',
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm ON projects USING gin (to_tsvector('english', title));

CREATE TABLE IF NOT EXISTS scripts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  hook            TEXT NOT NULL DEFAULT '',
  introduction    TEXT NOT NULL DEFAULT '',
  conclusion      TEXT NOT NULL DEFAULT '',
  call_to_action  TEXT NOT NULL DEFAULT '',
  raw_markdown    TEXT NOT NULL DEFAULT '',
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id       UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index     INTEGER NOT NULL,
  chapter_title   TEXT NOT NULL DEFAULT '',
  narration_text  TEXT NOT NULL DEFAULT '',
  image_prompt    TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(script_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);

CREATE TABLE IF NOT EXISTS scene_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id        UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  storage_key     TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  is_selected     BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scene_images_scene_id ON scene_images(scene_id);

CREATE TABLE IF NOT EXISTS voice_tracks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id        UUID REFERENCES scenes(id) ON DELETE CASCADE,
  voice_category  TEXT NOT NULL,
  url             TEXT NOT NULL,
  storage_key     TEXT NOT NULL,
  duration_seconds NUMERIC,
  settings        JSONB NOT NULL DEFAULT '{}', -- speed, pitch, volume, stability
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_tracks_project_id ON voice_tracks(project_id);

-- Audit trail for every provider call — cost/latency tracking, retries, debugging.
CREATE TABLE IF NOT EXISTS generation_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL CHECK (job_type IN ('script','image','voice')),
  provider        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed')),
  attempt         INTEGER NOT NULL DEFAULT 1,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_project_id ON generation_jobs(project_id);

-- Reserved for the "Team collaboration" roadmap item — not wired into routes yet,
-- but present so that adding it later is additive, not a migration on live data.
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  PRIMARY KEY (organization_id, user_id)
);

-- Reserved for the "Public API access" roadmap item.
CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ
);
