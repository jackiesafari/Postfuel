import { notFound } from "next/navigation";
import Link from "next/link";

import { ReviewClient } from "@/components/review-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDraftById } from "@/lib/draft-store";

export const dynamic = "force-dynamic";

export default async function DraftPage({
  params,
}: {
  params: { id: string };
}) {
  const draft = await getDraftById(params.id);

  if (!draft) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#090909] px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="mb-3">Draft Review</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">Evidence-backed review surface</h1>
          </div>
          <Link href="/">
            <Button variant="secondary">Back to studio</Button>
          </Link>
        </div>
        <ReviewClient draft={draft} />
      </div>
    </main>
  );
}

