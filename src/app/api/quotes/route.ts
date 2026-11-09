import { NextResponse } from "next/server";

import { recordJourneyError } from "@/lib/errors";
import { MarketDataError, getQuotes } from "@/lib/market-data/alpaca";
import { LIMITS, overLimit } from "@/lib/rate-limit";
import { isAssetType } from "@/lib/symbols";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !data.user) {
    return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 });
  }
  if (overLimit(LIMITS.marketData, data.user.id)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = payload && typeof payload === "object" && "assets" in payload ? payload.assets : [];
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const assets = raw
    .slice(0, 40)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const symbol = "symbol" in item ? String(item.symbol) : "";
      const assetType = "assetType" in item ? String(item.assetType) : "";
      if (!isAssetType(assetType)) return null;
      return { symbol, assetType };
    })
    .filter((item): item is { symbol: string; assetType: "stock" | "crypto" } => Boolean(item));

  try {
    const quotes = await getQuotes(assets);
    return NextResponse.json({ quotes });
  } catch (error) {
    recordJourneyError("market-data", error);
    const message =
      error instanceof MarketDataError ? error.message : "Market data is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
