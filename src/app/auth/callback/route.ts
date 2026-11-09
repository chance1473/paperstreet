import { NextResponse } from "next/server";

import { LIMITS, clientAddress, overLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

function tooManyAttempts(request: Request) {
  return overLimit(LIMITS.confirm, clientAddress(request.headers));
}

const DESTINATIONS = [
  "/dashboard",
  "/portfolio",
  "/markets",
  "/watchlist",
  "/transactions",
  "/settings",
  "/simulated",
  "/leaderboard",
] as const;

function destination(next: string) {
  return DESTINATIONS.find((path) => path === next) ?? "/dashboard";
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
      return NextResponse.redirect(new URL(destination(next), url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
