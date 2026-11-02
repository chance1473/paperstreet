"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useQuote } from "@/components/market/live-quotes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeOrder } from "@/lib/actions/trade";
import {
  asBigInt,
  decimalToCents,
  decimalToQtyUnits,
  formatCents,
  formatPriceMicros,
  formatQuantity,
  maxQtyForBudget,
  valueCents,
  type AssetType,
} from "@/lib/money";

export function OrderTicket({
  symbol,
  assetType,
  assetName,
  cashCents,
  ownedUnits,
}: {
  symbol: string;
  assetType: AssetType;
  assetName: string;
  cashCents: string;
  ownedUnits: string;
}) {
  const router = useRouter();
  const quote = useQuote(assetType, symbol);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [mode, setMode] = useState<"quantity" | "notional">("quantity");
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const price = quote?.priceMicros ? asBigInt(quote.priceMicros) : null;
  const cash = asBigInt(cashCents);
  const owned = asBigInt(ownedUnits);

  const estimate = useMemo(() => {
    if (!price) return null;
    if (mode === "quantity") {
      const qty = decimalToQtyUnits(amount);
      if (!qty) return null;
      return { quantity: qty, total: valueCents(qty, price) };
    }
    const notional = decimalToCents(amount);
    if (!notional) return null;
    const quantity = maxQtyForBudget(notional, price);
    if (quantity <= 0n) return null;
    return { quantity, total: valueCents(quantity, price) };
  }, [amount, mode, price]);

  const blocked = !estimate
    ? null
    : side === "buy" && estimate.total > cash
      ? "You do not have enough cash for this order."
      : side === "sell" &&
          (estimate.quantity > owned || (mode === "notional" && estimate.total > valueCents(owned, price ?? 0n)))
        ? "You do not own enough of this asset to sell."
        : null;

  function confirm() {
    startTransition(async () => {
      const result = await placeOrder({ symbol, assetType, side, mode, amount });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      setAmount("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Market order</div>
        <div className="mt-1 font-mono text-2xl">
          {price ? formatPriceMicros(price) : "Price unavailable"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={side === "buy" ? "default" : "outline"} onClick={() => setSide("buy")}>
          Buy
        </Button>
        <Button type="button" variant={side === "sell" ? "danger" : "outline"} onClick={() => setSide("sell")}>
          Sell
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="sm" variant={mode === "quantity" ? "secondary" : "ghost"} onClick={() => setMode("quantity")}>
          {assetType === "crypto" ? "Coins" : "Shares"}
        </Button>
        <Button type="button" size="sm" variant={mode === "notional" ? "secondary" : "ghost"} onClick={() => setMode("notional")}>
          Dollars
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-amount">{mode === "quantity" ? "Quantity" : "Amount"}</Label>
        <Input
          id="order-amount"
          inputMode="decimal"
          value={amount}
          placeholder={mode === "quantity" ? "0.00" : "0.00"}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>

      <dl className="space-y-2 text-sm">
        <Row label="Estimated quantity" value={estimate ? formatQuantity(estimate.quantity, assetType) : "—"} />
        <Row label="Estimated total" value={estimate ? formatCents(estimate.total) : "—"} />
        <Row label={side === "buy" ? "Available cash" : "Quantity owned"} value={side === "buy" ? formatCents(cash) : formatQuantity(owned, assetType)} />
      </dl>

      {blocked ? <p className="text-sm text-rose-300">{blocked}</p> : null}
      <Button type="button" className="w-full" disabled={!price || !estimate || Boolean(blocked)} onClick={() => setOpen(true)}>
        Review {side}
      </Button>
      <p className="text-xs text-muted-foreground">
        The fill uses the latest server price for {assetName}. Browser prices are estimates only.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {side} {symbol}
            </DialogTitle>
            <DialogDescription>
              Paper trading only — no real money. This market order executes at the latest server price when you confirm.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Side" value={side.toUpperCase()} />
            <Row label="Estimated quantity" value={estimate ? formatQuantity(estimate.quantity, assetType) : "—"} />
            <Row label="Estimated total" value={estimate ? formatCents(estimate.total) : "—"} />
          </dl>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant={side === "sell" ? "danger" : "default"} disabled={pending} onClick={confirm}>
              {pending ? "Submitting…" : `Confirm ${side}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
