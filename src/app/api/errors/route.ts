import { NextResponse } from "next/server";

import { recordJourneyError } from "@/lib/errors";
import { LIMITS, clientAddress, overLimit } from "@/lib/rate-limit";

// This endpoint is deliberately anonymous: sign-in failures happen before there
// is a session. It is bounded instead: small bodies, short messages, and a
// per-client rate limit, so it cannot be used to fill the disk.
const MAX_BODY_BYTES = 2_000;
const MAX_MESSAGE_CHARS = 300;

function limited(request: Request) {
  return overLimit(LIMITS.errorReport, clientAddress(request.headers));
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
