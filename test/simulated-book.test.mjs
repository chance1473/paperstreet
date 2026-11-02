import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const book = readFileSync(
  new URL("../supabase/migrations/20261102190000_simulated_book.sql", import.meta.url),
  "utf8",
);
const original = readFileSync(
  new URL("../supabase/migrations/20260924120000_paperstreet.sql", import.meta.url),
  "utf8",
);

test("a new migration creates a simulated book that starts at $100,000", () => {
  assert.match(book, /create table public\.simulated_accounts/);
  assert.match(book, /cash_cents bigint not null default 10000000/);
  assert.match(book, /values \(new\.id, 10000000\)/);
});

test("that book is not the live paper account", () => {
  assert.doesNotMatch(book, /paper_accounts/);
  assert.doesNotMatch(book, /execute_paper_trade/);
  assert.match(book, /simulated_accounts/);
});

test("resetting one book does not clear the other", () => {
  assert.match(book, /function public\.reset_simulated_account/);
  assert.doesNotMatch(book, /reset_paper_account/);
  assert.doesNotMatch(book, /delete from public\.positions/);
  assert.match(original, /function public\.reset_paper_account/);
  assert.doesNotMatch(original, /simulated_accounts/);
});
