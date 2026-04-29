import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-2xl border border-white/10 bg-[#120f0d] px-4 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9b53]",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

