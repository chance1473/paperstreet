import { NextResponse, type NextRequest } from "next/server";

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") ?? "/dashboard";
  const next = appPath(requested);
  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: "/login?error=auth", "Cache-Control": "private, no-store" },
  });
  if (next !== requested) return response;

  if (code && tooManyAttempts(request)) {
    return new Response("Too many confirmation attempts. Wait a minute and try again.", {
      status: 429,
    });
  }

  if (code) {
    const supabase = await createClient({
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      response.headers.set("Location", destination(next));
    }
  }

  return response;
}
