import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("a repeated order key returns the first result and does not place another", async () => {
  const { priorOrder, rememberOrder } = await import("../src/lib/order-retry.ts");
  const key = `user-1:${crypto.randomUUID()}`;
  assert.equal(priorOrder(key), null);
  rememberOrder(key, { ok: true, message: "Bought AAPL at the latest market price." });
  assert.deepEqual(priorOrder(key), {
    ok: true,
    message: "Bought AAPL at the latest market price.",
  });
});

test("watchlist retries and order failures stay safe", () => {
  const watchlist = readFileSync("src/lib/actions/watchlist.ts", "utf8");
  const trade = readFileSync("src/lib/actions/trade.ts", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert.match(watchlist, /23505[\s\S]{0,80}ok: true/);
  assert.match(trade, /recordJourneyError\("order", error\)/);
  assert.match(trade, /priorOrder\(retryKey\)/);
  assert.match(readme, /does not call `execute_paper_trade` again/);
  assert.match(readme, /Try again/);
});
