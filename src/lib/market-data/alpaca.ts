import "server-only";

import { cached } from "@/lib/market-data/cache";
import {
  getYahooBars,
  getYahooMovers,
  getYahooProfile,
  getYahooQuotes,
  searchYahoo,
} from "@/lib/market-data/yahoo";
import {
  asBigInt,
  numberToMicros,
  percentFromCents,
  type AssetType,
} from "@/lib/money";
import {
  POPULAR_CRYPTO,
  POPULAR_STOCKS,
  cryptoName,
  normalizeSymbol,
  toAlpacaSymbol,
  toDisplaySymbol,
} from "@/lib/symbols";
import type { AssetProfile, ChartBar, ClientQuote } from "@/lib/types";

const DATA_URL = "https://data.alpaca.markets";
const TRADING_URL = "https://paper-api.alpaca.markets";

export class MarketDataError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "MarketDataError";
    this.status = status;
  }
}

type AssetRequest = { symbol: string; assetType: AssetType };

type AlpacaAsset = {
  symbol: string;
  name: string;
  class: string;
  exchange: string;
  status: string;
  tradable: boolean;
  fractionable: boolean;
};

function credentials() {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_API_SECRET;
  if (!key || !secret) {
    throw new MarketDataError(
      "Market data is not configured. Add Alpaca API credentials on the server.",
    );
  }
  return { key, secret };
}

async function alpacaFetch(url: string): Promise<unknown> {
  const { key, secret } = credentials();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new MarketDataError("The market data service could not be reached.");
  }

  if (response.status === 429) {
    throw new MarketDataError(
      "Market data is temporarily rate limited. Please try again shortly.",
      429,
    );
  }
  if (response.status === 404) {
    throw new MarketDataError("That symbol could not be found.", 404);
  }
  if (!response.ok) {
    throw new MarketDataError("Market data is temporarily unavailable.", response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new MarketDataError("Market data returned an unexpected response.");
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readPrice(node: unknown): number | null {
  const record = asRecord(node);
  if (!record) return null;
  const trade = asRecord(record.latestTrade);
  const daily = asRecord(record.dailyBar);
  const minute = asRecord(record.minuteBar);
  const quote = asRecord(record.latestQuote);
  const candidates = [trade?.p, daily?.c, minute?.c];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }
  const bid = typeof quote?.bp === "number" ? quote.bp : null;
  const ask = typeof quote?.ap === "number" ? quote.ap : null;
  if (bid && ask && bid > 0 && ask > 0) return (bid + ask) / 2;
  return null;
}

function readPrevious(node: unknown): number | null {
  const record = asRecord(node);
  const prev = asRecord(record?.prevDailyBar);
  const close = prev?.c;
  if (typeof close === "number" && Number.isFinite(close) && close > 0) return close;
  return null;
}

async function getClock(): Promise<boolean | null> {
  try {
    return await cached("clock", 30_000, async () => {
      const body = asRecord(await alpacaFetch(`${TRADING_URL}/v2/clock`));
      return typeof body?.is_open === "boolean" ? body.is_open : null;
    });
  } catch {
    return null;
  }
}

function quoteFromNumbers(
  symbol: string,
  name: string,
  assetType: AssetType,
  price: number | null,
  previous: number | null,
  marketOpen: boolean | null,
): ClientQuote {
  if (!price) {
    return {
      symbol,
      name,
      assetType,
      priceMicros: null,
      previousCloseMicros: null,
      changePercent: null,
      marketOpen,
    };
  }
  const priceMicros = numberToMicros(price);
  const previousMicros = previous ? numberToMicros(previous) : null;
  const change =
    previousMicros === null ? null : percentFromCents(priceMicros - previousMicros, previousMicros);
  return {
    symbol,
    name,
    assetType,
    priceMicros: priceMicros.toString(),
    previousCloseMicros: previousMicros ? previousMicros.toString() : null,
    changePercent: change,
    marketOpen,
  };
}

async function stockSnapshots(symbols: string[]) {
  if (symbols.length === 0) return new Map<string, ClientQuote>();
  const marketOpen = await getClock();
  const quotes = new Map<string, ClientQuote>();

  for (let index = 0; index < symbols.length; index += 50) {
    const chunk = symbols.slice(index, index + 50);
    const url = `${DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(chunk.join(","))}&feed=iex`;
    const body = asRecord(await alpacaFetch(url));
    if (!body) continue;
    for (const symbol of chunk) {
      const node = body[symbol];
      quotes.set(
        symbol,
        quoteFromNumbers(
          symbol,
          symbol,
          "stock",
          readPrice(node),
          readPrevious(node),
          marketOpen,
        ),
      );
    }
  }

  return quotes;
}

async function cryptoSnapshots(symbols: string[]) {
  if (symbols.length === 0) return new Map<string, ClientQuote>();
  const pairs = symbols.map((symbol) => toAlpacaSymbol(symbol, "crypto"));
  const quotes = new Map<string, ClientQuote>();

  for (let index = 0; index < pairs.length; index += 50) {
    const chunk = pairs.slice(index, index + 50);
    const url = `${DATA_URL}/v1beta3/crypto/us/snapshots?symbols=${encodeURIComponent(chunk.join(","))}`;
    const body = asRecord(await alpacaFetch(url));
    const snapshots = asRecord(body?.snapshots) ?? body;
    if (!snapshots) continue;
    chunk.forEach((pair) => {
      const display = toDisplaySymbol(pair, "crypto");
      const node = snapshots[pair];
      quotes.set(
        display,
        quoteFromNumbers(
          display,
          cryptoName(display),
          "crypto",
          readPrice(node),
          readPrevious(node),
          true,
        ),
      );
    });
  }

  return quotes;
}

export async function getQuotes(assets: AssetRequest[]): Promise<ClientQuote[]> {
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) {
    return getYahooQuotes(assets);
  }
  const unique = new Map<string, AssetRequest>();
  for (const asset of assets) {
    const symbol = normalizeSymbol(asset.symbol);
    if (!symbol || !asset.assetType) continue;
    unique.set(`${asset.assetType}:${symbol}`, { symbol, assetType: asset.assetType });
  }
  const list = [...unique.values()];
  const cacheKey = list.map((item) => `${item.assetType}:${item.symbol}`).sort().join(",");

  return cached(`quotes:${cacheKey}`, 10_000, async () => {
    const stocks = list.filter((item) => item.assetType === "stock").map((item) => item.symbol);
    const crypto = list.filter((item) => item.assetType === "crypto").map((item) => item.symbol);
    const [stockQuotes, cryptoQuotes] = await Promise.all([
      stockSnapshots(stocks),
      cryptoSnapshots(crypto),
    ]);
    return list.map((item) => {
      const found =
        item.assetType === "stock" ? stockQuotes.get(item.symbol) : cryptoQuotes.get(item.symbol);
      return (
        found ?? {
          symbol: item.symbol,
          name: item.assetType === "crypto" ? cryptoName(item.symbol) : item.symbol,
          assetType: item.assetType,
          priceMicros: null,
          previousCloseMicros: null,
          changePercent: null,
          marketOpen: item.assetType === "crypto" ? true : null,
        }
      );
    });
  });
}

