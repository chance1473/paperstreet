import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the access note names every role and every owner policy", () => {
  const doc = readFileSync("docs/readiness-access.md", "utf8");
  const rls = readFileSync("supabase/migrations/20261104210000_assert_row_level_security.sql", "utf8");
  const policies = [...rls.matchAll(/create policy "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(policies.length >= 13);
  for (const name of policies) {
    assert.match(doc, new RegExp(name));
  }
  assert.match(doc, /Visitor/);
  assert.match(doc, /Authenticated trader/);
  assert.match(doc, /Service role/);
  assert.match(doc, /no teammate roles/);
  assert.match(doc, /Writes to cash, positions, and transactions are service-role only/);
  assert.match(doc, /insert or delete its own watchlist rows/);
  assert.match(doc, /getSessionUser/);
});
