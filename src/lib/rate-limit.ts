import { createApiClient } from "@/utils/supabase/api";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 50;

/**
 * Atomic rate limit check using a single SQL upsert (no race condition).
 * Fails closed: if the RPC errors, the request is denied.
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const supabase = createApiClient();

  const { data, error } = await supabase.rpc("check_and_increment_rate_limit", {
    p_ip: ip,
    p_max_requests: MAX_REQUESTS,
    p_window_ms: WINDOW_MS,
  });

  if (error || !data || data.length === 0) {
    // Fail closed: deny the request if we cannot verify the rate limit
    console.error("Rate limit RPC error:", error);
    return { allowed: false, remaining: 0, resetAt: Date.now() + WINDOW_MS };
  }

  const row = data[0];
  return {
    allowed: row.is_allowed,
    remaining: Math.max(0, MAX_REQUESTS - row.new_count),
    resetAt: new Date(row.reset_at_ts).getTime(),
  };
}
