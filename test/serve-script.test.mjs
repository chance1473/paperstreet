import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("dev and start listen without a production build", () => {
  const script = readFileSync(new URL("../scripts/serve.mjs", import.meta.url), "utf8");
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.dev, "node scripts/serve.mjs");
  assert.equal(pkg.scripts.start, "node scripts/serve.mjs");
  assert.match(script, /process\.env\.PORT/);
  assert.match(script, /server\.listen\(port,/);
  const listenAt = script.indexOf("server.listen(port");
  const bootAt = script.indexOf("spawn(");
  assert.ok(listenAt !== -1 && bootAt > listenAt);
  assert.match(script, /"next"/);
  assert.match(script, /http:\/\/127\.0\.0\.1/);
  assert.match(script, /Invested/);
  assert.match(script, /Profit or loss/);
  assert.match(script, /SIGHUP/);
  assert.match(script, /0\.0\.0\.0/);
  assert.doesNotMatch(script, /process\.exit/);
});
