export function MarketDataWarning({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
      {message}
    </p>
  );
}
