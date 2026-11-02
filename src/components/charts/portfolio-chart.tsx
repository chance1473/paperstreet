"use client";

import { useMemo, useState } from "react";

import { FinancialChart } from "@/components/charts/financial-chart";
import { asBigInt } from "@/lib/money";
import type { ClientSnapshot } from "@/lib/types";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;

function cutoff(range: (typeof RANGES)[number]) {
  const date = new Date();
  if (range === "1D") date.setDate(date.getDate() - 1);
  if (range === "1W") date.setDate(date.getDate() - 7);
  if (range === "1M") date.setMonth(date.getMonth() - 1);
  if (range === "3M") date.setMonth(date.getMonth() - 3);
  if (range === "1Y") date.setFullYear(date.getFullYear() - 1);
  if (range === "ALL") return 0;
  return date.getTime();
}

export function PortfolioChart({ snapshots }: { snapshots: ClientSnapshot[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1M");
  const data = useMemo(() => {
    const min = cutoff(range);
    return snapshots
      .filter((snapshot) => new Date(snapshot.capturedAt).getTime() >= min)
      .map((snapshot) => ({
        time: Math.floor(new Date(snapshot.capturedAt).getTime() / 1000),
        value: Number(asBigInt(snapshot.valueCents)) / 100,
      }));
  }, [range, snapshots]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {RANGES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setRange(item)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              item === range ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {data.length < 2 ? (
        <div className="flex h-[280px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Performance history is recorded when the account opens, after trades, and while you use the
          dashboard. This range does not have enough saved snapshots yet.
        </div>
      ) : (
        <FinancialChart data={data} />
      )}
    </div>
  );
}
