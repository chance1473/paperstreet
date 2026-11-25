import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the test plan names a logic test and a browser test, or a gap, for each critical flow", () => {
  const plan = readFileSync("docs/test-plan.md", "utf8");
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(pkg.description, /docs\/test-plan.md/);
  for (const name of [
    "test/auth-return.test.mjs",
    "test/paper-invariants.test.mjs",
    "e2e/smoke.spec.ts",
    "e2e/paper-trading.spec.ts",
  ]) {
    assert.match(plan, new RegExp(name.replaceAll(".", "\\.")));
  }
  assert.match(plan, /Gap/);
});
