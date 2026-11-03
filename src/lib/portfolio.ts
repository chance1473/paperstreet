import "server-only";

import { ownedProfileImageUrl } from "@/lib/appearance";
import { liveBookRank } from "@/lib/leaderboard-rank";
import { getQuotes } from "@/lib/market-data/alpaca";
import { STARTING_CASH_CENTS, asBigInt, percentFromCents, valueCents, type AssetType } from "@/lib/money";
import { pricePositions, summarize, type AccountSummary, type PricedPosition } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ClientPosition,
  ClientSnapshot,
  ClientTransaction,
  LeaderboardEntry,
} from "@/lib/types";

type PositionRow = {
  symbol: string;
  asset_type: AssetType;
  asset_name: string;
  quantity_units: number | string;
  avg_price_micros: number | string;
};

type SnapshotRow = {
  value_cents: number | string;
  captured_at: string;
};

type TransactionRow = {
  id: string;
  symbol: string;
  asset_type: AssetType;
  asset_name: string;
  side: "buy" | "sell";
  quantity_units: number | string;
  price_micros: number | string;
  total_cents: number | string;
  created_at: string;
};

export type { AccountSummary, PricedPosition };

function toClientPosition(row: PositionRow): ClientPosition {
  return {
    symbol: row.symbol,
    assetType: row.asset_type,
    assetName: row.asset_name,
    quantityUnits: asBigInt(row.quantity_units).toString(),
    avgPriceMicros: asBigInt(row.avg_price_micros).toString(),
  };
}

export async function getPaperAccount(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("paper_accounts")
    .select("cash_cents, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Account data is unavailable.");
  if (!data) return null;
  return {
    cashCents: asBigInt(data.cash_cents as number | string),
    createdAt: String(data.created_at),
  };
}

export async function getPositions(userId: string): Promise<ClientPosition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select("symbol, asset_type, asset_name, quantity_units, avg_price_micros")
    .eq("user_id", userId)
    .order("symbol");
  if (error) throw new Error("Positions are unavailable.");
  return ((data ?? []) as PositionRow[]).map(toClientPosition);
}

export async function getTransactions(
  userId: string,
  filters: { side?: string; assetType?: string; symbol?: string },
): Promise<ClientTransaction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      "id, symbol, asset_type, asset_name, side, quantity_units, price_micros, total_cents, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.side === "buy" || filters.side === "sell") {
    query = query.eq("side", filters.side);
  }
  if (filters.assetType === "stock" || filters.assetType === "crypto") {
    query = query.eq("asset_type", filters.assetType);
  }
  if (filters.symbol) {
    query = query.eq("symbol", filters.symbol);
  }

  const { data, error } = await query;
  if (error) throw new Error("Transactions are unavailable.");
  return ((data ?? []) as TransactionRow[]).map((row) => ({
    id: row.id,
    symbol: row.symbol,
    assetType: row.asset_type,
    assetName: row.asset_name,
    side: row.side,
    quantityUnits: asBigInt(row.quantity_units).toString(),
    priceMicros: asBigInt(row.price_micros).toString(),
    totalCents: asBigInt(row.total_cents).toString(),
    createdAt: row.created_at,
  }));
}

export async function getWatchlist(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("symbol, asset_type, asset_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Watchlist is unavailable.");
  return (data ?? []).map((row) => ({
    symbol: String(row.symbol),
    assetType: row.asset_type as AssetType,
    assetName: String(row.asset_name),
    createdAt: String(row.created_at),
  }));
}

export async function getSnapshots(userId: string): Promise<ClientSnapshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("value_cents, captured_at")
    .eq("user_id", userId)
    .order("captured_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error("Portfolio history is unavailable.");
  return ((data ?? []) as SnapshotRow[]).map((row) => ({
    valueCents: asBigInt(row.value_cents).toString(),
    capturedAt: row.captured_at,
  }));
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, created_at, avatar_path, background_choice, soundtrack_choice")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Profile is unavailable.");
  if (!data) return null;
  return {
    username: String(data.username),
    displayName: String(data.display_name),
    createdAt: String(data.created_at),
    avatarPath: data.avatar_path ? String(data.avatar_path) : null,
    backgroundChoice: data.background_choice ? String(data.background_choice) : null,
    soundtrackChoice: data.soundtrack_choice ? String(data.soundtrack_choice) : null,
  };
}

export async function buildSummary(userId: string): Promise<AccountSummary | null> {
  const account = await getPaperAccount(userId);
  if (!account) return null;
  const positions = await getPositions(userId);
  if (positions.length === 0) return summarize(account.cashCents, [], true);

  try {
    const quotes = await getQuotes(
      positions.map((position) => ({
        symbol: position.symbol,
        assetType: position.assetType,
      })),
    );
    const priced = pricePositions(positions, quotes);
    return summarize(account.cashCents, priced.positions, priced.pricesAvailable);
  } catch {
    const priced = pricePositions(positions, []);
    return summarize(account.cashCents, priced.positions, false);
  }
}

