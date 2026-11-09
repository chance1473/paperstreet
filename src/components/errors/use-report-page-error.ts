"use client";

import { useEffect, useRef } from "react";

export function useReportPageError(error: unknown) {
  const lastReported = useRef<{ error: unknown } | null>(null);

  useEffect(() => {
    if (lastReported.current && Object.is(lastReported.current.error, error)) return;
    lastReported.current = { error };

    void fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "page", message: "Page render failed" }),
    }).catch(() => {
      // Reporting is best-effort. Keep the recovery screen usable if it fails.
    });
  }, [error]);
}
