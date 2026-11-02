export function replayResult(
  startCents: bigint,
  entryPrice: number,
  currentPrice: number,
): { valueCents: bigint; changeCents: bigint } {
  const entry = Math.round(entryPrice * 1_000_000);
  const current = Math.round(currentPrice * 1_000_000);
  if (entry <= 0 || current <= 0) {
    return { valueCents: startCents, changeCents: 0n };
  }
  const valueCents = (startCents * BigInt(current)) / BigInt(entry);
  return { valueCents, changeCents: valueCents - startCents };
}
