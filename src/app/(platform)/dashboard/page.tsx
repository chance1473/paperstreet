import { AccountStats } from "@/components/account/account-stats";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { LiveQuotes } from "@/components/market/live-quotes";
import { QuoteTable } from "@/components/market/quote-table";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { MarketDataError, getQuotes } from "@/lib/market-data/alpaca";
import { asBigInt } from "@/lib/money";
import {
  buildSummary,
  getSnapshots,
  getTransactions,
  getWatchlist,
  recordSnapshot,
} from "@/lib/portfolio";
import { todayPerformance } from "@/lib/pricing";
import { POPULAR_STOCKS } from "@/lib/symbols";
import { getSessionUser } from "@/lib/supabase/session";
import type { ClientQuote } from "@/lib/types";

export const metadata = { title: "Dashboard · PaperStreet" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const summary = await buildSummary(user.id);
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Your paper account was not created. Apply the Supabase migration and sign up again.
      </p>
    );
  }

  if (summary.valueCents) {
    await recordSnapshot(user.id, asBigInt(summary.valueCents));
  }

  const [snapshots, transactions, watchlist] = await Promise.all([
    getSnapshots(user.id),
    getTransactions(user.id, {}),
    getWatchlist(user.id),
  ]);

  const assets = [
    ...summary.positions.map((position) => ({
      symbol: position.symbol,
      assetType: position.assetType,
      name: position.assetName,
    })),
    ...watchlist.map((item) => ({
      symbol: item.symbol,
      assetType: item.assetType,
      name: item.assetName,
    })),
    ...POPULAR_STOCKS.slice(0, 6).map((stock) => ({
      symbol: stock.symbol,
      assetType: "stock" as const,
      name: stock.name,
    })),
  ];

  const unique = new Map(assets.map((asset) => [`${asset.assetType}:${asset.symbol}`, asset]));
  let quotes: ClientQuote[] = [...unique.values()].map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    assetType: asset.assetType,
    priceMicros: null,
    previousCloseMicros: null,
    changePercent: null,
    marketOpen: null,
  }));
  let marketError: string | null = null;

  try {
    if (unique.size) quotes = await getQuotes([...unique.values()]);
  } catch (error) {
    marketError =
      error instanceof MarketDataError ? error.message : "Live prices are temporarily unavailable.";
  }

  const today = todayPerformance(snapshots);

  return (
    <LiveQuotes initial={quotes} assets={[...unique.values()]}>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Simulated portfolio marked to the latest available prices."
        />
        {marketError ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {marketError}
          </p>
        ) : null}
        <AccountStats
          cashCents={summary.cashCents}
          positions={summary.positions}
          todayChangeCents={today ? today.changeCents.toString() : null}
          todayPercent={today?.percent ?? null}
        />
        <Card>
          <CardHeader>
            <CardTitle>Portfolio performance</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioChart snapshots={snapshots} />
          </CardContent>
        </Card>
        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            <HoldingsTable positions={summary.positions} />
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Watchlist</CardTitle>
            </CardHeader>
            <QuoteTable
              rows={watchlist.map((item) => ({
                symbol: item.symbol,
                name: item.assetName,
                assetType: item.assetType,
              }))}
              empty="Your watchlist is empty. Add assets from a quote page."
            />
          </Card>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent transactions</CardTitle>
            </CardHeader>
            <TransactionsTable rows={transactions.slice(0, 8)} />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Market overview</CardTitle>
            </CardHeader>
            <QuoteTable
              rows={POPULAR_STOCKS.slice(0, 6).map((stock) => ({
                ...stock,
                assetType: "stock" as const,
              }))}
              empty="Market overview is unavailable."
            />
          </Card>
        </div>
      </div>
    </LiveQuotes>
  );
}