export async function recordSnapshot(
  userId: string,
  valueCentsAmount: bigint,
  options?: { force?: boolean },
) {
  const admin = createAdminClient();
  if (!admin) return;
  if (options?.force) {
    await admin.from("portfolio_snapshots").insert({
      user_id: userId,
      value_cents: Number(valueCentsAmount),
    });
    return;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_snapshots")
    .select("captured_at")
    .eq("user_id", userId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.captured_at) {
    const age = Date.now() - new Date(String(data.captured_at)).getTime();
    if (age < 15 * 60 * 1000) return;
  }

  await admin.from("portfolio_snapshots").insert({
    user_id: userId,
    value_cents: Number(valueCentsAmount),
  });
}

type BoardProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
};

type CashAccount = {
  user_id: string;
  cash_cents: number | string;
};

function groupHoldings(rows: (PositionRow & { user_id: string })[]) {
  const byUser = new Map<string, (PositionRow & { user_id: string })[]>();
  for (const position of rows) {
    const list = byUser.get(position.user_id) ?? [];
    list.push(position);
    byUser.set(position.user_id, list);
  }
  return byUser;
}

function rankBooks(
  book: LeaderboardEntry["book"],
  accountRows: CashAccount[],
  profileRows: BoardProfile[],
  holdingsByUser: Map<string, (PositionRow & { user_id: string })[]>,
  quoteMap: Map<string, string>,
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (const account of accountRows) {
    const profile = profileRows.find((row) => row.id === account.user_id);
    if (!profile) continue;
    const holdings = holdingsByUser.get(account.user_id) ?? [];
    let complete = true;
    let invested = 0n;
    for (const holding of holdings) {
      const price = quoteMap.get(`${holding.asset_type}:${holding.symbol}`);
      if (!price) {
        complete = false;
        break;
      }
      invested += valueCents(asBigInt(holding.quantity_units), asBigInt(price));
    }
    if (!complete) continue;
    const ranked = liveBookRank(asBigInt(account.cash_cents), invested);
    entries.push({
      rank: 0,
      book,
      username: String(profile.username),
      displayName: String(profile.display_name),
      valueCents: ranked.valueCents.toString(),
      investedCents: ranked.investedCents.toString(),
      profitCents: ranked.profitCents.toString(),
      returnPercent: percentFromCents(ranked.profitCents, STARTING_CASH_CENTS) ?? 0,
      avatarUrl: ownedProfileImageUrl(account.user_id, profile.avatar_path ? String(profile.avatar_path) : null),
    });
  }

  entries.sort((a, b) => {
    const delta = asBigInt(b.valueCents) - asBigInt(a.valueCents);
    if (delta > 0n) return 1;
    if (delta < 0n) return -1;
    return a.username.localeCompare(b.username);
  });

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function getLeaderboard(): Promise<{ live: LeaderboardEntry[]; practice: LeaderboardEntry[] }> {
  const admin = createAdminClient();
  if (!admin) return { live: [], practice: [] };

  const [{ data: profiles }, { data: accounts }, { data: positions }, { data: simulatedAccounts }, { data: simulatedPositions }] =
    await Promise.all([
      admin.from("profiles").select("id, username, display_name, avatar_path"),
      admin.from("paper_accounts").select("user_id, cash_cents"),
      admin.from("positions").select("user_id, symbol, asset_type, quantity_units, avg_price_micros"),
      admin.from("simulated_accounts").select("user_id, cash_cents"),
      admin.from("simulated_positions").select("user_id, symbol, asset_type, quantity_units, avg_price_micros"),
    ]);

  const profileRows = (profiles ?? []) as BoardProfile[];
  const liveRows = (positions ?? []) as (PositionRow & { user_id: string })[];
  const practiceRows = (simulatedPositions ?? []) as (PositionRow & { user_id: string })[];

  const symbols = new Map<string, { symbol: string; assetType: AssetType }>();
  for (const position of [...liveRows, ...practiceRows]) {
    symbols.set(`${position.asset_type}:${position.symbol}`, {
      symbol: position.symbol,
      assetType: position.asset_type,
    });
  }

  let quoteMap = new Map<string, string>();
  if (symbols.size > 0) {
    const quotes = await getQuotes([...symbols.values()]);
    quoteMap = new Map(
      quotes
        .filter((quote) => quote.priceMicros)
        .map((quote) => [`${quote.assetType}:${quote.symbol}`, quote.priceMicros as string]),
    );
  }

  return {
    live: rankBooks("live", (accounts ?? []) as CashAccount[], profileRows, groupHoldings(liveRows), quoteMap),
    practice: rankBooks(
      "practice",
      (simulatedAccounts ?? []) as CashAccount[],
      profileRows,
      groupHoldings(practiceRows),
      quoteMap,
    ),
  };
}
