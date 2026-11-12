import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { LIMITS, overLimit, resetLimits } from "../src/lib/rate-limit.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("a burst past the limit is refused, then allowed again after the window", () => {
  resetLimits();
  const t0 = 1_000_000;
  for (let i = 0; i < LIMITS.signIn.max; i += 1) {
    assert.equal(overLimit(LIMITS.signIn, "1.2.3.4", t0), false);
  }
  assert.equal(overLimit(LIMITS.signIn, "1.2.3.4", t0), true);
  assert.equal(overLimit(LIMITS.signIn, "5.6.7.8", t0), false);
  assert.equal(overLimit(LIMITS.signIn, "1.2.3.4", t0 + LIMITS.signIn.windowMs + 1), false);
});

test("limits are separate per action", () => {
  resetLimits();
  for (let i = 0; i < LIMITS.reset.max; i += 1) overLimit(LIMITS.reset, "u1", 5);
  assert.equal(overLimit(LIMITS.reset, "u1", 5), true);
  assert.equal(overLimit(LIMITS.order, "u1", 5), false);
});

for (const [action, limit, allowed, windowMs] of [
  ["order", LIMITS.order, 30, 60_000],
  ["reset", LIMITS.reset, 3, 600_000],
  ["password", LIMITS.password, 5, 600_000],
]) {
  test(`${action} refuses excess attempts per account until its window resets`, () => {
    resetLimits();
    const now = 1_000_000;
    for (let attempt = 0; attempt < allowed; attempt += 1) {
      assert.equal(overLimit(limit, "account-one", now), false);
    }
    assert.equal(overLimit(limit, "account-one", now), true);
    assert.equal(overLimit(limit, "account-two", now), false);
    assert.equal(overLimit(limit, "account-one", now + windowMs - 1), true);
    assert.equal(overLimit(limit, "account-one", now + windowMs), false);
  });
}

test("sign-in and sign-up run on the server behind a limit", () => {
  const actions = read("src/lib/actions/auth.ts");
  assert.ok(actions.indexOf("overLimit(LIMITS.signIn") < actions.indexOf("signInWithPassword"));
  assert.ok(actions.indexOf("overLimit(LIMITS.signUp") < actions.indexOf("auth.signUp"));
  const forms = read("src/components/auth/auth-forms.tsx");
  assert.doesNotMatch(forms, /signInWithPassword|auth\.signUp/);
});

test("every costly action checks its limit before doing work", () => {
  const trade = read("src/lib/actions/trade.ts");
  assert.ok(trade.indexOf("overLimit(LIMITS.order") < trade.indexOf("createAdminClient()"));
  const settings = read("src/lib/actions/settings.ts");
  assert.ok(settings.indexOf("overLimit(LIMITS.password") < settings.indexOf("signInWithPassword"));
  assert.ok(settings.indexOf("overLimit(LIMITS.reset") < settings.indexOf("reset_paper_account"));
});

test("quotes and bars share a per-user limit and refuse before fetching market data", () => {
  for (const [route, subject, provider] of [
    ["quotes", "data.user.id", "getQuotes"],
    ["bars", "user.id", "getBars"],
  ]) {
    const text = read(`src/app/api/${route}/route.ts`);
    const guard = text.indexOf(`overLimit(LIMITS.marketData, ${subject})`);
    const refusal = text.indexOf("status: 429", guard);
    const fetch = text.indexOf(`${provider}(`);
    assert.ok(guard >= 0 && refusal > guard && fetch > refusal, route);
  }

  resetLimits();
  const now = 1_000_000;
  for (let request = 0; request < 120; request += 1) {
    assert.equal(overLimit(LIMITS.marketData, "account-one", now), false);
  }
  assert.equal(overLimit(LIMITS.marketData, "account-one", now), true);
  assert.equal(overLimit(LIMITS.marketData, "account-two", now), false);
  assert.equal(overLimit(LIMITS.marketData, "account-one", now + 60_000), false);
});
