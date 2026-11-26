import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy · PaperStreet" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-6 text-muted-foreground">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy</h1>
      <p className="mt-4">
        PaperStreet is a paper-trading practice app. It does not take deposits and it does not send orders to a broker.
        This page describes the data the app stores today and who else receives it.
      </p>
      <h2 className="mt-8 text-lg font-medium text-foreground">Data the app stores</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Account email, password (held by the sign-in service, not by the app pages), username, and display name.</li>
        <li>Paper cash, positions, trades, portfolio snapshots, and watchlist symbols.</li>
        <li>Optional profile picture and desk background image.</li>
        <li>Redacted error lines for failed sign-in, orders, and page loads, kept in a server log.</li>
      </ul>
      <h2 className="mt-8 text-lg font-medium text-foreground">Who else receives it</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Supabase stores the account, the paper book, and the profile images. Profile images are in a public bucket: anyone with the address can view them. Only the signed-in owner can upload or delete their own files.</li>
        <li>The market-data provider receives the symbols you look up. It does not receive your email or your paper balances.</li>
        <li>The public leaderboard shows a display name, portfolio value, and return. It does not show an email address.</li>
      </ul>
      <p className="mt-8">PaperStreet does not sell this data and does not run advertising.</p>
      <p className="mt-8">
        <Link href="/terms" className="text-[#e7c98a] underline-offset-4 hover:underline">Terms</Link>
        {" · "}
        <Link href="/" className="text-[#e7c98a] underline-offset-4 hover:underline">Home</Link>
      </p>
    </main>
  );
}
