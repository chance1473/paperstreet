"use client";

import { useReportPageError } from "@/components/errors/use-report-page-error";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useReportPageError(error);

  return (
    <html lang="en">
      <body>
        <p>This page could not be loaded.</p>
        <button type="button" onClick={retry}>
          Try again
        </button>
      </body>
    </html>
  );
}
