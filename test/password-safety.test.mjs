import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

test("Supabase Auth holds passwords and refuses breached ones", () => {
  const validation = readFileSync("src/lib/validation.ts", "utf8");
  const config = readFileSync("supabase/config.toml", "utf8");
  const readme = readFileSync("README.md", "utf8");
  const sql = readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(`supabase/migrations/${name}`, "utf8"))
    .join("\n");
  assert.match(validation, /\.min\(8/);
  assert.match(validation, /\.max\(72/);
  assert.match(config, /password_hibp_enabled = true/);
  assert.match(config, /minimum_password_length = 8/);
  assert.match(readme, /Supabase Auth stores the password/);
  assert.match(readme, /enable_confirmations = false/);
  assert.match(readme, /reset email/);
  assert.doesNotMatch(sql, /create table[^;]*password/i);
});
