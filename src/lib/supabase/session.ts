import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseEnv } from "@/lib/utils";

export async function getSessionUser() {
  if (!hasPublicSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
