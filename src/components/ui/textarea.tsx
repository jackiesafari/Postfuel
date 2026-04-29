import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[150px] w-full rounded-[24px] border border-white/10 bg-[#120f0d] px-4 py-3 text-sm text-white placeholder:text-[#7a6f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9b53]",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

