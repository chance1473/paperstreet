import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PROFILE_IMAGE_MAX_BYTES,
  deskSurface,
  inspectProfileImage,
  profileImagePublicUrl,
  profileImageUploadTarget,
  soundtrackSrc,
} from "../src/lib/appearance.ts";

const userId = "11111111-1111-1111-1111-111111111111";

test("picture and background files use the public profile-images bucket", () => {
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

test("a saved image path becomes a public profile-images url", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/";
  try {
    assert.equal(
      profileImagePublicUrl(`${userId}/avatar`),
      `https://example.supabase.co/storage/v1/object/public/profile-images/${userId}/avatar`,
    );
    assert.equal(profileImagePublicUrl(`${userId}/../secret`), null);
    assert.equal(profileImagePublicUrl(null), null);
    assert.equal(deskSurface("ledger").className, "desk-ledger");
    assert.equal(deskSurface("dusk").className, "desk-dusk");
    assert.equal(deskSurface(null).className, "desk-ink");
    assert.match(deskSurface(`${userId}/background`).style?.backgroundImage ?? "", /profile-images/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
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
