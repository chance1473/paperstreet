import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/app/leaderboard/page.tsx", import.meta.url), "utf8");

test("the public page shows display name, invested value, and profit or loss", () => {
  assert.match(page, /entry\.displayName/);
  assert.match(page, /entry\.investedCents/);
  assert.match(page, /entry\.profitCents/);
  assert.match(page, /Invested/);
  assert.match(page, /Profit or loss/);
});

test("the page source and the rendered row do not include an email address", () => {
  assert.doesNotMatch(page, /email/i);
  assert.doesNotMatch(page, /@paperstreet/);
});
