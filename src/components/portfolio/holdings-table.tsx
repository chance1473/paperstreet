"use client";

import Link from "next/link";

import { useQuote } from "@/components/market/live-quotes";
import {
  asBigInt,
  formatCents,
  formatPercent,
  formatPriceMicros,
  formatQuantity,
  formatSignedCents,
  percentFromCents,
  toneClass,
  valueCents,
  centsTone,
} from "@/lib/money";
import { assetPath } from "@/lib/symbols";
import type { ClientPosition } from "@/lib/types";

export function HoldingsTable({ positions }: { positions: ClientPosition[] }) {
  if (positions.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-muted-foreground">
        No open positions. Buy a stock or cryptocurrency to start a holding.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-white/8">
            <th className="px-5 py-3 font-medium">Symbol</th>
            <th className="px-3 py-3 text-right font-medium">Qty</th>
            <th className="px-3 py-3 text-right font-medium">Avg cost</th>
            <th className="px-3 py-3 text-right font-medium">Price</th>
            <th className="px-3 py-3 text-right font-medium">Market value</th>
            <th className="px-3 py-3 text-right font-medium">Cost basis</th>
            <th className="px-5 py-3 text-right font-medium">Unrealized</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <HoldingRow key={`${position.assetType}:${position.symbol}`} position={position} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldingRow({ position }: { position: ClientPosition }) {
  const quote = useQuote(position.assetType, position.symbol);
  const qty = asBigInt(position.quantityUnits);
  const avg = asBigInt(position.avgPriceMicros);
  const cost = valueCents(qty, avg);
  const price = quote?.priceMicros ? asBigInt(quote.priceMicros) : null;
  const market = price === null ? null : valueCents(qty, price);
  const unrealized = market === null ? null : market - cost;

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
      <td className="px-5 py-3">
        <Link href={assetPath(position.assetType, position.symbol)} className="font-medium hover:text-emerald-300">
          {position.symbol}
        </Link>
        <div className="text-xs text-muted-foreground">{position.assetName}</div>
      </td>
      <td className="px-3 py-3 text-right font-mono">{formatQuantity(qty, position.assetType)}</td>
      <td className="px-3 py-3 text-right font-mono">{formatPriceMicros(avg)}</td>
      <td className="px-3 py-3 text-right font-mono">{price === null ? "—" : formatPriceMicros(price)}</td>
      <td className="px-3 py-3 text-right font-mono">{market === null ? "—" : formatCents(market)}</td>
      <td className="px-3 py-3 text-right font-mono">{formatCents(cost)}</td>
      <td className={`px-5 py-3 text-right font-mono ${unrealized === null ? "text-muted-foreground" : centsTone(unrealized)}`}>
        <div>{unrealized === null ? "—" : formatSignedCents(unrealized)}</div>
        <div className={`text-xs ${toneClass(unrealized === null ? null : percentFromCents(unrealized, cost))}`}>
          {unrealized === null ? "—" : formatPercent(percentFromCents(unrealized, cost))}
        </div>
      </td>
    </tr>
  );
}
