import type { AssetType } from "@/lib/money";

export type ClientQuote = {
  symbol: string;
  name: string;
  assetType: AssetType;
  priceMicros: string | null;
  previousCloseMicros: string | null;
  changePercent: number | null;
  marketOpen: boolean | null;
};

export type ClientPosition = {
  symbol: string;
  assetType: AssetType;
  assetName: string;
  quantityUnits: string;
  avgPriceMicros: string;
};

export type ClientTransaction = {
  id: string;
  symbol: string;
  assetType: AssetType;
  assetName: string;
  side: "buy" | "sell";
  quantityUnits: string;
  priceMicros: string;
  totalCents: string;
  createdAt: string;
};

export type ClientSnapshot = {
  valueCents: string;
  capturedAt: string;
};

export type AssetProfile = {
  symbol: string;
  name: string;
  assetType: AssetType;
  exchange: string | null;
  tradable: boolean | null;
  fractionable: boolean | null;
  status: string | null;
};

export type ChartBar = {
  time: number;
  value: number;
};

export type LeaderboardEntry = {
  rank: number;
  book: "live" | "practice";
  username: string;
  displayName: string;
  valueCents: string;
  investedCents: string;
  profitCents: string;
  returnPercent: number;
  avatarUrl: string | null;
};
