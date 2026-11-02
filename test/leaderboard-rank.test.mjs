import assert from "node:assert/strict";
import test from "node:test";

import { liveBookRank } from "../src/lib/leaderboard-rank.ts";

test("the ranking result includes invested cents and profit or loss cents for each live paper book", () => {
  const ranked = liveBookRank(9_000_000n, 2_000_000n);
  assert.equal(ranked.investedCents, 2_000_000n);
  assert.equal(ranked.profitCents, 1_000_000n);
  assert.equal(ranked.valueCents, 11_000_000n);
});

test("a book with no positions has invested cents of 0", () => {
  assert.equal(liveBookRank(10_000_000n, 0n).investedCents, 0n);
});

test("profit or loss is account value minus 10000000 cents", () => {
  const ranked = liveBookRank(8_000_000n, 1_000_000n);
  assert.equal(ranked.profitCents, ranked.valueCents - 10_000_000n);
  assert.equal(ranked.profitCents, -1_000_000n);
});
