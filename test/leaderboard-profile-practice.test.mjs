import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ownedProfileImageUrl } from "../src/lib/appearance.ts";
import { liveBookRank } from "../src/lib/leaderboard-rank.ts";
import { formatCents, formatSignedCents } from "../src/lib/money.ts";

const page = readFileSync(new URL("../src/app/leaderboard/page.tsx", import.meta.url), "utf8");
const portfolio = readFileSync(new URL("../src/lib/portfolio.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/layout/app-shell.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/(platform)/layout.tsx", import.meta.url), "utf8");
const replay = readFileSync(new URL("../src/lib/simulated/replay.ts", import.meta.url), "utf8");

const userId = "11111111-1111-1111-1111-111111111111";
const otherId = "22222222-2222-2222-2222-222222222222";

test("the public leaderboard shows a saved profile image and keeps invested and profit labels", () => {
  assert.match(page, /entry\.avatarUrl/);
  assert.match(page, /entry\.displayName/);
  assert.match(page, /entry\.investedCents/);
  assert.match(page, /entry\.profitCents/);
  assert.match(page, /Invested/);
  assert.match(page, /Profit or loss/);
  assert.match(page, /Practice books/);
  assert.match(page, /ownedProfileImageUrl/);
  assert.doesNotMatch(page, /email/i);
  assert.doesNotMatch(page, /soundtrack|opening-bell|quiet-tape|after-hours|<audio/i);
  assert.doesNotMatch(page, /execute_paper_trade/);
});

test("a signed-in profile image is shown in the app shell", () => {
  assert.match(shell, /avatarUrl/);
  assert.match(shell, /<img/);
  assert.match(shell, /Profile picture/);
  assert.match(layout, /ownedProfileImageUrl\(user\.id, profile\?\.avatarPath\)/);
  assert.match(layout, /avatarUrl=\{ownedProfileImageUrl/);
  assert.doesNotMatch(shell, /soundtrack|opening-bell|quiet-tape|after-hours|profile-images/);
  assert.doesNotMatch(shell, /email/i);
});

test("image paths stay under the owner id in the profile-images bucket", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/";
  try {
    assert.equal(
      ownedProfileImageUrl(userId, `${userId}/avatar`),
      `https://example.supabase.co/storage/v1/object/public/profile-images/${userId}/avatar`,
    );
    assert.equal(ownedProfileImageUrl(userId, `${userId}/../secret`), null);
    assert.equal(ownedProfileImageUrl(userId, `${otherId}/avatar`), null);
    assert.equal(ownedProfileImageUrl(userId, null), null);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});

test("the practice book is ranked from persisted positions beside the live book", () => {
  assert.match(portfolio, /simulated_accounts/);
  assert.match(portfolio, /simulated_positions/);
  assert.match(portfolio, /avatar_path/);
  assert.match(portfolio, /rankBooks\("live"/);
  assert.match(portfolio, /rankBooks\(\s*"practice"/);
  assert.match(portfolio, /liveBookRank/);
  assert.doesNotMatch(portfolio, /execute_paper_trade/);
  assert.doesNotMatch(portfolio, /replayResult/);
  assert.doesNotMatch(portfolio, /email/i);
  assert.match(replay, /export function replayResult/);
  assert.doesNotMatch(replay, /execute_paper_trade|insert\(|simulated_positions/);

  const emptyPractice = liveBookRank(10_000_000n, 0n);
  assert.equal(emptyPractice.investedCents, 0n);
  assert.equal(formatCents(emptyPractice.investedCents), "$0.00");
  assert.equal(formatSignedCents(emptyPractice.profitCents), "$0.00");
  assert.equal(formatCents(emptyPractice.valueCents), "$100,000.00");
});
