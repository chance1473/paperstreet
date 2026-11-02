"use server";

import { revalidatePath } from "next/cache";

import { MarketDataError, getAssetProfile, getQuote } from "@/lib/market-data/alpaca";
import { normalizeSymbol } from "@/lib/symbols";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/session";
import { watchlistSchema } from "@/lib/validation";

export async function addToWatchlist(input: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = watchlistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That asset could not be added." };

  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };

  const symbol = normalizeSymbol(parsed.data.symbol);
  const { assetType } = parsed.data;

  try {
    const quote = await getQuote(symbol, assetType);
    if (!quote) return { ok: false, message: "That symbol is unavailable or not supported." };
  } catch (error) {
    if (error instanceof MarketDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Market data is unavailable." };
  }

  const profile = await getAssetProfile(symbol, assetType);
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist_items").insert({
    user_id: user.id,
    symbol,
    asset_type: assetType,
    asset_name: profile?.name || symbol,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, message: "That asset is already on your watchlist." };
    return { ok: false, message: "The watchlist could not be updated." };
  }

  revalidatePath("/watchlist");
  revalidatePath("/markets");
  revalidatePath("/dashboard");
  revalidatePath(`/asset/${assetType}/${symbol}`);
  return { ok: true, message: `${symbol} added to your watchlist.` };
}

export async function removeFromWatchlist(input: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = watchlistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That asset could not be removed." };

  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };

  const symbol = normalizeSymbol(parsed.data.symbol);
  const supabase = await createClient();
  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("symbol", symbol)
    .eq("asset_type", parsed.data.assetType);

  if (error) return { ok: false, message: "The watchlist could not be updated." };

  revalidatePath("/watchlist");
  revalidatePath("/markets");
  revalidatePath("/dashboard");
  revalidatePath(`/asset/${parsed.data.assetType}/${symbol}`);
  return { ok: true, message: `${symbol} removed from your watchlist.` };
}
