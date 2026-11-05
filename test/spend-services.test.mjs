import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the readme names the paid services and no others", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const section = readme.split("Paid services a deployment can turn on:")[1]?.split("## ")[0] ?? "";
  assert.match(section, /Supabase/);
  assert.match(section, /Alpaca/);
  assert.doesNotMatch(section, /Twilio|Stripe|OpenAI/);
});
