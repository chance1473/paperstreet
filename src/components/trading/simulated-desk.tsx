"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLOCK_SPEEDS, advanceClock, type StoredBar } from "@/lib/simulated/clock";
import { replayResult } from "@/lib/simulated/replay";
import { formatCents, formatSignedCents } from "@/lib/money";

export function SimulatedDesk({
  bars,
  simulatedCents,
  liveCents,
}: {
  bars: StoredBar[];
  simulatedCents: string;
  liveCents: string;
}) {
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState<(typeof CLOCK_SPEEDS)[number]>(1);
  const current = bars[index] ?? null;
  const entry = bars[0]?.price ?? 0;
  const result = useMemo(
    () => replayResult(BigInt(simulatedCents), entry, current?.price ?? entry),
    [simulatedCents, entry, current?.price],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Simulated book</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Starting cash {formatCents(BigInt(simulatedCents))}</p>
          <p>Marked value {formatCents(result.valueCents)}</p>
          <p className={result.changeCents >= 0n ? "text-emerald-400" : "text-rose-400"}>
            {result.changeCents === 0n ? "Flat so far" : formatSignedCents(result.changeCents)}
          </p>
          <p className="text-muted-foreground">
            This replay spends the separate book only. The live paper balance stays {formatCents(BigInt(liveCents))}.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Faster clock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{current ? `Stored price $${current.price.toFixed(2)}` : "No stored bars are loaded yet."}</p>
          <div className="flex gap-2">
            {CLOCK_SPEEDS.map((choice) => (
              <Button
                key={choice}
                type="button"
                variant={choice === speed ? "default" : "outline"}
                size="sm"
                onClick={() => setSpeed(choice)}
              >
                {choice}x
              </Button>
            ))}
          </div>
          <Button
            type="button"
            disabled={bars.length < 2 || index >= bars.length - 1}
            onClick={() => setIndex(advanceClock(bars, index, speed).index)}
          >
            Step forward
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
