import assert from "node:assert/strict";
import test from "node:test";

import { advanceClock, barAt } from "../src/lib/simulated/clock.ts";

const bars = [
  { time: 1, price: 10 },
  { time: 2, price: 11 },
  { time: 3, price: 12 },
  { time: 4, price: 13 },
];

test("a clock can move through bars the app already loaded", () => {
  assert.deepEqual(barAt(bars, 0), bars[0]);
  const moved = advanceClock(bars, 0, 1);
  assert.equal(moved.index, 1);
  assert.deepEqual(moved.bar, bars[1]);
});

test("a faster setting reaches a later stored bar without creating a price", () => {
  const moved = advanceClock(bars, 0, 10);
  assert.equal(moved.index, 3);
  assert.deepEqual(moved.bar, bars[3]);
  assert.equal(bars.some((bar) => bar.price === moved.bar.price), true);
});

test("the clock does not change the live paper account", () => {
  const before = bars.map((bar) => ({ ...bar }));
  advanceClock(bars, 0, 60);
  assert.deepEqual(bars, before);
  assert.equal(advanceClock([], 0, 1).bar, null);
});
