"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist";
import type { AssetType } from "@/lib/money";

export function WatchlistButton({
  symbol,
  assetType,
  watched,
}: {
  symbol: string;
  assetType: AssetType;
  watched: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const action = watched ? removeFromWatchlist : addToWatchlist;
      const result = await action({ symbol, assetType });
      if (!result.ok) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={toggle}>
      <Star className={`h-4 w-4 ${watched ? "fill-amber-300 text-amber-300" : ""}`} />
      {watched ? "Watching" : "Add to watchlist"}
    </Button>
  );
}
