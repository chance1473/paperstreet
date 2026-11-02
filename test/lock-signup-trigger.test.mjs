import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261102200000_lock_signup_trigger.sql", import.meta.url),
  "utf8",
);
const original = readFileSync(
  new URL("../supabase/migrations/20260924120000_paperstreet.sql", import.meta.url),
  "utf8",
);

test("the signup lock migration revokes direct execute", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public/);
  assert.match(migration, /values \(new\.id, 10000000\)/);
  assert.match(migration, /revoke execute on function public\.handle_new_user\(\) from public;/);
  assert.match(migration, /revoke execute on function public\.handle_new_user\(\) from anon;/);
  assert.match(migration, /revoke execute on function public\.handle_new_user\(\) from authenticated;/);
});

test("the original paperstreet migration is not edited to revoke the signup function", () => {
  assert.match(original, /create or replace function public\.handle_new_user\(\)/);
  assert.match(original, /create trigger on_auth_user_created/);
  assert.doesNotMatch(original, /revoke execute on function public\.handle_new_user/);
  assert.doesNotMatch(original, /20261102200000_lock_signup_trigger/);
});
