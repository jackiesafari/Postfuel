import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

interface PostFuelBrandProps {
  className?: string;
}

export function PostFuelBrand({ className }: PostFuelBrandProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-4 rounded-[30px] border border-[#4a362d]/45 bg-[linear-gradient(180deg,rgba(30,20,16,0.94),rgba(21,15,12,0.98))] px-6 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur",
        className
      )}
    >
      <div className="relative flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-[21px] bg-[radial-gradient(circle_at_30%_20%,#fff0cf_0%,#ffd09b_34%,#ee9f4f_74%,#bd6829_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_12px_24px_rgba(204,118,42,0.18)]">
        <div className="absolute inset-[6px] rounded-[17px] bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.74),rgba(255,255,255,0.09)_46%,rgba(0,0,0,0.14)_100%)]" />
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-[radial-gradient(circle_at_35%_30%,#fffaf0_0%,#fde7c5_58%,#eeb168_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
          <Flame className="h-6 w-6 fill-[#eea14f] text-[#5f2f12]" strokeWidth={2.3} />
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-[1.95rem] font-semibold leading-none tracking-[-0.03em] text-white">
          PostFuel
        </div>
        <div className="mt-2 text-[0.86rem] uppercase tracking-[0.36em] text-[#c5af66]">
          Multi-agent content studio for grounded, reviewable drafts
        </div>
      </div>
    </div>
  );
}
