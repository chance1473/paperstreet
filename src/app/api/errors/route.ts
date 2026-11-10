import { recordJourneyError } from "@/lib/errors";
import { overLimit } from "@/lib/rate-limit";

const browserReports = { name: "browser-error", max: 20, windowMs: 60_000 };

export function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return Response.json({ ok: false }, { status: 403 });
  }

  // The anonymous route records one fixed message. A shared quota also applies
  // to callers that spoof their address or omit browser headers.
  if (overLimit(browserReports, "all")) {
    return Response.json({ ok: false }, { status: 429 });
  }
  recordJourneyError("page", new Error("Page render failed"));
  return Response.json({ ok: true });
}
