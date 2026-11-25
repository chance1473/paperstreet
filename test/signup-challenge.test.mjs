import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.SIGNUP_CHALLENGE_SECRET = "test-secret";
const { issueSignupChallenge, signupChallengeError } = await import("../src/lib/signup-challenge.ts");

test("a scripted sign-up without a valid server challenge is refused", () => {
  const now = Date.now();
  const token = issueSignupChallenge(now);
  assert.equal(signupChallengeError({ challenge: token, website: "" }, now), null);
  assert.ok(signupChallengeError({ challenge: "", website: "" }, now));
  assert.ok(signupChallengeError({ challenge: token, website: "filled" }, now));
  assert.ok(signupChallengeError({ challenge: token, website: "" }, now + 11 * 60 * 1000));
  assert.ok(signupChallengeError({ challenge: `${now}.${"0".repeat(64)}`, website: "" }, now));

  const auth = readFileSync("src/lib/actions/auth.ts", "utf8");
  const check = auth.indexOf("signupChallengeError");
  const call = auth.indexOf("supabase.auth.signUp");
  assert.ok(check > -1 && check < call);
  const form = readFileSync("src/components/auth/auth-forms.tsx", "utf8");
  assert.match(form, /name="challenge"/);
  assert.match(form, /name="website"/);
  assert.match(form, /challenge: String\(formData.get\("challenge"\)/);
  const page = readFileSync("src/app/signup/page.tsx", "utf8");
  assert.match(page, /issueSignupChallenge/);
  const browser = readFileSync("src/lib/signup-challenge.ts", "utf8");
  assert.match(browser, /createHmac/);
  assert.doesNotMatch(browser, /NEXT_PUBLIC_/);
});
