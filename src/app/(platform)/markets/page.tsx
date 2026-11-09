import { PageHeader } from "@/components/layout/page-header";
import { LiveQuotes } from "@/components/market/live-quotes";
import { MarketDataWarning } from "@/components/market/market-data-warning";
import { WatchlistCard } from "@/components/market/watchlist-card";
import { QuoteTable } from "@/components/market/quote-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarketDataError, getMovers, getQuotes, searchAssets } from "@/lib/market-data/alpaca";
import { getWatchlist } from "@/lib/portfolio";
import { POPULAR_CRYPTO, POPULAR_STOCKS } from "@/lib/symbols";
import { getSessionUser } from "@/lib/supabase/session";
import type { ClientQuote } from "@/lib/types";

export const metadata = { title: "Markets · PaperStreet" };

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const user = await getSessionUser();
  const watchlist = user ? await getWatchlist(user.id) : [];
  const results = query ? await searchAssets(query).catch(() => []) : [];

  const assets = [
    ...POPULAR_STOCKS.map((item) => ({ ...item, assetType: "stock" as const })),
    ...POPULAR_CRYPTO.map((item) => ({ ...item, assetType: "crypto" as const })),
    ...watchlist.map((item) => ({ symbol: item.symbol, name: item.assetName, assetType: item.assetType })),
    ...results.map((item) => ({ symbol: item.symbol, name: item.name, assetType: item.assetType })),
  ];
  const unique = new Map(assets.map((asset) => [`${asset.assetType}:${asset.symbol}`, asset]));

  let quotes: ClientQuote[] = [];
  let marketError: string | null = null;
  let movers: { gainers: ClientQuote[]; losers: ClientQuote[] } = { gainers: [], losers: [] };

  try {
    quotes = await getQuotes([...unique.values()]);
    movers = await getMovers();
  } catch (error) {
    marketError =
      error instanceof MarketDataError ? error.message : "Market data is temporarily unavailable.";
  }

  const moverAssets = [...movers.gainers, ...movers.losers].map((quote) => ({
    symbol: quote.symbol,
    name: quote.name,
    assetType: quote.assetType,
  }));

  return (
    <LiveQuotes initial={[...quotes, ...movers.gainers, ...movers.losers]} assets={[...unique.values(), ...moverAssets]}>
      <div className="space-y-6">
        <PageHeader
          title="Markets"
          description="Search US stocks, ETFs, and cryptocurrencies."
        >
          <form className="w-full md:w-72">
            <Input name="q" defaultValue={query} placeholder="Search symbol or company" aria-label="Search assets" />
          </form>
        </PageHeader>
        <MarketDataWarning message={marketError} />
        {query ? (
          <Card>
            <CardHeader>
              <CardTitle>Search results</CardTitle>
            </CardHeader>
            <QuoteTable
              rows={results}
              empty="No supported assets matched that search."
            />
          </Card>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Popular stocks</CardTitle>
            </CardHeader>
            <QuoteTable
              rows={POPULAR_STOCKS.map((stock) => ({ ...stock, assetType: "stock" }))}
              empty="Popular stocks are unavailable."
            />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Popular cryptocurrencies</CardTitle>
            </CardHeader>
            <QuoteTable
              rows={POPULAR_CRYPTO.map((coin) => ({ ...coin, assetType: "crypto" }))}
              empty="Cryptocurrency prices are unavailable."
            />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gainers</CardTitle>
            </CardHeader>
            <QuoteTable rows={movers.gainers} empty="Mover data is unavailable." />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Losers</CardTitle>
            </CardHeader>
            <QuoteTable rows={movers.losers} empty="Mover data is unavailable." />
          </Card>
        </div>
        <WatchlistCard title="Your watchlist" items={watchlist} empty="Nothing saved yet." />
      </div>
    </LiveQuotes>
  );
}
