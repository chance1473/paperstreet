// Server-side fixed-window limiter. State lives in memory, so each server
// process counts on its own; that is enough to refuse a burst from one client.

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED = 5000;

export type Limit = { name: string; max: number; windowMs: number };

export const LIMITS = {
  signIn: { name: "sign-in", max: 8, windowMs: 60_000 },
  confirmation: { name: "email-confirm", max: 8, windowMs: 60_000 },
  signUp: { name: "sign-up", max: 5, windowMs: 10 * 60_000 },
  order: { name: "order", max: 30, windowMs: 60_000 },
  reset: { name: "account-reset", max: 3, windowMs: 10 * 60_000 },
  password: { name: "password-change", max: 5, windowMs: 10 * 60_000 },
  marketData: { name: "market-data", max: 120, windowMs: 60_000 },
} as const satisfies Record<string, Limit>;

function sweep(now: number) {
  if (windows.size < MAX_TRACKED) return;
  for (const [key, value] of windows) {
    if (value.resetAt <= now) windows.delete(key);
  }
  // Still full of live windows: drop the oldest so memory stays bounded.
  while (windows.size >= MAX_TRACKED) {
    const first = windows.keys().next().value;
    if (first === undefined) break;
    windows.delete(first);
  }
}

/** Returns true when this call is over the limit for `subject` and should be refused. */
export function overLimit(limit: Limit, subject: string, now = Date.now()): boolean {
  const key = `${limit.name}:${subject}`;
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    sweep(now);
    windows.set(key, { count: 1, resetAt: now + limit.windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit.max;
}

export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "local";
}

export function resetLimits() {
  windows.clear();
}
