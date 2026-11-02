const STARTING_CASH_CENTS = 10_000_000n;

export function liveBookRank(cashCents: bigint, investedCents: bigint) {
  const valueCents = cashCents + investedCents;
  return {
    investedCents,
    profitCents: valueCents - STARTING_CASH_CENTS,
    valueCents,
  };
}
