-- Rate limits: persistent IP-based rate limiting that survives Vercel cold starts
CREATE TABLE IF NOT EXISTS rate_limits (
  ip        text        NOT NULL,
  count     integer     NOT NULL DEFAULT 0,
  reset_at  timestamptz NOT NULL,
  PRIMARY KEY (ip)
);

-- Allow API routes to read/write rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_full_access" ON rate_limits USING (true) WITH CHECK (true);

-- Shared reports: persistent storage for shared analysis reports
CREATE TABLE IF NOT EXISTS shared_reports (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id            text        NOT NULL UNIQUE,
  report_snapshot     jsonb       NOT NULL,
  source_domain       text,
  article_title       text,
  creator_session_id  text,
  is_public           boolean     NOT NULL DEFAULT true,
  view_count          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  expires_at          timestamptz
);

-- Index for fast share_id lookups
CREATE INDEX IF NOT EXISTS shared_reports_share_id_idx ON shared_reports (share_id);

-- Allow API routes to read/write shared reports
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_full_access" ON shared_reports USING (true) WITH CHECK (true);

-- Atomic view count increment (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_view_count(p_share_id text)
RETURNS void LANGUAGE sql AS $$
  UPDATE shared_reports
  SET view_count = view_count + 1
  WHERE share_id = p_share_id;
$$;
