import type { AssetType } from "@/lib/money";

export const POPULAR_STOCKS: { symbol: string; name: string }[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "PLTR", name: "Palantir" },
];

export const POPULAR_CRYPTO: { symbol: string; name: string }[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "XRP", name: "XRP" },
];

const CRYPTO_NAMES = new Map(POPULAR_CRYPTO.map((item) => [item.symbol, item.name]));

export function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 12);
}

export function isAssetType(value: string): value is AssetType {
  return value === "stock" || value === "crypto";
}

export function toAlpacaSymbol(symbol: string, assetType: AssetType): string {
  if (assetType === "crypto") {
    return symbol.includes("/") ? symbol : `${symbol}/USD`;
  }
  return symbol;
}

export function toDisplaySymbol(providerSymbol: string, assetType: AssetType): string {
  if (assetType !== "crypto") return providerSymbol.toUpperCase();
  const [base] = providerSymbol.split("/");
  if (base) return base.toUpperCase();
  const upper = providerSymbol.toUpperCase();
  if (upper.endsWith("USD") && upper.length > 3) return upper.slice(0, -3);
  return upper;
}

export function cryptoName(symbol: string): string {
  return CRYPTO_NAMES.get(symbol) ?? symbol;
}

export function assetPath(assetType: AssetType, symbol: string): string {
  return `/asset/${assetType}/${encodeURIComponent(symbol)}`;
}