export async function getQuote(symbol: string, assetType: AssetType): Promise<ClientQuote | null> {
  const [quote] = await getQuotes([{ symbol, assetType }]);
  if (!quote?.priceMicros) return null;
  return quote;
}

async function loadUniverse(): Promise<AlpacaAsset[]> {
  return cached("asset-universe", 6 * 60 * 60 * 1000, async () => {
    const [equity, crypto] = await Promise.all([
      alpacaFetch(`${TRADING_URL}/v2/assets?status=active&asset_class=us_equity`),
      alpacaFetch(`${TRADING_URL}/v2/assets?status=active&asset_class=crypto`).catch(() => []),
    ]);
    const rows = [...(Array.isArray(equity) ? equity : []), ...(Array.isArray(crypto) ? crypto : [])];
    return rows
      .map((row) => asRecord(row))
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .map((row) => ({
        symbol: String(row.symbol ?? ""),
        name: String(row.name ?? row.symbol ?? ""),
        class: String(row.class ?? row.asset_class ?? ""),
        exchange: String(row.exchange ?? ""),
        status: String(row.status ?? ""),
        tradable: row.tradable !== false,
        fractionable: Boolean(row.fractionable),
      }))
      .filter((row) => row.symbol && row.tradable);
  });
}

function profileFromAsset(asset: AlpacaAsset): AssetProfile {
  const assetType: AssetType = asset.class === "crypto" ? "crypto" : "stock";
  const symbol = toDisplaySymbol(asset.symbol, assetType);
  return {
    symbol,
    name: assetType === "crypto" ? cryptoName(symbol) || asset.name : asset.name,
    assetType,
    exchange: asset.exchange || null,
    tradable: asset.tradable,
    fractionable: assetType === "crypto" ? true : asset.fractionable,
    status: asset.status || null,
  };
}

