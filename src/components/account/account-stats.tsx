"use client";

import { useMemo } from "react";

import { useQuoteMap } from "@/components/market/live-quotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { asBigInt, centsTone, formatCents, formatPercent, formatSignedCents, toneClass } from "@/lib/money";
import { pricePositions, summarize } from "@/lib/pricing";
import type { ClientPosition } from "@/lib/types";

export function AccountStats({
  cashCents,
  positions,
  todayChangeCents,
  todayPercent,
}: {
  cashCents: string;
  positions: ClientPosition[];
  todayChangeCents: string | null;
  todayPercent: number | null;
}) {
  const quotes = useQuoteMap();
  const summary = useMemo(() => {
    const priced = pricePositions(
      positions,
      positions.map((position) => ({
        symbol: position.symbol,
        assetType: position.assetType,
        priceMicros: quotes.get(`${position.assetType}:${position.symbol}`)?.priceMicros ?? null,
      })),
    );
    return summarize(asBigInt(cashCents), priced.positions, priced.pricesAvailable);
  }, [cashCents, positions, quotes]);

  const value = summary.valueCents ? asBigInt(summary.valueCents) : null;
  const pnl = summary.pnlCents ? asBigInt(summary.pnlCents) : null;
  const today = todayChangeCents ? asBigInt(todayChangeCents) : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Stat
        label="Total account value"
        value={value === null ? "—" : formatCents(value)}
        hint="Cash plus the current market value of open positions."
        detail={summary.pricesAvailable ? null : "Waiting on live prices."}
      />
      <Stat label="Available cash" value={formatCents(asBigInt(summary.cashCents))} />
      <Stat
        label="Invested value"
        value={summary.investedCents ? formatCents(asBigInt(summary.investedCents)) : "—"}
      />
      <Stat
        label="Total profit / loss"
        value={pnl === null ? "—" : formatSignedCents(pnl)}
        tone={pnl === null ? undefined : centsTone(pnl)}
        hint="Compared with the $100,000 starting balance."
      />
      <Stat
        label="Total return"
        value={formatPercent(summary.returnPercent)}
        tone={toneClass(summary.returnPercent)}
        hint="(account value − 100,000) / 100,000"
      />
      <Stat
        label="Today"
        value={today === null ? "—" : formatSignedCents(today)}
        tone={today === null ? undefined : centsTone(today)}
        detail={today === null ? "Needs a snapshot from before today." : formatPercent(todayPercent)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  detail,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  detail?: string | null;
  tone?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hint ? (
            <Tooltip>
              <TooltipTrigger className="cursor-help">{label}</TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          ) : (
            label
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`font-mono text-2xl tracking-tight ${tone ?? ""}`}>{value}</div>
        {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}
