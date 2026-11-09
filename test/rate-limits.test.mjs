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
  for (const route of ["src/app/api/quotes/route.ts", "src/app/api/bars/route.ts"]) {
    const text = read(route);
    assert.match(text, /status: 429/);
    assert.ok(text.indexOf("overLimit(LIMITS.marketData") < text.search(/getQuotes\(|getBars\(/));
  }
});

test("the error and confirmation routes use the shared limiter", () => {
  for (const route of ["src/app/api/errors/route.ts", "src/app/auth/callback/route.ts"]) {
    const text = read(route);
    assert.match(text, /from "@\/lib\/rate-limit"/);
    assert.doesNotMatch(text, /new Map</);
  }
});
