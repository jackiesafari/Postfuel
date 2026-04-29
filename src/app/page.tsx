import { RecentDrafts } from "@/components/recent-drafts";
import { StudioForm } from "@/components/studio-form";
import { Badge } from "@/components/ui/badge";
import { listDrafts } from "@/lib/draft-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const drafts = await listDrafts();

  return (
    <main className="min-h-screen bg-[#090909] px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="mb-3">Multi-Agent Content Studio</Badge>
            <p className="max-w-xl text-sm leading-7 text-[#9a8b82]">
              Four specialized content agents, one evidence layer, and a review workflow built for
              editorial confidence.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#8f7c70]">
            <span>Blog</span>
            <span>Code</span>
            <span>Summary</span>
            <span>Social</span>
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

