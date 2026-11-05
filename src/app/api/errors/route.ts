import { NextResponse } from "next/server";

import { recordJourneyError } from "@/lib/errors";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { source?: string; message?: string } | null;
  const source = body?.source === "sign-in" || body?.source === "order" ? body.source : "page";
  recordJourneyError(source, new Error(body?.message || "Page render failed"));
  return NextResponse.json({ ok: true });
}
