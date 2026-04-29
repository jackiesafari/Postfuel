import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

interface PostFuelBrandProps {
  className?: string;
}

export function PostFuelBrand({ className }: PostFuelBrandProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-4 rounded-[30px] border border-white/8 bg-[#16110f]/95 px-7 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_26px_80px_rgba(0,0,0,0.34)] backdrop-blur",
        className
      )}
    >
      <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_30%_20%,#fff2d5_0%,#ffd19c_34%,#f6a453_72%,#c96f2a_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_16px_30px_rgba(214,123,44,0.28)]">
        <div className="absolute inset-[7px] rounded-[20px] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),rgba(255,255,255,0.08)_45%,rgba(0,0,0,0.18)_100%)]" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-[radial-gradient(circle_at_35%_30%,#fff9ee_0%,#ffe6c1_58%,#efae63_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <Flame className="h-7 w-7 fill-[#f3a254] text-[#5f2f12]" strokeWidth={2.3} />
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-[2rem] font-semibold leading-none tracking-[-0.03em] text-white">
          PostFuel
        </div>
        <div className="mt-2 text-[0.9rem] uppercase tracking-[0.42em] text-[#d0b564]">
          Multi-agent content studio for grounded, reviewable drafts
        </div>
      </div>
    </div>
  );
}
