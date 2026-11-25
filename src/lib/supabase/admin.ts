import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverSupabaseUrl } from "@/lib/supabase/url";

export function createAdminClient() {
  const url = serverSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
