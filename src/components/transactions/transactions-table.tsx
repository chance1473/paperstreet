import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { asBigInt, formatCents, formatPriceMicros, formatQuantity } from "@/lib/money";
import { assetPath } from "@/lib/symbols";
import type { ClientTransaction } from "@/lib/types";

export function TransactionsTable({ rows }: { rows: ClientTransaction[] }) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-sm text-muted-foreground">No transactions match these filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-white/8">
            <th className="px-5 py-3 font-medium">Time</th>
            <th className="px-3 py-3 font-medium">Asset</th>
            <th className="px-3 py-3 font-medium">Side</th>
            <th className="px-3 py-3 text-right font-medium">Qty</th>
            <th className="px-3 py-3 text-right font-medium">Price</th>
            <th className="px-5 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5 last:border-0">
              <td className="px-5 py-3 text-muted-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(row.createdAt))}
              </td>
              <td className="px-3 py-3">
                <Link href={assetPath(row.assetType, row.symbol)} className="font-medium hover:text-emerald-300">
                  {row.symbol}
                </Link>
                <div className="text-xs text-muted-foreground">{row.assetName}</div>
              </td>
              <td className="px-3 py-3">
                <Badge className={row.side === "buy" ? "text-emerald-300" : "text-rose-300"}>
                  {row.side}
                </Badge>
              </td>
              <td className="px-3 py-3 text-right font-mono">
                {formatQuantity(asBigInt(row.quantityUnits), row.assetType)}
              </td>
              <td className="px-3 py-3 text-right font-mono">{formatPriceMicros(asBigInt(row.priceMicros))}</td>
              <td className="px-5 py-3 text-right font-mono">{formatCents(asBigInt(row.totalCents))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
