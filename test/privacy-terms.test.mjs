import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("privacy and terms name the data collected and the services it is shared with", () => {
  const privacy = readFileSync("src/app/privacy/page.tsx", "utf8");
  const terms = readFileSync("src/app/terms/page.tsx", "utf8");
  const home = readFileSync("src/app/page.tsx", "utf8");
  for (const word of ["email", "watchlist", "Supabase", "market-data", "leaderboard"]) {
    assert.match(privacy, new RegExp(word));
  }
  assert.match(terms, /simulated/);
  assert.match(terms, /market-data provider/);
  assert.match(terms, /email/);
  assert.match(home, /href="\/privacy"/);
  assert.match(home, /href="\/terms"/);
});
