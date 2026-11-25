const WINDOW_MS = 120_000;
const seen = new Map<string, { at: number; ok: boolean; message: string }>();

export function priorOrder(key: string, now = Date.now()) {
  const hit = seen.get(key);
  if (!hit) return null;
  if (now - hit.at > WINDOW_MS) {
    seen.delete(key);
    return null;
  }
  return { ok: hit.ok, message: hit.message };
}

export function rememberOrder(key: string, result: { ok: boolean; message: string }, now = Date.now()) {
  seen.set(key, { at: now, ok: result.ok, message: result.message });
}