export async function getAssetProfile(
  symbol: string,
  assetType: AssetType,
): Promise<AssetProfile | null> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return null;
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) {
    return getYahooProfile(normalized, assetType);
  }

  try {
    const providerSymbol =
      assetType === "crypto" ? toAlpacaSymbol(normalized, "crypto") : normalized;
    const body = asRecord(await alpacaFetch(`${TRADING_URL}/v2/assets/${encodeURIComponent(providerSymbol)}`));
    if (!body) return null;
    return profileFromAsset({
      symbol: String(body.symbol ?? providerSymbol),
      name: String(body.name ?? normalized),
      class: String(body.class ?? assetType),
      exchange: String(body.exchange ?? ""),
      status: String(body.status ?? ""),
      tradable: body.tradable !== false,
      fractionable: Boolean(body.fractionable),
    });
  } catch (error) {
    if (error instanceof MarketDataError && error.status === 404) {
      if (assetType === "crypto") {
        return {
          symbol: normalized,
          name: cryptoName(normalized),
          assetType: "crypto",
          exchange: "CRYPTO",
          tradable: true,
          fractionable: true,
          status: "active",
        };
      }
      return null;
    }
    return {
      symbol: normalized,
      name: assetType === "crypto" ? cryptoName(normalized) : normalized,
      assetType,
      exchange: null,
      tradable: null,
      fractionable: assetType === "crypto" ? true : null,
      status: null,
    };
  }
}

export async function searchAssets(query: string): Promise<AssetProfile[]> {
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) {
    return searchYahoo(query);
  }
  const q = query.trim();
  if (q.length < 1) return [];
  const upper = normalizeSymbol(q);
  const lowered = q.toLowerCase();

  let universe: AlpacaAsset[] = [];
  try {
    universe = await loadUniverse();
  } catch {
    universe = [];
  }

  const matches = universe
    .filter((asset) => {
      const display = toDisplaySymbol(asset.symbol, asset.class === "crypto" ? "crypto" : "stock");
      return (
        display.includes(upper) ||
        asset.symbol.toUpperCase().includes(upper) ||
        asset.name.toLowerCase().includes(lowered)
      );
    })
    .slice(0, 20)
    .map(profileFromAsset);

  if (matches.length > 0) return dedupeProfiles(matches);

  const fallback: AssetProfile[] = [...POPULAR_STOCKS, ...POPULAR_CRYPTO]
    .filter(
      (item) =>
        item.symbol.includes(upper) || item.name.toLowerCase().includes(lowered),
    )
    .map((item) => ({
      symbol: item.symbol,
      name: item.name,
      assetType: POPULAR_CRYPTO.some((crypto) => crypto.symbol === item.symbol)
        ? ("crypto" as const)
        : ("stock" as const),
      exchange: null,
      tradable: true,
      fractionable: true,
      status: "active",
    }));

  if (upper) {
    try {
      const exact = await getAssetProfile(upper, "stock");
      if (exact) fallback.unshift(exact);
    } catch {
      // Exact lookup is best-effort when the universe is unavailable.
    }
  }

  return dedupeProfiles(fallback).slice(0, 20);
}

