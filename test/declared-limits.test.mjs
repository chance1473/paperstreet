import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the limits page states supported scope and unsupported uses", () => {
  const page = readFileSync("src/app/limits/page.tsx", "utf8");
  const home = readFileSync("src/app/page.tsx", "utf8");
  assert.match(page, /\$100,000 of simulated cash/);
  assert.match(page, /No real money|Real money, deposits/);
  assert.match(page, /orders sent to a broker/);
  assert.match(page, /Limit, stop, short/);
  assert.match(page, /not a plan for later/);
  assert.doesNotMatch(page, /coming soon|roadmap|will support/i);
  assert.match(home, /href="\/limits"/);
});
