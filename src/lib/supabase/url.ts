export function serverSupabaseUrl() {
  const pooler = process.env.SUPABASE_POOLER_URL;
  if (typeof pooler === "string" && pooler !== "") return pooler;
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}
