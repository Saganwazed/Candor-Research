import { createApiClient } from "@/utils/supabase/api";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 50;

export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const supabase = createApiClient();
  const now = Date.now();
  const resetAt = new Date(now + WINDOW_MS).toISOString();

  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count, reset_at")
    .eq("ip", ip)
    .maybeSingle();

  // No entry, or window expired — start fresh
  if (!existing || new Date(existing.reset_at).getTime() <= now) {
    await supabase.from("rate_limits").upsert(
      { ip, count: 1, reset_at: resetAt },
      { onConflict: "ip" }
    );
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
  }

  // Window active — check count
  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.reset_at).getTime(),
    };
  }

  // Increment
  await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("ip", ip);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - (existing.count + 1),
    resetAt: new Date(existing.reset_at).getTime(),
  };
}
