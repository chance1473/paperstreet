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

test("redaction removes bearer values and quoted credentials", async () => {
  const { redact } = await import("../src/lib/errors.ts");
  const message =
    'Authorization: Bearer opaque-token {"password":"quoted secret","api_key":"key with \\"quote\\""}';
  const redacted = redact(message);
  assert.equal(redacted, 'Authorization=[redacted] {"password"=[redacted],"api_key"=[redacted]}');
});
