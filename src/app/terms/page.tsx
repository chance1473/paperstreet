import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms · PaperStreet" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-6 text-muted-foreground">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Terms</h1>
      <p className="mt-4">
        PaperStreet lets you practice with simulated cash and live or fallback market prices. Using the app means you accept the limits below.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5">
        <li>Balances, fills, and the leaderboard are simulated. They are not a brokerage account and not a promise of any market result.</li>
        <li>Nothing in the app is investment, tax, or legal advice.</li>
        <li>Prices can be delayed, missing, or from a public fallback. A paper fill uses the server price at the time of the order, not the number shown in the browser.</li>
        <li>You may not use the app to move real money. There is no deposit, withdrawal, or broker order.</li>
        <li>Account data is stored as the privacy page describes, including email, the paper book, and optional profile images shared with the database host and, for symbol lookups only, the market-data provider.</li>
      </ul>
      <p className="mt-8">
        <Link href="/privacy" className="text-[#e7c98a] underline-offset-4 hover:underline">Privacy</Link>
        {" · "}
        <Link href="/" className="text-[#e7c98a] underline-offset-4 hover:underline">Home</Link>
      </p>
    </main>
  );
}
