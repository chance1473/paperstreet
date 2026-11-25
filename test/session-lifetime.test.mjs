import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("sessions last one hour, refresh for 30 days, and end on password change", () => {
  const session = readFileSync("src/lib/supabase/session.ts", "utf8");
  const settings = readFileSync("src/lib/actions/settings.ts", "utf8");
  const config = readFileSync("supabase/config.toml", "utf8");
  const readme = readFileSync("README.md", "utf8");
  const update = settings.slice(
    settings.indexOf("export async function updatePassword"),
    settings.indexOf("export async function resetPaperAccount"),
  );
  assert.match(session, /refreshSession\(\)/);
  assert.match(config, /jwt_expiry = 3600/);
  assert.match(config, /timebox = "720h"/);
  assert.match(update, /auth\.signOut\(\)/);
  assert.match(readme, /jwt_expiry = 3600/);
  assert.match(readme, /timebox = "720h"/);
  assert.match(readme, /Signing out/);
  assert.match(readme, /Changing the password/);
});
