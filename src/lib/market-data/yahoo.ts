import "server-only";

import { cached } from "@/lib/market-data/cache";
import { numberToMicros, percentFromCents, type AssetType } from "@/lib/money";
import { POPULAR_STOCKS, cryptoName, normalizeSymbol } from "@/lib/symbols";
import type { AssetProfile, ChartBar, ClientQuote } from "@/lib/types";

type AssetRequest = { symbol: string; assetType: AssetType };

const RANGES = {
  "1D": { interval: "5m", range: "1d" },
  "1W": { interval: "60m", range: "5d" },
  "1M": { interval: "1d", range: "1mo" },
  "3M": { interval: "1d", range: "3mo" },
  "1Y": { interval: "1d", range: "1y" },
  ALL: { interval: "1d", range: "5y" },
} as const;

export type YahooRange = keyof typeof RANGES;

function yahooSymbol(symbol: string, assetType: AssetType) {
  return assetType === "crypto" ? `${normalizeSymbol(symbol)}-USD` : normalizeSymbol(symbol);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function yahooFetch(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": "PaperStreet/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Quote service is unavailable.");
  return response.json();
}

function chartResult(payload: unknown) {
  const chart = asRecord(asRecord(payload)?.chart);
  const result = Array.isArray(chart?.result) ? asRecord(chart.result[0]) : null;
  return result;
}

async function loadChart(symbol: string, assetType: AssetType, range: YahooRange = "1M") {
  const provider = yahooSymbol(symbol, assetType);
  const config = RANGES[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(provider)}?interval=${config.interval}&range=${config.range}`;
  return cached(`yahoo:${provider}:${range}`, 15_000, () => yahooFetch(url));
}

function displayName(symbol: string, assetType: AssetType, fallback: string) {
  if (assetType === "crypto") {
    const known = cryptoName(symbol);
    if (known !== symbol) return known;
    return fallback.replace(/\s+USD$/i, "") || symbol;
  }
  return fallback || symbol;
}

function quoteFromChart(symbol: string, assetType: AssetType, payload: unknown): ClientQuote {
  const result = chartResult(payload);
  const meta = asRecord(result?.meta);
  const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
  const previous = typeof meta?.chartPreviousClose === "number" ? meta.chartPreviousClose : null;
  const fallback =
    (typeof meta?.shortName === "string" && meta.shortName) ||
    (assetType === "crypto" ? cryptoName(symbol) : symbol);
  const name = displayName(symbol, assetType, fallback);
  const marketOpen =
    assetType === "crypto" ? true : meta?.marketState === "REGULAR" ? true : meta?.marketState ? false : null;
  if (!price || price <= 0) {
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
  const previousMicros = previous && previous > 0 ? numberToMicros(previous) : null;
  return {
    symbol,
    name,
    assetType,
    priceMicros: priceMicros.toString(),
    previousCloseMicros: previousMicros ? previousMicros.toString() : null,
    changePercent:
      previousMicros === null ? null : percentFromCents(priceMicros - previousMicros, previousMicros),
    marketOpen,
  };
}

export async function getYahooQuotes(assets: AssetRequest[]): Promise<ClientQuote[]> {
  const unique = new Map<string, AssetRequest>();
  for (const asset of assets) {
    const symbol = normalizeSymbol(asset.symbol);
    if (!symbol) continue;
    unique.set(`${asset.assetType}:${symbol}`, { symbol, assetType: asset.assetType });
  }
  const list = [...unique.values()];
  const quotes = await Promise.all(
    list.map(async (asset) => {
      try {
        const payload = await loadChart(asset.symbol, asset.assetType, "1D");
        return quoteFromChart(asset.symbol, asset.assetType, payload);
      } catch {
        return quoteFromChart(asset.symbol, asset.assetType, null);
      }
    }),
  );
  return quotes;
}

export async function getYahooProfile(symbol: string, assetType: AssetType): Promise<AssetProfile | null> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return null;
  try {
    const payload = await loadChart(normalized, assetType, "1M");
    const meta = asRecord(chartResult(payload)?.meta);
    if (!meta?.regularMarketPrice) return null;
    const fallback =
      (typeof meta.shortName === "string" && meta.shortName) ||
      (assetType === "crypto" ? cryptoName(normalized) : normalized);
    const name = displayName(normalized, assetType, fallback);
    return {
      symbol: normalized,
      name,
      assetType,
      exchange: typeof meta.exchangeName === "string" ? meta.exchangeName : null,
      tradable: true,
      fractionable: true,
      status: "active",
    };
  } catch {
    return null;
  }
}

export async function searchYahoo(query: string): Promise<AssetProfile[]> {
  const q = query.trim();
  if (!q) return [];
  const payload = asRecord(
    await cached(`yahoo-search:${q.toLowerCase()}`, 60_000, () =>
      yahooFetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12`),
    ),
  );
  const quotes = Array.isArray(payload?.quotes) ? payload.quotes : [];
  const results: AssetProfile[] = [];
  for (const entry of quotes) {
    const row = asRecord(entry);
    if (!row) continue;
    const raw = String(row.symbol ?? "");
    if (!raw || raw.includes(".") || raw.includes("=")) continue;
    const quoteType = String(row.quoteType ?? "");
    const assetType: AssetType | null =
      quoteType === "EQUITY" || quoteType === "ETF"
        ? "stock"
        : quoteType === "CRYPTOCURRENCY" && raw.endsWith("-USD")
          ? "crypto"
          : null;
    if (!assetType) continue;
    const symbol = assetType === "crypto" ? normalizeSymbol(raw.replace(/-USD$/, "")) : normalizeSymbol(raw);
    if (!symbol || symbol.includes(".")) continue;
    const fallback = String(row.shortname ?? row.longname ?? symbol);
    results.push({
      symbol,
      name: displayName(symbol, assetType, fallback),
      assetType,
      exchange: typeof row.exchange === "string" ? row.exchange : null,
      tradable: true,
      fractionable: true,
      status: "active",
    });
    if (results.length === 12) break;
  }
  return results;
}

export async function getYahooBars(symbol: string, assetType: AssetType, range: YahooRange): Promise<ChartBar[]> {
  const payload = await loadChart(symbol, assetType, range);
  const result = chartResult(payload);
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const indicators = asRecord(result?.indicators);
  const quoteList = indicators?.quote;
  const quote = asRecord(Array.isArray(quoteList) ? quoteList[0] : null);
  const closes = Array.isArray(quote?.close) ? quote.close : [];
  const bars: ChartBar[] = [];
  timestamps.forEach((time, index) => {
    const close = closes[index];
    if (typeof time !== "number" || typeof close !== "number" || !Number.isFinite(close)) return;
    bars.push({ time, value: close });
  });
  return bars;
}

export async function getYahooMovers(): Promise<{ gainers: ClientQuote[]; losers: ClientQuote[] }> {
  const quotes = await getYahooQuotes(POPULAR_STOCKS.map((stock) => ({ symbol: stock.symbol, assetType: "stock" as const })));
  const ranked = quotes
    .filter((quote) => quote.changePercent !== null)
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  return { gainers: ranked.slice(0, 5), losers: [...ranked].reverse().slice(0, 5) };
}
