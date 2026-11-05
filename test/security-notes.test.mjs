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

test("the anonymous error endpoint is bounded", () => {
  const route = read("src/app/api/errors/route.ts");
  assert.match(route, /status: 429/);
  assert.match(route, /status: 413/);
  assert.match(route, /MAX_MESSAGE_CHARS/);
  assert.ok(route.indexOf("limited(request)") < route.indexOf("recordJourneyError("));
});

test("the callback only redirects to known pages on this app", () => {
  const route = read("src/app/auth/callback/route.ts");
  assert.match(route, /DESTINATIONS\.find\(\(path\) => path === next\)/);
  assert.match(route, /new URL\(destination\(next\), url\.origin\)/);
  assert.doesNotMatch(route, /new URL\(next, url\.origin\)/);
});
