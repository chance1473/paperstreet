import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the readme records where each spending alert and hard stop is set", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const section = readme.split("Where each spending alert and hard stop is set:")[1]?.split("## ")[0] ?? "";
  assert.match(section, /Supabase: the organization billing page/);
  assert.match(section, /Alpaca: the account billing page/);
  assert.match(section, /does not store amounts/);
  assert.doesNotMatch(section, /sk_live|service_role|api[_-]?key\s*[:=]\s*\S+/i);
});
