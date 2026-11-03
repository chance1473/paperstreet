import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { PageHeader } from "@/components/layout/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ownedProfileImageUrl } from "@/lib/appearance";
import { asBigInt, centsTone, formatCents, formatPercent, formatSignedCents } from "@/lib/money";
import { getLeaderboard, getProfile } from "@/lib/portfolio";
import { getSessionUser } from "@/lib/supabase/session";
import type { LeaderboardEntry } from "@/lib/types";
import { hasServiceRoleEnv } from "@/lib/utils";

export const metadata = { title: "Leaderboard · PaperStreet" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  let live: LeaderboardEntry[] = [];
  let practice: LeaderboardEntry[] = [];
  let error: string | null = null;

  if (!hasServiceRoleEnv()) {
    error = "The leaderboard needs the server-side Supabase service role key.";
  } else {
    try {
      const boards = await getLeaderboard();
      live = boards.live;
      practice = boards.practice;
    } catch {
      error = "Rankings are temporarily unavailable.";
    }
  }

  const content = (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        description="Public rankings use stored cash and positions priced on the server. The practice book sits beside the live book and stays at $100,000 until a saved position exists. Every account starts at $100,000. Return is (account value − 100,000) / 100,000."
      />
      {error ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{error}</p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <BookTable title="Paper accounts" empty="No ranked accounts yet." entries={live} />
        <BookTable title="Practice books" empty="No ranked practice books yet." entries={practice} />
      </div>
    </div>
  );

  if (user) {
    return (
      <AppShell displayName={profile?.displayName ?? "Trader"} avatarUrl={ownedProfileImageUrl(user.id, profile?.avatarPath)}>
        {content}
      </AppShell>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-3 text-sm">
          <Badge>Paper trading only — no real money</Badge>
          <Link href="/login" className="text-[#e7c98a]">
            Log in
          </Link>
        </div>
      </div>
      {content}
    </main>
  );
}

function BookTable({
  title,
  empty,
  entries,
}: {
  title: string;
  empty: string;
  entries: LeaderboardEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-white/8">
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-3 py-3 font-medium">Trader</th>
              <th className="px-3 py-3 text-right font-medium">Invested</th>
              <th className="px-3 py-3 text-right font-medium">Profit or loss</th>
              <th className="px-3 py-3 text-right font-medium">Portfolio value</th>
              <th className="px-5 py-3 text-right font-medium">Return</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={6}>
                  {empty}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={`${entry.book}:${entry.username}`} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 font-mono">{entry.rank}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={`${entry.displayName} profile picture`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-xs font-medium">
                          {entry.displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <div className="font-medium">{entry.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          @{entry.username} · {entry.book === "practice" ? "Practice" : "Live"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{formatCents(asBigInt(entry.investedCents))}</td>
                  <td className={`px-3 py-3 text-right font-mono ${centsTone(asBigInt(entry.profitCents))}`}>
                    {formatSignedCents(asBigInt(entry.profitCents))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{formatCents(asBigInt(entry.valueCents))}</td>
                  <td className={`px-5 py-3 text-right font-mono ${centsTone(asBigInt(entry.valueCents) - 10_000_000n)}`}>
                    {formatPercent(entry.returnPercent)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
