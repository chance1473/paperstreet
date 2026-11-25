import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("outside workflow steps are pinned to a commit, and the node settings stay", () => {
  const workflow = readFileSync(".github/workflows/checks.yml", "utf8");
  assert.match(workflow, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.doesNotMatch(workflow, /uses:.*@v\d/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /cache: npm/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches: \[main\]/);
});
