"use server";

import { revalidatePath } from "next/cache";

import {
  MarketDataError,
  getAssetProfile,
  getQuote,
} from "@/lib/market-data/alpaca";
import {
  asBigInt,
  decimalToCents,
  decimalToQtyUnits,
  maxQtyForBudget,
  valueCents,
} from "@/lib/money";
import { buildSummary, getPaperAccount, getPositions, recordSnapshot } from "@/lib/portfolio";
import { normalizeSymbol } from "@/lib/symbols";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/session";
import { orderSchema } from "@/lib/validation";

const TRADE_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: "You do not have enough cash for this order.",
  INSUFFICIENT_SHARES: "You do not own enough of this asset to sell.",
  INVALID_AMOUNT: "Enter a valid amount.",
  INVALID_PRICE: "A live price could not be used for this order.",
  INVALID_SYMBOL: "That symbol is not supported.",
  INVALID_ASSET: "That asset type is not supported.",
  INVALID_SIDE: "Choose buy or sell.",
  AMOUNT_TOO_SMALL: "That order is too small at the current price.",
  ACCOUNT_MISSING: "Your paper account is missing. Apply the database migration, then sign in again.",
  UNAUTHENTICATED: "Your session expired. Sign in again.",
};

function messageFromError(error: { message?: string } | null): string {
  const text = error?.message ?? "";
  for (const [code, message] of Object.entries(TRADE_MESSAGES)) {
    if (text.includes(code)) return message;
  }
  return "The order could not be completed. Nothing was changed.";
}

export async function placeOrder(input: unknown): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the order and try again." };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, message: TRADE_MESSAGES.UNAUTHENTICATED };

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      message: "Trading is not configured. Add the server-side Supabase service role key.",
    };
  }

  const symbol = normalizeSymbol(parsed.data.symbol);
  const { assetType, side, mode } = parsed.data;
  if (!symbol) return { ok: false, message: TRADE_MESSAGES.INVALID_SYMBOL };

  let quote;
  try {
    quote = await getQuote(symbol, assetType);
  } catch (error) {
    if (error instanceof MarketDataError) {
      return { ok: false, message: error.message };
    }
    const { recordJourneyError } = await import("@/lib/errors");
    recordJourneyError("order", error);
    return { ok: false, message: "A live price could not be retrieved." };
  }

  if (!quote?.priceMicros) {
    return { ok: false, message: "That symbol is unavailable or not supported." };
  }

  const profile = await getAssetProfile(symbol, assetType);
  if (profile && profile.assetType !== assetType) {
    return { ok: false, message: "That asset type does not match the symbol." };
  }
  if (profile?.tradable === false) {
    return { ok: false, message: "That asset cannot be traded." };
  }

  const price = asBigInt(quote.priceMicros);
  const account = await getPaperAccount(user.id);
  if (!account) return { ok: false, message: TRADE_MESSAGES.ACCOUNT_MISSING };

  const positions = await getPositions(user.id);
  const owned = positions.find(
    (position) => position.symbol === symbol && position.assetType === assetType,
  );
  const ownedQty = owned ? asBigInt(owned.quantityUnits) : 0n;

  let quantity = 0n;
  if (mode === "quantity") {
    const parsedQty = decimalToQtyUnits(parsed.data.amount);
    if (!parsedQty) return { ok: false, message: "Enter a valid quantity." };
    quantity = parsedQty;
  } else {
    const notional = decimalToCents(parsed.data.amount);
    if (!notional) return { ok: false, message: "Enter a valid dollar amount." };
    if (side === "buy" && notional > account.cashCents) {
      return { ok: false, message: TRADE_MESSAGES.INSUFFICIENT_FUNDS };
    }
    if (side === "sell") {
      const positionValue = owned ? valueCents(ownedQty, price) : 0n;
      if (notional > positionValue) return { ok: false, message: TRADE_MESSAGES.INSUFFICIENT_SHARES };
    }
    quantity = maxQtyForBudget(notional, price);
  }

  if (quantity <= 0n) return { ok: false, message: TRADE_MESSAGES.AMOUNT_TOO_SMALL };

  const orderValue = valueCents(quantity, price);
  if (orderValue <= 0n) return { ok: false, message: TRADE_MESSAGES.AMOUNT_TOO_SMALL };
  if (side === "buy" && orderValue > account.cashCents) {
    return { ok: false, message: TRADE_MESSAGES.INSUFFICIENT_FUNDS };
  }
  if (side === "sell" && quantity > ownedQty) {
    return { ok: false, message: TRADE_MESSAGES.INSUFFICIENT_SHARES };
  }

  const { error } = await admin.rpc("execute_paper_trade", {
    p_user_id: user.id,
    p_symbol: symbol,
    p_asset_type: assetType,
    p_asset_name: profile?.name || quote.name || symbol,
    p_side: side,
    p_quantity_units: quantity.toString(),
    p_price_micros: price.toString(),
  });

  if (error) return { ok: false, message: messageFromError(error) };

  const summary = await buildSummary(user.id);
  if (summary?.valueCents) {
    await recordSnapshot(user.id, asBigInt(summary.valueCents), { force: true });
  }

  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/transactions");
  revalidatePath(`/asset/${assetType}/${symbol}`);

  const verb = side === "buy" ? "Bought" : "Sold";
  return { ok: true, message: `${verb} ${symbol} at the latest market price.` };
}
