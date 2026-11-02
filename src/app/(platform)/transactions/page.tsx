import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";

import { TransactionsTable } from "@/components/transactions/transactions-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTransactions } from "@/lib/portfolio";
import { normalizeSymbol } from "@/lib/symbols";
import { getSessionUser } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Transactions · PaperStreet" };

const FILTERS = [
  { label: "All", href: "/transactions" },
  { label: "Buy", href: "/transactions?side=buy" },
  { label: "Sell", href: "/transactions?side=sell" },
  { label: "Stocks", href: "/transactions?type=stock" },
  { label: "Crypto", href: "/transactions?type=crypto" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ side?: string; type?: string; symbol?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (!user) return null;
  const symbol = params.symbol ? normalizeSymbol(params.symbol) : "";
  const rows = await getTransactions(user.id, {
    side: params.side,
    assetType: params.type,
    symbol,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Filled paper orders stay in the ledger after a position is closed. A reset clears this history."
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active =
              filter.href === "/transactions"
                ? !params.side && !params.type
                : filter.href.endsWith(`side=${params.side}`) || filter.href.endsWith(`type=${params.type}`);
            return (
              <Link
                key={filter.href}
                href={filter.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  active ? "bg-white/10" : "text-muted-foreground hover:bg-white/5",
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
        <form className="w-full md:w-56">
          {params.side ? <input type="hidden" name="side" value={params.side} /> : null}
          {params.type ? <input type="hidden" name="type" value={params.type} /> : null}
          <Input name="symbol" defaultValue={symbol} placeholder="Filter by symbol" aria-label="Filter by symbol" />
        </form>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <TransactionsTable rows={rows} />
      </Card>
    </div>
  );
}
