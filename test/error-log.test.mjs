import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("a deliberate journey error is stored without secrets", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "paperstreet-errors-"));
  process.env.JOURNEY_ERROR_LOG = path.join(dir, "journey-errors.log");
  const { recordJourneyError } = await import("../src/lib/errors.ts");
  recordJourneyError("order", new Error("deliberate-journey-failure password=hunter2"));
  const stored = readFileSync(process.env.JOURNEY_ERROR_LOG, "utf8");
  assert.match(stored, /deliberate-journey-failure/);
  assert.match(stored, /password=\[redacted\]/);
  assert.doesNotMatch(stored, /hunter2/);
});

test("the show-errors script prints a recorded deliberate failure", async () => {
  const { execFileSync } = await import("node:child_process");
  const dir = mkdtempSync(path.join(tmpdir(), "paperstreet-show-"));
  const log = path.join(dir, "journey-errors.log");
  process.env.JOURNEY_ERROR_LOG = log;
  const { recordJourneyError } = await import("../src/lib/errors.ts");
  recordJourneyError("market-data", new Error("deliberate-provider-failure token=abc123"));
  const out = execFileSync("node", ["scripts/show-errors.mjs"], {
    env: { ...process.env, JOURNEY_ERROR_LOG: log },
    encoding: "utf8",
  });
  assert.match(out, /market-data/);
  assert.match(out, /deliberate-provider-failure/);
  assert.doesNotMatch(out, /abc123/);
});

test("market-data routes and sign-up record their failures", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["src/app/api/quotes/route.ts", "src/app/api/bars/route.ts"]) {
    assert.match(readFileSync(f, "utf8"), /recordJourneyError\("market-data"/);
  }
  assert.match(readFileSync("src/lib/actions/auth.ts", "utf8"), /recordJourneyError\("sign-up"/);
});
