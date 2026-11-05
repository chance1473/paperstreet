import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const action = readFileSync(new URL("../src/lib/actions/settings.ts", import.meta.url), "utf8");
const form = readFileSync(new URL("../src/components/settings/settings-forms.tsx", import.meta.url), "utf8");

test("changing the password first checks the current password", () => {
  const start = action.indexOf("export async function updatePassword");
  const body = action.slice(start, action.indexOf("export async function resetPaperAccount"));
  const reauth = body.indexOf("signInWithPassword");
  const update = body.indexOf("auth.updateUser");
  assert.ok(reauth > 0 && update > reauth);
  assert.match(body, /Your current password is not correct\./);
});

test("the settings form asks for the current password", () => {
  assert.match(form, /name="current"/);
  assert.match(form, /current: String\(formData\.get\("current"\)/);
});
