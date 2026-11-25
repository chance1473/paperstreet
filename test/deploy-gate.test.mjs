import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the deploy job waits for npm test and an expired quarantine fails", () => {
  const workflow = readFileSync(".github/workflows/checks.yml", "utf8");
  const pack = JSON.parse(readFileSync("package.json", "utf8"));
  const quarantine = JSON.parse(readFileSync("test/quarantine.json", "utf8"));
  const checker = readFileSync("scripts/check-quarantine.mjs", "utf8");
  const doc = readFileSync("docs/readiness-operations.md", "utf8");
  assert.match(workflow, /needs: test/);
  assert.match(workflow, /run: npm test/);
  assert.doesNotMatch(workflow, /continue-on-error/);
  assert.equal(pack.scripts.test.includes("test/*.test.mjs"), true);
  assert.equal(pack.scripts.pretest, "node scripts/check-quarantine.mjs");
  assert.ok(Array.isArray(quarantine));
  assert.match(checker, /expires/);
  assert.match(checker, /process\.exit\(1\)/);
  assert.match(doc, /needs: test/);
  assert.match(doc, /No test is deleted/);
});
