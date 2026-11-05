import { NextResponse } from "next/server";

import { recordJourneyError } from "@/lib/errors";

// This endpoint is deliberately anonymous: sign-in failures happen before there
// is a session. It is bounded instead: small bodies, short messages, and a
// per-client rate limit, so it cannot be used to fill the disk.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const MAX_BODY_BYTES = 2_000;
const MAX_MESSAGE_CHARS = 300;

function limited(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  if (limited(request)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }
  let body: { source?: string; message?: string } | null = null;
  try {
    body = JSON.parse(text) as { source?: string; message?: string };
  } catch {
    body = null;
  }
  const source = body?.source === "sign-in" || body?.source === "order" ? body.source : "page";
  const message = typeof body?.message === "string" ? body.message.slice(0, MAX_MESSAGE_CHARS) : "";
  recordJourneyError(source, new Error(message || "Page render failed"));
  return NextResponse.json({ ok: true });
}
