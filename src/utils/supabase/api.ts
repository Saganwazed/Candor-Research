/**
 * Supabase client for API routes (server-side, no cookie session needed).
 * Uses the service role key if available, falls back to publishable key.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Prefer service role key for API routes (bypasses RLS)
// Falls back to publishable key — requires permissive RLS policies
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const createApiClient = () =>
  createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
