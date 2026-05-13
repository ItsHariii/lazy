import { createClient } from "@supabase/supabase-js";
import { env, assertSupabaseAdmin } from "./env";

export function createSupabaseAdminClient() {
  assertSupabaseAdmin();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
