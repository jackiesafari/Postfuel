import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/10 bg-[#120f0d] px-4 text-sm text-white placeholder:text-[#7a6f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9b53]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

