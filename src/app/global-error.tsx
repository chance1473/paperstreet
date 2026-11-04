"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void fetch("/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: "page", message: error.message }),
  });

  return (
    <html lang="en">
      <body>
        <p>This page hit an error. The details were saved for the owner.</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
