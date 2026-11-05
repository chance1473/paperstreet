import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const SECRET = /(password|token|secret|api[_-]?key|authorization)\s*[:=]\s*\S+/gi;

export function redact(value: string) {
  return value.replace(SECRET, "$1=[redacted]");
}

export function recordJourneyError(source: "sign-in" | "order" | "page", error: unknown) {
  const message = redact(error instanceof Error ? error.message : String(error));
  const line = JSON.stringify({
    at: new Date().toISOString(),
    source,
    message,
  });
  const file = process.env.JOURNEY_ERROR_LOG || path.join(process.cwd(), "logs", "journey-errors.log");
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${line}\n`, "utf8");
}
