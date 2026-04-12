/**
 * Supabase client for API routes (server-side, no cookie session needed).
 * Requires the service role key — publishable key is no longer accepted
 * because RLS policies now deny all writes from non-service roles.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const createApiClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is required");
  }
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required — API routes cannot use the publishable key"
    );
  }
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
};
