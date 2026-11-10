import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the auth callback refuses an off-site next target before any session work", () => {
  const route = read("src/app/auth/callback/route.ts");
  const guard = route.indexOf("if (next !== requested)");
  assert.ok(guard > 0);
  assert.ok(guard < route.indexOf("exchangeCodeForSession"));
  assert.match(route, /!next\.startsWith\("\/\/"\)/);
  assert.match(route, /!next\.includes\("\\\\"\)/);
});

test("anonymous error reports use a shared quota and a fixed log message", () => {
  const route = read("src/app/api/errors/route.ts");
  assert.match(route, /max: 20, windowMs: 60_000/);
  assert.match(route, /status: 429/);
  assert.match(route, /status: 403/);
  const limit = route.indexOf('overLimit(browserReports, "all")');
  const log = route.indexOf('recordJourneyError("page", new Error("Page render failed"))');
  assert.ok(limit >= 0 && log > limit);
  assert.doesNotMatch(route, /request\.(json|text|body)\b/);

  const proxy = read("src/proxy.ts");
  const publicReport = proxy.indexOf('request.method === "POST" && request.nextUrl.pathname === "/api/errors"');
  assert.ok(publicReport >= 0 && publicReport < proxy.indexOf("supabase.auth.getUser()"));
});

test("the callback only redirects to known pages on this app", () => {
  const route = read("src/app/auth/callback/route.ts");
  assert.match(route, /DESTINATIONS\.find\(\(path\) => path === next\)/);
  assert.match(route, /response\.headers\.set\("Location", destination\(next\)\)/);
  assert.match(route, /Location: "\/login\?error=auth"/);
  assert.match(route, /response\.cookies\.set\(name, value, options\)/);
  assert.doesNotMatch(route, /url\.origin|request\.headers\.get\("(host|x-forwarded-host)"\)/i);
});
