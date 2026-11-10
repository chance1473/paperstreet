"use client";

import { useReportPageError } from "@/components/errors/use-report-page-error";

export default function PlatformError({ error, retry }: { error: Error; retry: () => void }) {
  useReportPageError(error);

  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page could not be loaded.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-5 rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950"
      >
        Try again
      </button>
    </div>
  );
}
