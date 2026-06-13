-- ─── Phase 2: Opportunities Schema ─────────────────────────────────────────────
-- Run with: supabase db push  OR  apply via Supabase SQL Editor

CREATE TABLE IF NOT EXISTS opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  website           TEXT,
  email             TEXT,
  phone             TEXT,
  address           TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'US',
  category          TEXT DEFAULT 'business',
  source            TEXT DEFAULT 'manual'
                    CHECK (source IN ('osm', 'manual', 'csv')),

  -- Audit data
  audit_score       INTEGER,
  audit_strengths   TEXT[],
  audit_weaknesses  TEXT[],
  website_available BOOLEAN DEFAULT false,
  opportunity_score INTEGER,
  outreach_message  TEXT,

  -- CRM pipeline
  status            TEXT DEFAULT 'new'
                    CHECK (status IN (
                      'new','contacted','replied','meeting_booked','won','lost'
                    )),
  notes             TEXT,
  contacted_at      TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ,
  meeting_at        TIMESTAMPTZ,
  outcome           TEXT,

  -- Batch tracking
  batch_id          TEXT,

  -- User isolation (derived from Supabase anon key — Phase 2 only)
  user_id           TEXT NOT NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for the main query patterns
CREATE INDEX IF NOT EXISTS opp_user_status_idx
  ON opportunities (user_id, status);
CREATE INDEX IF NOT EXISTS opp_user_score_idx
  ON opportunities (user_id, opportunity_score DESC);
CREATE INDEX IF NOT EXISTS opp_user_created_idx
  ON opportunities (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opp_batch_idx
  ON opportunities (batch_id) WHERE batch_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_opportunities_updated_at ON opportunities;
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Phase 2: policy based on anon key user_id (no auth required yet)
CREATE OR REPLACE POLICY "Users manage own opportunities"
  ON opportunities
  FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

-- Grant public access (needed for server-side anonymous access)
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Allow anon inserts (Vercel API writes without session)
-- Note: anon key must be configured with app.user_id setting in Supabase
