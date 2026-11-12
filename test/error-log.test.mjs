import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("a deliberate journey error is stored with its source and without secrets", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "paperstreet-errors-"));
  const file = path.join(dir, "journey-errors.log");
  const previousFile = process.env.JOURNEY_ERROR_LOG;
  t.after(() => {
    if (previousFile === undefined) delete process.env.JOURNEY_ERROR_LOG;
    else process.env.JOURNEY_ERROR_LOG = previousFile;
    rmSync(dir, { recursive: true, force: true });
  });
  process.env.JOURNEY_ERROR_LOG = file;

  const { recordJourneyError } = await import("../src/lib/errors.ts");
  recordJourneyError("order", new Error(
    'deliberate-journey-failure password=plain-fixture {"api_key":"json-fixture"} Authorization: Bearer bearer-fixture',
  ));

  const stored = readFileSync(file, "utf8");
  const entry = JSON.parse(stored);
  assert.equal(entry.source, "order");
  assert.equal(entry.message,
    'deliberate-journey-failure password=[redacted] {"api_key"=[redacted]} Authorization=[redacted]');
  assert.doesNotMatch(stored, /plain-fixture|json-fixture|bearer-fixture/);
});

test("redaction removes bearer values and quoted credentials", async () => {
  const { redact } = await import("../src/lib/errors.ts");
  const message =
    'Authorization: Bearer opaque-token {"password":"quoted secret","api_key":"key with \\"quote\\""}';
  const redacted = redact(message);
  assert.equal(redacted, 'Authorization=[redacted] {"password"=[redacted],"api_key"=[redacted]}');
});
