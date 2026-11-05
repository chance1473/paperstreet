import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

function tooManyAttempts(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

function appPath(next: string) {
  if (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\") &&
    !next.includes("://")
  ) {
    return next;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") ?? "/dashboard";
  const next = appPath(requested);
  if (next !== requested) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  if (code && tooManyAttempts(request)) {
    return new NextResponse("Too many confirmation attempts. Wait a minute and try again.", {
      status: 429,
    });
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
