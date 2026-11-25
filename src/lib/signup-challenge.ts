import { createHmac, timingSafeEqual } from "node:crypto";

const WINDOW_MS = 10 * 60 * 1000;

export function signupChallengeSecret() {
  const dedicated = process.env.SIGNUP_CHALLENGE_SECRET;
  if (typeof dedicated === "string" && dedicated !== "") return dedicated;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof service === "string" && service !== "") return service;
  return null;
}

export function issueSignupChallenge(now = Date.now()) {
  const secret = signupChallengeSecret();
  if (!secret) throw new Error("Sign-up challenge secret is not configured.");
  const issued = String(now);
  const signature = createHmac("sha256", secret).update(issued).digest("hex");
  return `${issued}.${signature}`;
}

export function signupChallengeError(
  input: { challenge?: string; website?: string },
  now = Date.now(),
) {
  if (String(input.website ?? "") !== "") return "Sign-up could not be completed.";
  const secret = signupChallengeSecret();
  if (!secret) return "Sign-up could not be completed.";
  const token = String(input.challenge ?? "");
  const split = token.indexOf(".");
  if (split < 1) return "Sign-up could not be completed.";
  const issued = token.slice(0, split);
  const signature = token.slice(split + 1);
  if (!/^\d+$/.test(issued)) return "Sign-up could not be completed.";
  const expected = createHmac("sha256", secret).update(issued).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return "Sign-up could not be completed.";
  }
  const age = now - Number(issued);
  if (age > WINDOW_MS || age < -60_000) return "Sign-up could not be completed.";
  return null;
}
