-- ============================================================================
-- Migration 002: Security Fixes
-- Addresses: RLS lockdown, atomic rate limiting, IP retention cleanup
-- ============================================================================

-- 1. Drop permissive RLS policies that expose data via publishable key
DROP POLICY IF EXISTS "service_full_access" ON rate_limits;
DROP POLICY IF EXISTS "service_full_access" ON shared_reports;

-- rate_limits: no policies = deny all via publishable key.
-- Only the service_role key (which bypasses RLS) can touch this table.

-- shared_reports: allow anonymous read on public reports only.
-- All writes go through API routes using service_role key.
CREATE POLICY "public_read_only" ON shared_reports
  FOR SELECT
  USING (is_public = true);

-- 2. Atomic rate limit check-and-increment (fixes race condition)
-- Returns the count AFTER increment so the caller knows whether the request is allowed.
-- If the window has expired or no row exists, resets to count=1 with a new window.
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_ip text,
  p_max_requests integer,
  p_window_ms bigint
)
RETURNS TABLE(new_count integer, is_allowed boolean, reset_at_ts timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
  v_now timestamptz := now();
  v_reset timestamptz := v_now + (p_window_ms || ' milliseconds')::interval;
  v_row rate_limits%ROWTYPE;
BEGIN
  INSERT INTO rate_limits (ip, count, reset_at)
  VALUES (p_ip, 1, v_reset)
  ON CONFLICT (ip) DO UPDATE
    SET
      count = CASE
        WHEN rate_limits.reset_at <= v_now THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= v_now THEN v_reset
        ELSE rate_limits.reset_at
      END
  RETURNING rate_limits.count, rate_limits.reset_at
  INTO v_row;

  RETURN QUERY SELECT
    v_row.count,
    (v_row.count <= p_max_requests),
    v_row.reset_at;
END;
$$;

-- 3. Cleanup function for expired rate limit entries (GDPR: IP retention)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM rate_limits WHERE reset_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
