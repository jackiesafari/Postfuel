import { PostFuelBrand } from "@/components/postfuel-brand";
import { RecentDrafts } from "@/components/recent-drafts";
import { StudioForm } from "@/components/studio-form";
import { listDrafts } from "@/lib/draft-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const drafts = await listDrafts();

  return (
    <main className="min-h-screen bg-[#090909] px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <PostFuelBrand className="max-w-full" />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {["Blog", "Code", "Summary", "Social"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-[#b89f91] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-200 hover:border-[#d08c57]/50 hover:text-[#f4c59c]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <StudioForm />

        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">Recent drafts</p>
            <h2 className="mt-2 text-2xl font-semibold">Continue reviewing</h2>
          </div>
          <RecentDrafts drafts={drafts} />
        </section>
      </div>
    </main>
  );
}
