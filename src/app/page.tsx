import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

const STEPS = [
  { n: "01", title: "Open a book", body: "Create an account. It starts with $100,000 in virtual cash and nothing else." },
  { n: "02", title: "Mark to market", body: "US stocks and crypto are priced from Alpaca. Closed markets keep the last trade." },
  { n: "03", title: "Place a paper order", body: "Market buys and sells update cash, positions, and the ledger in one transaction." },
];

const FEATURES = [
  { title: "Private books", body: "Row Level Security isolates every account. One user cannot read another user’s positions or history." },
  { title: "Server-side fills", body: "The browser never sets the execution price, cash balance, or share quantity used to fill an order." },
  { title: "A permanent ledger", body: "Selling a position does not erase the trade. Reset is the only action that clears history." },
  { title: "Public rankings", body: "The leaderboard shows a display name, portfolio value, and return. Email addresses stay off it." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07080b]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/leaderboard" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:inline">
              Leaderboard
            </Link>
            <Link href="/login" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="rounded-md bg-[#e7c98a] px-3 py-2 font-medium text-[#1a1408]">
              Open an account
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-20">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e7c98a]">
            Paper trading only — no real money
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Practice with live prices. Keep the money simulated.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            PaperStreet is a brokerage desk for US stocks and cryptocurrency. Research a name, place a market
            order, and watch the book update. No deposits. No orders sent to a broker.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-md bg-[#e7c98a] px-4 py-2.5 text-sm font-medium text-[#1a1408]">
              Start with $100,000
            </Link>
            <Link href="/login" className="rounded-md border border-white/12 px-4 py-2.5 text-sm">
              Log in
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0f14] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="ml-2 text-xs text-muted-foreground">Dashboard</span>
          </div>
          <div className="grid grid-cols-[9rem_1fr]">
            <div className="hidden border-r border-white/8 p-3 text-xs text-muted-foreground sm:block">
              {["Dashboard", "Markets", "Portfolio", "Watchlist", "Transactions"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-md px-2 py-2 ${index === 0 ? "bg-white/8 text-foreground" : ""}`}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Account value</div>
              <div className="mt-1 font-mono text-3xl tracking-tight">$100,000.00</div>
              <div className="mt-1 text-sm text-emerald-400">+$0.00 · 0.00%</div>
              <div className="mt-5 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                {[
                  ["Cash", "$100,000.00"],
                  ["Invested", "$0.00"],
                  ["Today", "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/8 bg-black/20 p-2">
                    <div className="text-muted-foreground">{label}</div>
                    <div className="mt-1 font-mono text-foreground">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 overflow-hidden rounded-md border border-white/8">
                {[
                  ["AAPL", "Apple", "$189.20", "+0.84%", false],
                  ["NVDA", "NVIDIA", "$118.44", "+1.26%", false],
                  ["BTC", "Bitcoin", "$64,210", "−0.42%", true],
                ].map(([symbol, name, price, change, down]) => (
                  <div key={String(symbol)} className="grid grid-cols-[4rem_1fr_auto_auto] items-center gap-3 border-b border-white/6 px-3 py-2 text-sm last:border-0">
                    <span className="font-medium">{symbol}</span>
                    <span className="truncate text-muted-foreground">{name}</span>
                    <span className="font-mono">{price}</span>
                    <span className={down ? "font-mono text-rose-300" : "font-mono text-emerald-300"}>{change}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Sample layout. Signed-in numbers come from your account and live quotes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n}>
              <div className="font-mono text-xs text-[#e7c98a]">{step.n}</div>
              <h2 className="mt-2 text-lg font-medium">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8 px-5 py-16 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="bg-background p-6">
            <h2 className="font-medium">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-16 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Open a paper account</h2>
          <p className="mt-2 text-sm text-muted-foreground">$100,000 virtual cash. No brokerage account required.</p>
        </div>
        <Link href="/signup" className="rounded-md bg-[#e7c98a] px-4 py-2.5 text-sm font-medium text-[#1a1408]">
          Create account
        </Link>
      </section>

      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>PaperStreet</span>
          <span>Paper trading only. No real-money deposits or brokerage orders.</span>
        </div>
      </footer>
    </main>
  );
}
