"use client";

import { useQuote } from "@/components/market/live-quotes";
import {
  asBigInt,
  centsTone,
  formatCents,
  formatPercent,
  formatPriceMicros,
  formatQuantity,
  formatSignedCents,
  percentFromCents,
  toneClass,
  valueCents,
} from "@/lib/money";
import type { ClientPosition } from "@/lib/types";

export function PositionPanel({ position }: { position: ClientPosition | null }) {
  const quote = useQuote(position?.assetType ?? "stock", position?.symbol ?? "");

  if (!position) {
    return <p className="text-sm text-muted-foreground">You do not own this asset.</p>;
  }

  const qty = asBigInt(position.quantityUnits);
  const avg = asBigInt(position.avgPriceMicros);
  const cost = valueCents(qty, avg);
  const price = quote?.priceMicros ? asBigInt(quote.priceMicros) : null;
  const market = price === null ? null : valueCents(qty, price);
  const unrealized = market === null ? null : market - cost;
  const percent = unrealized === null ? null : percentFromCents(unrealized, cost);

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <Item label="Quantity" value={formatQuantity(qty, position.assetType)} />
      <Item label="Average price" value={formatPriceMicros(avg)} />
      <Item label="Market price" value={price === null ? "—" : formatPriceMicros(price)} />
      <Item label="Market value" value={market === null ? "—" : formatCents(market)} />
      <Item label="Cost basis" value={formatCents(cost)} />
      <Item
        label="Unrealized P/L"
        value={unrealized === null ? "—" : `${formatSignedCents(unrealized)} (${formatPercent(percent)})`}
        tone={unrealized === null ? undefined : centsTone(unrealized)}
        extra={toneClass(percent)}
      />
    </dl>
  );
}

function Item({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
  extra?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-mono ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}
