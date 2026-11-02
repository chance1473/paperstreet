import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261102180000_profile_appearance.sql", import.meta.url),
  "utf8",
);
const original = readFileSync(
  new URL("../supabase/migrations/20260924120000_paperstreet.sql", import.meta.url),
  "utf8",
);

test("a new migration adds picture, background, and soundtrack columns", () => {
  assert.match(migration, /add column avatar_path text/);
  assert.match(migration, /add column background_choice text/);
  assert.match(migration, /add column soundtrack_choice text/);
  assert.doesNotMatch(migration, /20260924120000_paperstreet/);
});

test("only the owner can change image files, and others can view them", () => {
  assert.match(migration, /'profile-images'/);
  assert.match(migration, /for select to public/);
  assert.match(migration, /for insert to authenticated/);
  assert.match(migration, /for update to authenticated/);
  assert.match(migration, /for delete to authenticated/);
  assert.match(migration, /auth\.uid\(\)::text/);
});

test("resetting the paper account does not clear the new profile choices", () => {
  const start = original.indexOf("create or replace function public.reset_paper_account");
  const end = original.indexOf("revoke all on function public.reset_paper_account", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const reset = original.slice(start, end);
  assert.match(reset, /delete from public\.positions/);
  assert.doesNotMatch(reset, /avatar_path|background_choice|soundtrack_choice|profiles/);
  assert.doesNotMatch(migration, /reset_paper_account/);
});
