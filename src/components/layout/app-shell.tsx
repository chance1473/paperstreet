"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Briefcase,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Settings,
  Star,
  Timer,
  Trophy,
} from "lucide-react";
import { useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { signOut } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

const TRADE = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/simulated", label: "Practice", icon: Timer },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
];

const ACCOUNT = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  displayName,
  avatarUrl,
}: {
  children: React.ReactNode;
  displayName: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/8 bg-[#0b0d11] md:flex">
        <div className="px-4 py-4">
          <Wordmark href="/dashboard" compact />
        </div>
        <Nav pathname={pathname} />
        <Account displayName={displayName} avatarUrl={avatarUrl} />
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/8 bg-[#07080b]/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
            <Wordmark href="/dashboard" compact />
          </div>
          <p className="ml-auto rounded-full border border-[#e7c98a]/30 bg-[#e7c98a]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#e7c98a]">
            Paper trading only — no real money
          </p>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="left-0 top-0 h-full w-72 max-w-none translate-x-0 translate-y-0 rounded-none bg-[#0b0d11]">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="mb-4">
            <Wordmark href="/dashboard" compact />
          </div>
          <div onClick={() => setOpen(false)}>
            <Nav pathname={pathname} />
          </div>
          <Account displayName={displayName} avatarUrl={avatarUrl} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Nav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 px-3">
      <NavGroup label="Trade" links={TRADE} pathname={pathname} />
      <NavGroup label="Account" links={ACCOUNT} pathname={pathname} />
    </nav>
  );
}

function NavGroup({
  label,
  links,
  pathname,
}: {
  label: string;
  links: { href: string; label: string; icon: typeof LayoutDashboard }[];
  pathname: string;
}) {
  return (
    <div>
      <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-white/8 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Account({ displayName, avatarUrl }: { displayName: string; avatarUrl?: string | null }) {
  const initial = displayName.slice(0, 1).toUpperCase();
  return (
    <div className="border-t border-white/8 p-3">
      <div className="flex items-center gap-2 px-2 py-1">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile picture" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-xs font-medium">
            {initial}
          </span>
        )}
        <span className="truncate text-sm">{displayName}</span>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm" className="mt-1 w-full justify-start">
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </form>
    </div>
  );
}
