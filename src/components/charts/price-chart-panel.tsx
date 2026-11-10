"use client";

import { useEffect, useState } from "react";

import { ChartRangePicker, type ChartRange } from "@/components/charts/chart-range-picker";
import { FinancialChart } from "@/components/charts/financial-chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssetType } from "@/lib/money";
import type { ChartBar } from "@/lib/types";

export function PriceChartPanel({ symbol, assetType }: { symbol: string; assetType: AssetType }) {
  const [range, setRange] = useState<ChartRange>("1D");
  const requestKey = `${symbol}:${assetType}:${range}`;
  const [result, setResult] = useState<{ key: string; bars: ChartBar[]; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/bars?symbol=${encodeURIComponent(symbol)}&type=${assetType}&range=${range}`,
        );
        if (!response.ok) throw new Error("bars");
        const body = (await response.json()) as { bars?: ChartBar[] };
        if (!cancelled) setResult({ key: requestKey, bars: body.bars ?? [], error: false });
      } catch {
        if (!cancelled) setResult({ key: requestKey, bars: [], error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetType, range, requestKey, symbol]);

  const current = result?.key === requestKey ? result : null;
  const status = !current ? "loading" : current.error ? "error" : "ready";
  const bars = current?.bars ?? [];

  return (
    <div>
      <ChartRangePicker range={range} onChange={setRange} />
      {status === "loading" ? <Skeleton className="h-[360px] w-full" /> : null}
      {status === "error" ? (
        <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
          Chart data is unavailable right now.
        </div>
      ) : null}
      {status === "ready" ? <FinancialChart data={bars} /> : null}
    </div>
  );
}
