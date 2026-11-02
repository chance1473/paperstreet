import Link from "next/link";

import { cn } from "@/lib/utils";

export function Wordmark({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#e7c98a] text-[11px] font-semibold tracking-tight text-[#1a1408]">
        PS
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">PaperStreet</span>
        {compact ? null : (
          <span className="block text-[11px] text-muted-foreground">Paper brokerage</span>
        )}
      </span>
    </Link>
  );
}
