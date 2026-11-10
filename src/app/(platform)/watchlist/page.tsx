import { PageHeader } from "@/components/layout/page-header";
import { LiveQuotes } from "@/components/market/live-quotes";
import { MarketDataWarning } from "@/components/market/market-data-warning";
import { WatchlistCard } from "@/components/market/watchlist-card";
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
        <MarketDataWarning message={marketError} />
        <WatchlistCard title="Saved assets" items={watchlist} empty="Add an asset from its page to watch it." />
      </div>
    </LiveQuotes>
  );
}
