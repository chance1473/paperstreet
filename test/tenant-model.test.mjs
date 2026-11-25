import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("customer rows are owned by user_id and the documented paths match the SQL", () => {
  const doc = readFileSync("docs/readiness-access.md", "utf8");
  const rls = readFileSync("supabase/migrations/20261104210000_assert_row_level_security.sql", "utf8");
  const schema = readFileSync("supabase/migrations/20260924120000_paperstreet.sql", "utf8");
  assert.match(doc, /owner key is `user_id`/);
  assert.match(doc, /no organization and no shared-tenant model/);
  assert.match(doc, /user_id = auth\.uid\(\)/);
  assert.match(doc, /execute_paper_trade/);
  assert.match(doc, /20261104210000_assert_row_level_security\.sql/);
  assert.match(doc, /20260924120000_paperstreet\.sql/);
  assert.match(doc, /Service-role functions/);
  assert.match(doc, /public storage bucket `profile-images`/);
  assert.match(doc, /not multi-tenant/);
  for (const table of [
    "paper_accounts",
    "positions",
    "transactions",
    "portfolio_snapshots",
    "watchlist_items",
    "simulated_accounts",
    "simulated_positions",
    "simulated_transactions",
    "simulated_snapshots",
  ]) {
    assert.match(rls, new RegExp(`on public\\.${table}\\s+for select to authenticated using \\(user_id = auth\\.uid\\(\\)\\)`));
  }
  assert.match(rls, /on public\.profiles\s+for select to authenticated using \(id = auth\.uid\(\)\)/);
  assert.match(schema, /p_user_id/);
  assert.match(schema, /where user_id = p_user_id/);
});
