import { NextResponse } from "next/server";

import { recordJourneyError } from "@/lib/errors";
import { CHART_RANGES, MarketDataError, getBars, type ChartRange } from "@/lib/market-data/alpaca";
import { LIMITS, overLimit } from "@/lib/rate-limit";
import { isAssetType, normalizeSymbol } from "@/lib/symbols";
import { getSessionUser } from "@/lib/supabase/session";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 });
  if (overLimit(LIMITS.marketData, user.id)) {
    return NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  }

  const url = new URL(request.url);
  const symbol = normalizeSymbol(url.searchParams.get("symbol") ?? "");
  const assetType = url.searchParams.get("type") ?? "";
  const range = url.searchParams.get("range") ?? "1D";

  if (!symbol || !isAssetType(assetType) || !CHART_RANGES.includes(range as ChartRange)) {
    return NextResponse.json({ error: "That chart request is invalid." }, { status: 400 });
  }

  try {
    const bars = await getBars(symbol, assetType, range as ChartRange);
    return NextResponse.json({ bars });
  } catch (error) {
    recordJourneyError("market-data", error);
    const message =
      error instanceof MarketDataError ? error.message : "Chart data is temporarily unavailable.";
    return NextResponse.json({ error: message, bars: [] }, { status: 503 });
  }
}
