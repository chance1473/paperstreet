import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the build names a maintained Node 22 runtime and the hosted runner image", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const workflow = readFileSync(".github/workflows/checks.yml", "utf8");
  assert.equal(pkg.engines.node, "22.x");
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /ubuntu-latest/);
  assert.match(workflow, /maintained through April 2027/);
});
