"use client";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;

export type ChartRange = (typeof RANGES)[number];

export function ChartRangePicker({
  range,
  onChange,
}: {
  range: ChartRange;
  onChange: (range: ChartRange) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1">
      {RANGES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            item === range ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
