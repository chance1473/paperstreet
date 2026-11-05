import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const dir = new URL("../supabase/migrations/", import.meta.url);
const all = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
const assertion = readFileSync(new URL("20261104210000_assert_row_level_security.sql", dir), "utf8");

test("every created public table has row-level security enabled and an owner policy", () => {
  const tables = [...all.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
  assert.ok(tables.length >= 10);
  for (const table of tables) {
    assert.match(assertion, new RegExp(`alter table public\\.${table} enable row level security;`), table);
    assert.match(assertion, new RegExp(`create policy "[^"]+" on public\\.${table}\\b`), table);
  }
});

test("no policy lets a browser write cash, positions or transactions", () => {
  assert.doesNotMatch(assertion, /on public\.(paper_accounts|positions|transactions)\s+for (insert|update|delete|all)/);
});
