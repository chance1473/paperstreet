import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("production start builds before it serves", () => {
  const script = readFileSync(new URL("../scripts/serve.mjs", import.meta.url), "utf8");
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.start, "node scripts/serve.mjs");
  assert.match(script, /\.next\/BUILD_ID/);
  assert.match(script, /next", "build"/);
  assert.match(script, /next", "start"/);
});
