/** 1 share or 1 coin = 100,000,000 quantity units. */
export const QTY_SCALE = 100_000_000n;
/** 1 dollar = 1,000,000 price micros. */
export const PRICE_SCALE = 1_000_000n;
/** quantity_units * price_micros / VALUE_DIVISOR = cents. */
export const VALUE_DIVISOR = 1_000_000_000_000n;
export const STARTING_CASH_CENTS = 10_000_000n;
const HALF = 500_000_000_000n;

export type AssetType = "stock" | "crypto";

export function asBigInt(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("Unsafe integer");
    }
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value)) {
    throw new Error("Invalid integer");
  }
  return BigInt(value);
}

export function numberToMicros(value: number): bigint {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid price");
  }
  const [whole, frac = ""] = value.toFixed(6).split(".");
  return BigInt(whole) * PRICE_SCALE + BigInt(frac);
}

export function decimalToCents(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  if (trimmed.length > 16) return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (whole.length > 12) return null;
  const cents = BigInt(whole) * 100n + BigInt((frac + "00").slice(0, 2));
  return cents > 0n ? cents : null;
}

export function decimalToQtyUnits(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) return null;
  if (trimmed.length > 24) return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (whole.length > 12) return null;
  const units =
    BigInt(whole) * QTY_SCALE + BigInt((frac + "00000000").slice(0, 8));
  if (units <= 0n || units > 1_000_000_000_000_000n) return null;
  return units;
}

/** Round half up to the nearest cent. */
export function valueCents(quantityUnits: bigint, priceMicros: bigint): bigint {
  if (quantityUnits <= 0n || priceMicros <= 0n) return 0n;
  return (quantityUnits * priceMicros + HALF) / VALUE_DIVISOR;
}

/** Largest quantity whose rounded cent value does not exceed the budget. */
export function maxQtyForBudget(budgetCents: bigint, priceMicros: bigint): bigint {
  if (budgetCents <= 0n || priceMicros <= 0n) return 0n;
  const numerator = budgetCents * VALUE_DIVISOR - HALF;
  if (numerator <= 0n) return 0n;
  const qty = numerator / priceMicros;
  if (qty <= 0n) return 0n;
  if (valueCents(qty, priceMicros) > budgetCents) return 0n;
  return qty;
}

export function weightedAveragePrice(
  oldQty: bigint,
  oldAvg: bigint,
  buyQty: bigint,
  buyPrice: bigint,
): bigint {
  const total = oldQty + buyQty;
  if (total <= 0n) return buyPrice;
  const avg = (oldQty * oldAvg + buyQty * buyPrice) / total;
  return avg > 0n ? avg : 1n;
}

export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const dollars = abs / 100n;
  const rem = (abs % 100n).toString().padStart(2, "0");
  const body = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${body}.${rem}`;
}

export function formatSignedCents(cents: bigint): string {
  if (cents > 0n) return `+${formatCents(cents)}`;
  return formatCents(cents);
}

export function formatPriceMicros(micros: bigint): string {
  const negative = micros < 0n;
  const abs = negative ? -micros : micros;
  const whole = abs / PRICE_SCALE;
  const frac6 = (abs % PRICE_SCALE).toString().padStart(6, "0");
  let digits = 2;
  if (whole < 1n) digits = 6;
  else if (whole < 1000n) digits = 2;
  let frac = frac6.slice(0, digits);
  if (digits > 2) {
    frac = frac.replace(/0+$/, "");
    if (frac.length < 2) frac = frac.padEnd(2, "0");
  }
  const body = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${body}.${frac}`;
}

export function formatQuantity(units: bigint, assetType: AssetType): string {
  const whole = units / QTY_SCALE;
  const frac = (units % QTY_SCALE).toString().padStart(8, "0");
  const maxFrac = assetType === "crypto" ? 8 : 6;
  const trimmed = frac.slice(0, maxFrac).replace(/0+$/, "");
  const body = trimmed.length ? `${whole.toString()}.${trimmed}` : whole.toString();
  return body;
}

export function formatPercent(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  if (rounded === 0) return `${(0).toFixed(digits)}%`;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(digits)}%`;
}

export function percentFromCents(change: bigint, basis: bigint): number | null {
  if (basis === 0n) return null;
  if (
    change > BigInt(Number.MAX_SAFE_INTEGER) ||
    basis > BigInt(Number.MAX_SAFE_INTEGER) ||
    change < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return Number((change * 10000n) / basis) / 100;
  }
  return (Number(change) / Number(basis)) * 100;
}

export function toneClass(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "text-muted-foreground";
  }
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return "text-muted-foreground";
  return rounded > 0 ? "text-emerald-400" : "text-rose-400";
}

export function centsTone(value: bigint): string {
  if (value === 0n) return "text-muted-foreground";
  return value > 0n ? "text-emerald-400" : "text-rose-400";
}
