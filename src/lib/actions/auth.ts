"use server";

import { headers } from "next/headers";

import { recordJourneyError } from "@/lib/errors";
import { LIMITS, clientAddress, overLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; confirmed: boolean } | { ok: false; message: string };

function appOrigin(requestHeaders: Headers) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  return requestHeaders.get("origin") ?? "http://localhost:3000";
}

const TOO_MANY = "Too many attempts. Wait a few minutes and try again.";

export async function signIn(input: { email: string; password: string }): Promise<Result> {
  const address = clientAddress(await headers());
  if (overLimit(LIMITS.signIn, address)) return { ok: false, message: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(input.email ?? ""),
    password: String(input.password ?? ""),
  });
  if (error) {
    recordJourneyError("sign-in", new Error("Sign-in failed"));
    return { ok: false, message: "Email or password is incorrect." };
  }
  return { ok: true, confirmed: true };
}

export async function signUp(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}): Promise<Result> {
  const requestHeaders = await headers();
  const address = clientAddress(requestHeaders);
  if (overLimit(LIMITS.signUp, address)) return { ok: false, message: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(input.email ?? ""),
    password: String(input.password ?? ""),
    options: {
      emailRedirectTo: `${appOrigin(requestHeaders)}/auth/callback`,
      data: {
        username: String(input.username ?? "").toLowerCase(),
        display_name: String(input.displayName ?? ""),
      },
    },
  });
  if (error) {
    recordJourneyError("sign-up", new Error("Sign-up failed"));
    return { ok: false, message: error.message || "Account could not be created." };
  }
  return { ok: true, confirmed: Boolean(data.session) };
}
