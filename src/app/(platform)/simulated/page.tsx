import { PageHeader } from "@/components/layout/page-header";
import { SimulatedDesk } from "@/components/trading/simulated-desk";
import { getBars } from "@/lib/market-data/alpaca";
import { asBigInt } from "@/lib/money";
import { getPaperAccount } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/session";

export const metadata = { title: "Practice · PaperStreet" };

export default async function SimulatedPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data }, paper, bars] = await Promise.all([
    supabase.from("simulated_accounts").select("cash_cents").eq("user_id", user.id).maybeSingle(),
    getPaperAccount(user.id),
    getBars("AAPL", "stock", "1M"),
  ]);
  const simulatedCents = asBigInt((data?.cash_cents as number | string | undefined) ?? 10_000_000).toString();
  const liveCents = (paper?.cashCents ?? 10_000_000n).toString();
  const stored = bars.map((bar) => ({ time: bar.time, price: bar.value }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Practice"
        description="A second $100,000 book that replays stored prices. Paper trading only — no real money."
      />
      <SimulatedDesk bars={stored} simulatedCents={simulatedCents} liveCents={liveCents} />
    </div>
  );
}
