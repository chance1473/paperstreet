import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PROFILE_IMAGE_MAX_BYTES,
  deskSurface,
  inspectProfileImage,
  acceptedProfileImagePath,
  profileImageUploadTarget,
  soundtrackSrc,
} from "../src/lib/appearance.ts";

const userId = "11111111-1111-1111-1111-111111111111";

test("picture and background files use the private profile-images bucket", () => {
  assert.deepEqual(profileImageUploadTarget(userId, "avatar"), {
    bucket: "profile-images",
    path: `${userId}/avatar`,
  });
  assert.deepEqual(profileImageUploadTarget(userId, "background"), {
    bucket: "profile-images",
    path: `${userId}/background`,
  });
  assert.throws(() => profileImageUploadTarget("../other", "avatar"));
});

test("only jpeg, png, and webp images up to 2 MB are accepted", () => {
  assert.equal(PROFILE_IMAGE_MAX_BYTES, 2 * 1024 * 1024);
  assert.equal(inspectProfileImage({ type: "image/jpeg", size: 20 }).ok, true);
  assert.equal(inspectProfileImage({ type: "image/jpg", size: 20 }).ok, true);
  assert.equal(inspectProfileImage({ type: "image/png", size: PROFILE_IMAGE_MAX_BYTES }).ok, true);
  assert.equal(inspectProfileImage({ type: "image/webp", size: 20 }).ok, true);
  assert.equal(inspectProfileImage({ type: "", name: "desk.webp", size: 20 }).ok, true);
  assert.equal(inspectProfileImage({ type: "image/gif", size: 20 }).ok, false);
  assert.equal(inspectProfileImage({ type: "image/png", size: PROFILE_IMAGE_MAX_BYTES + 1 }).ok, false);
  assert.equal(inspectProfileImage({ type: "image/png", size: 0 }).ok, false);
});

test("a saved image path is not turned into a public storage url", () => {
  const source = readFileSync(new URL("../src/lib/appearance.ts", import.meta.url), "utf8");
  assert.equal(acceptedProfileImagePath(`${userId}/avatar`), `${userId}/avatar`);
  assert.equal(acceptedProfileImagePath(`${userId}/../secret`), null);
  assert.equal(acceptedProfileImagePath(null), null);
  assert.doesNotMatch(source, /object\/public/);
  assert.equal(deskSurface("ledger").className, "desk-ledger");
  assert.equal(deskSurface("dusk").className, "desk-dusk");
  assert.equal(deskSurface(null).className, "desk-ink");
  assert.equal(deskSurface(`${userId}/background`).className, "desk-ink");
  assert.match(deskSurface(`${userId}/background`, "https://example.supabase.co/object/sign/profile-images/a?token=1").style?.backgroundImage ?? "", /token=1/);
});

test("the soundtrack list is the three built-in tracks", () => {
  assert.equal(soundtrackSrc("opening-bell"), "/soundtracks/opening-bell.wav");
  assert.equal(soundtrackSrc("quiet-tape"), "/soundtracks/quiet-tape.wav");
  assert.equal(soundtrackSrc("after-hours"), "/soundtracks/after-hours.wav");
  assert.equal(soundtrackSrc("autoplay"), null);
  assert.equal(soundtrackSrc(null), null);
  for (const id of ["opening-bell", "quiet-tape", "after-hours"]) {
    const file = readFileSync(new URL(`../public/soundtracks/${id}.wav`, import.meta.url));
    assert.equal(file.subarray(0, 4).toString("ascii"), "RIFF");
  }
});

test("play and stop stay on the settings page", () => {
  const forms = readFileSync(new URL("../src/components/settings/settings-forms.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/(platform)/settings/page.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../src/components/layout/app-shell.tsx", import.meta.url), "utf8");
  assert.match(page, /AppearanceForm/);
  assert.match(forms, /soundtrackSrc\(soundtrack\)/);
  assert.match(forms, />\s*Play\s*</);
  assert.match(forms, />\s*Stop\s*</);
  assert.match(forms, /<audio ref=\{audioRef\} preload="none" \/>/);
  assert.doesNotMatch(forms, /autoPlay|autoplay/);
  assert.match(forms, /username: String\(formData\.get\("username"\)/);
  assert.match(forms, /displayName: String\(formData\.get\("displayName"\)/);
  assert.doesNotMatch(shell, /soundtrack|opening-bell|quiet-tape|after-hours|profile-images/);
});
