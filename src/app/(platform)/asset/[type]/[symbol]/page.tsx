import { notFound } from "next/navigation";

import { PriceChartPanel } from "@/components/charts/price-chart-panel";
import { LiveQuotes } from "@/components/market/live-quotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderTicket } from "@/components/trading/order-ticket";
import { PositionPanel } from "@/components/trading/position-panel";
import { WatchlistButton } from "@/components/trading/watchlist-button";
import { MarketDataError, getAssetProfile, getQuote } from "@/lib/market-data/alpaca";
import { asBigInt, formatPercent, formatPriceMicros, toneClass } from "@/lib/money";
import { getPaperAccount, getPositions, getWatchlist } from "@/lib/portfolio";
import { isAssetType, normalizeSymbol } from "@/lib/symbols";
import { getSessionUser } from "@/lib/supabase/session";
import type { ClientQuote } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; symbol: string }>;
}) {
  const { symbol } = await params;
  return { title: `${normalizeSymbol(symbol)} · PaperStreet` };
}

export default async function AssetPage({
  params,
}: {
  params: Promise<{ type: string; symbol: string }>;
}) {
  const route = await params;
  if (!isAssetType(route.type)) notFound();
  const symbol = normalizeSymbol(route.symbol);
  if (!symbol) notFound();

  const user = await getSessionUser();
  if (!user) return null;

  let quote: ClientQuote | null = null;
  let marketError: string | null = null;
  try {
    quote = await getQuote(symbol, route.type);
  } catch (error) {
    marketError = error instanceof MarketDataError ? error.message : "Live prices are unavailable.";
  }

  const profile = await getAssetProfile(symbol, route.type);
  if (!quote && !profile) notFound();

  const [account, positions, watchlist] = await Promise.all([
    getPaperAccount(user.id),
    getPositions(user.id),
    getWatchlist(user.id),
  ]);

  const position = positions.find((item) => item.symbol === symbol && item.assetType === route.type) ?? null;
  const watched = watchlist.some((item) => item.symbol === symbol && item.assetType === route.type);
  const name = profile?.name || quote?.name || symbol;
  const price = quote?.priceMicros ? asBigInt(quote.priceMicros) : null;
  const initial = quote ?? {
    symbol,
    name,
    assetType: route.type,
    priceMicros: null,
    previousCloseMicros: null,
    changePercent: null,
    marketOpen: route.type === "crypto" ? true : null,
  };

  return (
    <LiveQuotes initial={[initial]} assets={[{ symbol, assetType: route.type }]}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">{symbol}</h1>
                <Badge>{route.type}</Badge>
                {quote?.marketOpen === false ? <Badge>Market closed</Badge> : null}
              </div>
              <p className="mt-1 text-muted-foreground">{name}</p>
              <div className="mt-4 flex items-end gap-3">
                <div className="font-mono text-4xl">{price ? formatPriceMicros(price) : "—"}</div>
                <div className={`pb-1 font-mono ${toneClass(quote?.changePercent ?? null)}`}>
                  {formatPercent(quote?.changePercent ?? null)}
                </div>
              </div>
            </div>
            <WatchlistButton symbol={symbol} assetType={route.type} watched={watched} />
          </div>
          {marketError ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {marketError}
            </p>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Price</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChartPanel symbol={symbol} assetType={route.type} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{route.type === "crypto" ? "Asset details" : "Company details"}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Name" value={name} />
                <Detail label="Exchange" value={profile?.exchange ?? (route.type === "crypto" ? "Crypto" : "—")} />
                <Detail label="Status" value={profile?.status ?? "—"} />
                <Detail
                  label="Fractional trading"
                  value={
                    route.type === "crypto"
                      ? "Supported, up to 8 decimal places"
                      : profile?.fractionable
                        ? "Supported by the listing"
                        : "Paper orders allow fractional quantities"
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTicket
                symbol={symbol}
                assetType={route.type}
                assetName={name}
                cashCents={(account?.cashCents ?? 0n).toString()}
                ownedUnits={position?.quantityUnits ?? "0"}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Your position</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionPanel position={position} />
            </CardContent>
          </Card>
        </div>
      </div>
    </LiveQuotes>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
