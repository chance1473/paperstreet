import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { replayResult } from "../src/lib/simulated/replay.ts";

const desk = readFileSync(
  new URL("../src/components/trading/simulated-desk.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../src/app/(platform)/simulated/page.tsx", import.meta.url),
  "utf8",
);

test("a signed-in person can open a simulated section that uses the separate book", () => {
  assert.match(page, /simulated_accounts/);
  assert.match(page, /SimulatedDesk/);
});

test("the section can run the faster clock and shows whether the simulated investment gained or lost", () => {
  assert.match(desk, /advanceClock/);
  const gained = replayResult(10_000_000n, 100, 110);
  assert.equal(gained.changeCents > 0n, true);
  const lost = replayResult(10_000_000n, 100, 90);
  assert.equal(lost.changeCents < 0n, true);
});

test("the live paper account balance stays unchanged", () => {
  const live = 9_969_207n;
  const before = live;
  replayResult(10_000_000n, 100, 110);
  assert.equal(live, before);
  assert.match(desk, /live paper balance stays/);
  assert.doesNotMatch(desk, /paper_accounts/);
});