function dedupeProfiles(profiles: AssetProfile[]): AssetProfile[] {
  const seen = new Set<string>();
  return profiles.filter((profile) => {
    const key = `${profile.assetType}:${profile.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const RANGE_CONFIG = {
  "1D": { timeframe: "5Min", days: 1 },
  "1W": { timeframe: "1Hour", days: 7 },
  "1M": { timeframe: "1Day", days: 31 },
  "3M": { timeframe: "1Day", days: 93 },
  "1Y": { timeframe: "1Day", days: 370 },
  ALL: { timeframe: "1Day", days: 3650 },
} as const;

export type ChartRange = keyof typeof RANGE_CONFIG;
export const CHART_RANGES = Object.keys(RANGE_CONFIG) as ChartRange[];

function startDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function parseBars(payload: unknown, assetType: AssetType, symbol: string): ChartBar[] {
  const record = asRecord(payload);
  if (!record) return [];
  let rows: unknown[] = [];
  if (Array.isArray(record.bars)) {
    rows = record.bars;
  } else {
    const grouped = asRecord(record.bars);
    const pair = toAlpacaSymbol(symbol, assetType);
    const group = grouped?.[pair];
    if (Array.isArray(group)) rows = group;
  }

  return rows
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => {
      const close = typeof row.c === "number" ? row.c : null;
      const time = typeof row.t === "string" ? Date.parse(row.t) / 1000 : null;
      if (!close || !time || !Number.isFinite(close) || !Number.isFinite(time)) return null;
      return { time: Math.floor(time), value: close };
    })
    .filter((bar): bar is ChartBar => Boolean(bar));
}

async function fetchBars(symbol: string, assetType: AssetType, range: ChartRange): Promise<ChartBar[]> {
  const config = RANGE_CONFIG[range];
  const start = startDate(range === "1D" ? 5 : config.days);
  const bars: ChartBar[] = [];
  let pageToken = "";

  for (let page = 0; page < 5; page += 1) {
    const token = pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : "";
    const url =
      assetType === "crypto"
        ? `${DATA_URL}/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(toAlpacaSymbol(symbol, "crypto"))}&timeframe=${config.timeframe}&start=${encodeURIComponent(start)}&limit=1000${token}`
        : `${DATA_URL}/v2/stocks/${encodeURIComponent(symbol)}/bars?timeframe=${config.timeframe}&start=${encodeURIComponent(start)}&limit=1000&feed=iex&adjustment=raw${token}`;
    const body = asRecord(await alpacaFetch(url));
    bars.push(...parseBars(body, assetType, symbol));
    const next = typeof body?.next_page_token === "string" ? body.next_page_token : "";
    if (!next) break;
    pageToken = next;
  }

  const cutoff = range === "1D" ? Date.now() / 1000 - 60 * 60 * 36 : 0;
  const filtered = range === "1D" ? bars.filter((bar) => bar.time >= cutoff) : bars;
  const used = filtered.length > 1 ? filtered : bars;
  const deduped = new Map<number, ChartBar>();
  for (const bar of used) deduped.set(bar.time, bar);
  return [...deduped.values()].sort((a, b) => a.time - b.time);
}

export async function getBars(
  symbol: string,
  assetType: AssetType,
  range: ChartRange,
): Promise<ChartBar[]> {
  const normalized = normalizeSymbol(symbol);
  if (!CHART_RANGES.includes(range)) return [];
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) {
    return getYahooBars(normalized, assetType, range);
  }
  return cached(`bars:${assetType}:${normalized}:${range}`, 60_000, () =>
    fetchBars(normalized, assetType, range),
  );
}

export async function getMovers(): Promise<{ gainers: ClientQuote[]; losers: ClientQuote[] }> {
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_API_SECRET) {
    return getYahooMovers();
  }
  try {
    const body = asRecord(
      await cached("movers", 60_000, () =>
        alpacaFetch(`${DATA_URL}/v1beta1/screener/stocks/movers?top=5`),
      ),
    );
    const mapSide = (value: unknown) => {
      if (!Array.isArray(value)) return [];
      return value
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => Boolean(row && typeof row.symbol === "string"))
        .map((row) => {
          const price = typeof row.price === "number" ? row.price : null;
          const percent = typeof row.percent_change === "number" ? row.percent_change : null;
          const micros = price ? numberToMicros(price).toString() : null;
          return {
            symbol: String(row.symbol),
            name: String(row.symbol),
            assetType: "stock" as const,
            priceMicros: micros,
            previousCloseMicros: null,
            changePercent: percent,
            marketOpen: null,
          };
        });
    };
    const gainers = mapSide(body?.gainers);
    const losers = mapSide(body?.losers);
    if (gainers.length || losers.length) return { gainers, losers };
  } catch {
    // Fall through to a popular-list ranking when the screener is unavailable.
  }

  try {
    const quotes = await getQuotes(
      POPULAR_STOCKS.map((stock) => ({ symbol: stock.symbol, assetType: "stock" as const })),
    );
    const ranked = quotes
      .filter((quote) => quote.changePercent !== null)
      .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    return {
      gainers: ranked.slice(0, 5),
      losers: [...ranked].reverse().slice(0, 5),
    };
  } catch {
    return { gainers: [], losers: [] };
  }
}

export function quoteChangeMicros(quote: ClientQuote): bigint | null {
  if (!quote.priceMicros || !quote.previousCloseMicros) return null;
  return asBigInt(quote.priceMicros) - asBigInt(quote.previousCloseMicros);
}
