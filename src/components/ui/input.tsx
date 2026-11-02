import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60",
        className,
      )}
      {...props}
    />
  );
}
