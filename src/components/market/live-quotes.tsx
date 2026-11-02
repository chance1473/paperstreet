"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { AssetType } from "@/lib/money";
import type { ClientQuote } from "@/lib/types";

type AssetRef = { symbol: string; assetType: AssetType };

const QuoteContext = createContext<Map<string, ClientQuote>>(new Map());

export function quoteKey(assetType: AssetType, symbol: string) {
  return `${assetType}:${symbol}`;
}

export function useQuote(assetType: AssetType, symbol: string) {
  return useContext(QuoteContext).get(quoteKey(assetType, symbol)) ?? null;
}

export function useQuoteMap() {
  return useContext(QuoteContext);
}

export function LiveQuotes({
  initial,
  assets,
  children,
}: {
  initial: ClientQuote[];
  assets: AssetRef[];
  children: React.ReactNode;
}) {
  const [quotes, setQuotes] = useState(initial);
  const [source, setSource] = useState(initial);
  const assetKey = JSON.stringify(assets);

  if (source !== initial) {
    setSource(initial);
    setQuotes(initial);
  }

  useEffect(() => {
    const parsed = JSON.parse(assetKey) as AssetRef[];
    if (parsed.length === 0) return;
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assets: parsed }),
        });
        if (!response.ok) return;
        const body = (await response.json()) as { quotes?: ClientQuote[] };
        if (!cancelled && body.quotes) setQuotes(body.quotes);
      } catch {
        // Keep the last good prices on a transient network failure.
      }
    }

    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [assetKey]);

  const map = useMemo(() => {
    const next = new Map<string, ClientQuote>();
    for (const quote of quotes) next.set(quoteKey(quote.assetType, quote.symbol), quote);
    return next;
  }, [quotes]);

  return <QuoteContext.Provider value={map}>{children}</QuoteContext.Provider>;
}
