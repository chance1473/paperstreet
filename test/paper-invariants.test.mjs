import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { STARTING_CASH_CENTS, decimalToCents, valueCents } from "../src/lib/money.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/20260924120000_paperstreet.sql", import.meta.url),
  "utf8",
);
const trade = readFileSync(new URL("../src/lib/actions/trade.ts", import.meta.url), "utf8");
const alpaca = readFileSync(new URL("../src/lib/market-data/alpaca.ts", import.meta.url), "utf8");

test("cash and order totals are integer cents", () => {
  assert.equal(typeof STARTING_CASH_CENTS, "bigint");
  assert.equal(STARTING_CASH_CENTS, 10000000n);
  assert.equal(decimalToCents("100000.00"), 10000000n);
  assert.equal(valueCents(100000000n, 1500000n), 150n);
  assert.match(migration, /cash_cents bigint not null default 10000000/);
  assert.match(migration, /total_cents bigint not null/);
});

test("paper orders are not sent to a broker", () => {
  assert.match(trade, /execute_paper_trade/);
  assert.doesNotMatch(trade, /\/v2\/orders/);
  assert.doesNotMatch(alpaca, /\/v2\/orders/);
  assert.doesNotMatch(alpaca, /method:\s*["']POST["']/);
});
