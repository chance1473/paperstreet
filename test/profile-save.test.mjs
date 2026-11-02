import assert from "node:assert/strict";
import test from "node:test";

import { profileAppearanceUpdate } from "../src/lib/validation.ts";

const userId = "11111111-1111-1111-1111-111111111111";
const otherId = "22222222-2222-2222-2222-222222222222";

const base = {
  username: "caseylane",
  displayName: "Casey L.",
};

test("a signed-in person can save their own picture, background, and soundtrack", () => {
  const result = profileAppearanceUpdate(userId, {
    ...base,
    avatarPath: `${userId}/avatar.png`,
    backgroundChoice: "ledger",
    soundtrackChoice: "quiet-tape",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.row, {
    username: "caseylane",
    display_name: "Casey L.",
    avatar_path: `${userId}/avatar.png`,
    background_choice: "ledger",
    soundtrack_choice: "quiet-tape",
  });
});

test("the same update refuses another person's file path", () => {
  const picture = profileAppearanceUpdate(userId, {
    ...base,
    avatarPath: `${otherId}/avatar.png`,
  });
  assert.equal(picture.ok, false);

  const background = profileAppearanceUpdate(userId, {
    ...base,
    backgroundChoice: `${userId}/../${otherId}/background.png`,
  });
  assert.equal(background.ok, false);
});

test("display name and username updates still work", () => {
  const result = profileAppearanceUpdate(userId, {
    username: "casey_lane",
    displayName: "Casey Lane",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.row.username, "casey_lane");
  assert.equal(result.row.display_name, "Casey Lane");
  assert.equal("avatar_path" in result.row, false);
});
