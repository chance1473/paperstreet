import { PageHeader } from "@/components/layout/page-header";
import { LiveQuotes } from "@/components/market/live-quotes";
import { QuoteTable } from "@/components/market/quote-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketDataError, getQuotes } from "@/lib/market-data/alpaca";
import { getWatchlist } from "@/lib/portfolio";
import { getSessionUser } from "@/lib/supabase/session";
import type { ClientQuote } from "@/lib/types";

export const metadata = { title: "Watchlist · PaperStreet" };

export default async function WatchlistPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const watchlist = await getWatchlist(user.id);
  let quotes: ClientQuote[] = watchlist.map((item) => ({
    symbol: item.symbol,
    name: item.assetName,
    assetType: item.assetType,
    priceMicros: null,
    previousCloseMicros: null,
    changePercent: null,
    marketOpen: null,
  }));
  let marketError: string | null = null;

  try {
    if (watchlist.length) quotes = await getQuotes(watchlist);
  } catch (error) {
    marketError = error instanceof MarketDataError ? error.message : "Live prices are unavailable.";
  }

  return (
    <LiveQuotes initial={quotes} assets={watchlist}>
      <div className="space-y-6">
        <PageHeader title="Watchlist" description="Saved symbols stay with your account." />
        {marketError ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {marketError}
          </p>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Saved assets</CardTitle>
          </CardHeader>
          <QuoteTable
            rows={watchlist.map((item) => ({
              symbol: item.symbol,
              name: item.assetName,
              assetType: item.assetType,
            }))}
            empty="Add an asset from its page to watch it."
          />
        </Card>
      </div>
    </LiveQuotes>
  );
}
