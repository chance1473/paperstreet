import {
  STARTING_CASH_CENTS,
  asBigInt,
  percentFromCents,
  valueCents,
  type AssetType,
} from "@/lib/money";
import type { ClientPosition, ClientSnapshot } from "@/lib/types";

export type PricedPosition = ClientPosition & {
  priceMicros: string | null;
  marketValueCents: string | null;
  costBasisCents: string;
  unrealizedCents: string | null;
  unrealizedPercent: number | null;
};

export type AccountSummary = {
  cashCents: string;
  investedCents: string | null;
  valueCents: string | null;
  pnlCents: string | null;
  returnPercent: number | null;
  pricesAvailable: boolean;
  positions: PricedPosition[];
};

export function pricePositions(
  positions: ClientPosition[],
  quotes: { symbol: string; assetType: AssetType; priceMicros: string | null }[],
): { positions: PricedPosition[]; pricesAvailable: boolean } {
  const lookup = new Map(quotes.map((quote) => [`${quote.assetType}:${quote.symbol}`, quote]));
  let pricesAvailable = true;
  const priced = positions.map((position) => {
    const quote = lookup.get(`${position.assetType}:${position.symbol}`);
    const qty = asBigInt(position.quantityUnits);
    const avg = asBigInt(position.avgPriceMicros);
    const cost = valueCents(qty, avg);
    if (!quote?.priceMicros) {
      pricesAvailable = false;
      return {
        ...position,
        priceMicros: null,
        marketValueCents: null,
        costBasisCents: cost.toString(),
        unrealizedCents: null,
        unrealizedPercent: null,
      };
    }
    const price = asBigInt(quote.priceMicros);
    const market = valueCents(qty, price);
    const unrealized = market - cost;
    return {
      ...position,
      priceMicros: price.toString(),
      marketValueCents: market.toString(),
      costBasisCents: cost.toString(),
      unrealizedCents: unrealized.toString(),
      unrealizedPercent: percentFromCents(unrealized, cost),
    };
  });
  return { positions: priced, pricesAvailable };
}

export function summarize(
  cashCents: bigint,
  positions: PricedPosition[],
  pricesAvailable: boolean,
): AccountSummary {
  if (positions.length === 0) {
    const pnl = cashCents - STARTING_CASH_CENTS;
    return {
      cashCents: cashCents.toString(),
      investedCents: "0",
      valueCents: cashCents.toString(),
      pnlCents: pnl.toString(),
      returnPercent: percentFromCents(pnl, STARTING_CASH_CENTS),
      pricesAvailable: true,
      positions,
    };
  }

  if (!pricesAvailable) {
    return {
      cashCents: cashCents.toString(),
      investedCents: null,
      valueCents: null,
      pnlCents: null,
      returnPercent: null,
      pricesAvailable: false,
      positions,
    };
  }

  const invested = positions.reduce(
    (sum, position) => sum + asBigInt(position.marketValueCents ?? "0"),
    0n,
  );
  const value = cashCents + invested;
  const pnl = value - STARTING_CASH_CENTS;
  return {
    cashCents: cashCents.toString(),
    investedCents: invested.toString(),
    valueCents: value.toString(),
    pnlCents: pnl.toString(),
    returnPercent: percentFromCents(pnl, STARTING_CASH_CENTS),
    pricesAvailable: true,
    positions,
  };
}

export function todayPerformance(snapshots: ClientSnapshot[]): {
  changeCents: bigint;
  percent: number | null;
} | null {
  if (snapshots.length < 2) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const latest = snapshots[snapshots.length - 1];
  const prior = [...snapshots]
    .reverse()
    .find((snapshot) => new Date(snapshot.capturedAt) < start);
  if (!latest || !prior) return null;
  const change = asBigInt(latest.valueCents) - asBigInt(prior.valueCents);
  return {
    changeCents: change,
    percent: percentFromCents(change, asBigInt(prior.valueCents)),
  };
}
