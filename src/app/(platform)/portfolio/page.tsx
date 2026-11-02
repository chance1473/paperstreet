import { PageHeader } from "@/components/layout/page-header";
import { LiveQuotes } from "@/components/market/live-quotes";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { AccountStats } from "@/components/account/account-stats";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketDataError, getQuotes } from "@/lib/market-data/alpaca";
import { buildSummary } from "@/lib/portfolio";
import { getSessionUser } from "@/lib/supabase/session";
import type { ClientQuote } from "@/lib/types";

export const metadata = { title: "Portfolio · PaperStreet" };

export default async function PortfolioPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const summary = await buildSummary(user.id);
  if (!summary) {
    return <p className="text-sm text-muted-foreground">Your paper account is missing.</p>;
  }

  let quotes: ClientQuote[] = [];
  let marketError: string | null = null;
  try {
    if (summary.positions.length) {
      quotes = await getQuotes(
        summary.positions.map((position) => ({
          symbol: position.symbol,
          assetType: position.assetType,
        })),
      );
    }
  } catch (error) {
    marketError = error instanceof MarketDataError ? error.message : "Live prices are unavailable.";
  }

  return (
    <LiveQuotes
      initial={quotes}
      assets={summary.positions.map((position) => ({
        symbol: position.symbol,
        assetType: position.assetType,
      }))}
    >
      <div className="space-y-6">
        <PageHeader title="Portfolio" description="Open positions marked at the latest price." />
        {marketError ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {marketError}
          </p>
        ) : null}
        <AccountStats
          cashCents={summary.cashCents}
          positions={summary.positions}
          todayChangeCents={null}
          todayPercent={null}
        />
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <HoldingsTable positions={summary.positions} />
        </Card>
      </div>
    </LiveQuotes>
  );
}
