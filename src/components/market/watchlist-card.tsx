import { QuoteTable } from "@/components/market/quote-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssetType } from "@/lib/money";

export function WatchlistCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: { symbol: string; assetName: string; assetType: AssetType }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <QuoteTable
        rows={items.map(({ symbol, assetName, assetType }) => ({ symbol, name: assetName, assetType }))}
        empty={empty}
      />
    </Card>
  );
}
