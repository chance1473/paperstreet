export type StoredBar = {
  time: number;
  price: number;
};

export const CLOCK_SPEEDS = [1, 10, 60] as const;

export function barAt(bars: readonly StoredBar[], index: number): StoredBar | null {
  if (bars.length === 0) return null;
  const bounded = Math.min(Math.max(Math.trunc(index), 0), bars.length - 1);
  return bars[bounded] ?? null;
}

export function advanceClock(
  bars: readonly StoredBar[],
  index: number,
  speed: number,
): { index: number; bar: StoredBar | null } {
  if (bars.length === 0) return { index: 0, bar: null };
  const steps = CLOCK_SPEEDS.includes(speed as (typeof CLOCK_SPEEDS)[number]) ? speed : 1;
  const next = Math.min(Math.max(Math.trunc(index), 0) + steps, bars.length - 1);
  return { index: next, bar: bars[next] ?? null };
}
