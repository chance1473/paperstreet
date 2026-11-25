import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("server clients prefer the pooler URL and fall back to the public URL", async () => {
  const { serverSupabaseUrl } = await import("../src/lib/supabase/url.ts");
  const previousPooler = process.env.SUPABASE_POOLER_URL;
  const previousPublic = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_POOLER_URL = "https://pooler.example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public.example.supabase.co";
  assert.equal(serverSupabaseUrl(), "https://pooler.example.supabase.co");
  delete process.env.SUPABASE_POOLER_URL;
  assert.equal(serverSupabaseUrl(), "https://public.example.supabase.co");
  if (previousPooler === undefined) delete process.env.SUPABASE_POOLER_URL;
  else process.env.SUPABASE_POOLER_URL = previousPooler;
  if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previousPublic;

  const server = readFileSync("src/lib/supabase/server.ts", "utf8");
  const admin = readFileSync("src/lib/supabase/admin.ts", "utf8");
  const browser = readFileSync("src/lib/supabase/client.ts", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert.match(server, /serverSupabaseUrl\(\)/);
  assert.match(admin, /serverSupabaseUrl\(\)/);
  assert.doesNotMatch(browser, /SUPABASE_POOLER_URL/);
  assert.match(browser, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(readme, /SUPABASE_POOLER_URL/);
  assert.match(readme, /pooler endpoint/);
});
