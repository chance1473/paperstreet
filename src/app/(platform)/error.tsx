"use client";

export default function PlatformError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page could not be loaded. Your paper account was not changed.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950"
      >
        Try again
      </button>
    </div>
  );
}
