import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "What PaperStreet does not do · PaperStreet" };

const SUPPORTED = [
  "A signed-in paper account that starts with $100,000 of simulated cash.",
  "Market buy and sell orders in shares or dollars, for US stocks and cryptocurrencies the price feed recognizes.",
  "Live quotes and charts when a market-data key is configured, and a public fallback feed when it is not.",
  "A private book: cash, positions, trades, watchlist, and a practice book that replays stored prices.",
  "A public leaderboard that shows a display name, portfolio value, and return.",
];

const NOT_SUPPORTED = [
  "Real money, deposits, withdrawals, or orders sent to a broker.",
  "Limit, stop, short, options, or margin orders. A sell can only close shares the paper account already holds.",
  "Investment advice, tax reporting, or a live brokerage account.",
  "A custom domain or email sent from the owner's own domain. Sign-up mail, when it is sent, comes from the database host.",
  "File sharing. The only uploads are a profile picture and a desk background, and those images are readable by anyone who has the address.",
];

export default function LimitsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e7c98a]">Paper trading only — no real money</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">What this app does, and what it does not</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        PaperStreet is a practice desk. Nothing on this page is a plan for later. These are the limits of the app as it runs today.
      </p>

      <h2 className="mt-10 text-lg font-medium">Supported</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        {SUPPORTED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-medium">Not supported</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        {NOT_SUPPORTED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <p className="mt-10 text-sm">
        <Link href="/" className="text-[#e7c98a] underline-offset-4 hover:underline">
          Back to the desk
        </Link>
      </p>
    </main>
  );
}
