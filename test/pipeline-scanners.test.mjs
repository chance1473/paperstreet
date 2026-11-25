import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the checks workflow runs three scanners and fails on a serious finding", () => {
  const workflow = readFileSync(".github/workflows/checks.yml", "utf8");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches: \[main\]/);
  for (const job of ["static-analysis:", "dependency-scan:", "secret-scan:"]) {
    assert.match(workflow, new RegExp(job));
  }
  assert.match(workflow, /name: eslint/);
  assert.match(workflow, /name: npm-audit/);
  assert.match(workflow, /name: gitleaks/);
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});
