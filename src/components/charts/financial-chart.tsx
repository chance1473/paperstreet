"use client";

import { useEffect, useRef } from "react";

import type { ChartBar } from "@/lib/types";

export function FinancialChart({
  data,
  color = "#34d399",
}: {
  data: ChartBar[];
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || data.length === 0) return;
    let chart: { remove: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      const { createChart, AreaSeries, ColorType } = await import("lightweight-charts");
      if (cancelled || !ref.current) return;
      const instance = createChart(ref.current, {
        autoSize: true,
        height: 360,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#93a0b5",
          fontFamily: "var(--font-geist-sans), sans-serif",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: { borderColor: "rgba(255,255,255,0.08)" },
        crosshair: {
          vertLine: { color: "rgba(255,255,255,0.15)" },
          horzLine: { color: "rgba(255,255,255,0.15)" },
        },
      });
      const series = instance.addSeries(AreaSeries, {
        lineColor: color,
        topColor: "rgba(52, 211, 153, 0.28)",
        bottomColor: "rgba(52, 211, 153, 0.02)",
        priceLineVisible: false,
      });
      series.setData(data.map((bar) => ({ time: bar.time as never, value: bar.value })));
      instance.timeScale().fitContent();
      chart = instance;
    })();

    return () => {
      cancelled = true;
      chart?.remove();
    };
  }, [color, data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
        No price history is available for this range.
      </div>
    );
  }

  return <div ref={ref} className="h-[360px] w-full" />;
}
