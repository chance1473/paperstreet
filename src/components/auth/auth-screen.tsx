import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export function AuthScreen({
  title,
  children,
  footnote,
}: {
  title: string;
  children: React.ReactNode;
  footnote: string;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between border-r border-white/8 px-12 py-10 lg:flex">
        <Wordmark />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e7c98a]">
            Paper trading only — no real money
          </p>
          <h1 className="mt-4 max-w-md text-4xl font-semibold tracking-tight">
            A private book. Live prices. Simulated cash.
          </h1>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          New accounts open at $100,000. Orders stay inside PaperStreet.
        </p>
      </section>
      <section className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mb-8 lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <div className="mt-6">{children}</div>
          <p className="mt-8 text-xs text-muted-foreground">{footnote}</p>
          <Link href="/" className="mt-4 inline-block text-xs text-muted-foreground hover:text-foreground">
            Back to PaperStreet
          </Link>
        </div>
      </section>
    </main>
  );
}
