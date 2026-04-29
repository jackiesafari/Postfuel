import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Draft } from "@/lib/types";

export function RecentDrafts({ drafts }: { drafts: Draft[] }) {
  if (!drafts.length) {
    return (
      <Card className="border-dashed bg-white/[0.03]">
        <CardHeader>
          <CardTitle>Nothing drafted yet</CardTitle>
          <CardDescription>
            Your latest runs will appear here so you can jump back into review.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {drafts.slice(0, 4).map((draft) => (
        <Link key={draft.id} href={`/drafts/${draft.id}`}>
          <Card className="h-full transition hover:-translate-y-1 hover:border-[#ff9b53]/30">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <Badge>{draft.format}</Badge>
                <Badge className="bg-[#ff9b53]/10 text-[#ffb882]">{draft.status}</Badge>
              </div>
              <CardTitle className="text-lg">{draft.topic}</CardTitle>
              <CardDescription>{
              draft.warnings?.[0] || "Ready for editorial review."}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[#b8ada5]">
              {draft.evidence?.length ?? 0} evidence item{(draft.evidence?.length ?? 0) === 1 ? "" : "s"}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

