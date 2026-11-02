"use client";

import Link from "next/link";

import { useQuote } from "@/components/market/live-quotes";
import { Badge } from "@/components/ui/badge";
import { asBigInt, formatPercent, formatPriceMicros, toneClass } from "@/lib/money";
import { assetPath } from "@/lib/symbols";
import type { AssetType } from "@/lib/money";

export type QuoteRow = {
  symbol: string;
  name: string;
  assetType: AssetType;
};

export function QuoteTable({ rows, empty }: { rows: QuoteRow[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-white/8">
            <th className="px-5 py-3 font-medium">Symbol</th>
            <th className="px-3 py-3 font-medium">Name</th>
            <th className="px-3 py-3 text-right font-medium">Price</th>
            <th className="px-5 py-3 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <QuoteLine key={`${row.assetType}:${row.symbol}`} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuoteLine({ row }: { row: QuoteRow }) {
  const quote = useQuote(row.assetType, row.symbol);
  const price = quote?.priceMicros ? asBigInt(quote.priceMicros) : null;
  const previous = quote?.previousCloseMicros ? asBigInt(quote.previousCloseMicros) : null;
  const change = price !== null && previous !== null ? price - previous : null;

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
      <td className="px-5 py-3">
        <Link href={assetPath(row.assetType, row.symbol)} className="font-medium hover:text-emerald-300">
          {row.symbol}
        </Link>
        <Badge className="ml-2">{row.assetType}</Badge>
      </td>
      <td className="px-3 py-3 text-muted-foreground">{quote?.name || row.name}</td>
      <td className="px-3 py-3 text-right font-mono">{price === null ? "—" : formatPriceMicros(price)}</td>
      <td className={`px-5 py-3 text-right font-mono ${toneClass(quote?.changePercent)}`}>
        <div>{change === null ? "—" : formatPriceMicros(change)}</div>
        <div className="text-xs">{formatPercent(quote?.changePercent ?? null)}</div>
      </td>
    </tr>
  );
}
