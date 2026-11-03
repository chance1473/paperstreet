import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("dev and start listen without a production build", () => {
  const script = readFileSync(new URL("../scripts/serve.mjs", import.meta.url), "utf8");
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.dev, "node scripts/serve.mjs");
  assert.equal(pkg.scripts.start, "node scripts/serve.mjs");
  assert.match(script, /server\.listen\(port, "0\.0\.0\.0"/);
  assert.match(script, /Invested/);
  assert.match(script, /Profit or loss/);
  assert.doesNotMatch(script, /process\.exit/);
});
