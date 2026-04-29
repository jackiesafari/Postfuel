import { NextResponse } from "next/server";
import { z } from "zod";

import { createDraftRecord, generateCodeWalkthrough } from "@/lib/agents";
import { saveDraft } from "@/lib/draft-store";

const schema = z.object({
  topic: z.string().min(1),
  codeSnippet: z.string().min(1),
  sourceNotes: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  walkthroughStyle: z
    .enum(["inline-comments", "tutorial-post", "gitbook-style"])
    .optional(),
  researchMode: z.enum(["web-suggested", "user-only"]).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(parsed.error.issues[0]?.message || "Invalid request", {
      status: 400,
    });
  }

  const payload = parsed.data;
  const result = await generateCodeWalkthrough({
    ...payload,
    sourceUrl: payload.sourceUrl || undefined,
  });

  const draft = createDraftRecord({
    format: "code",
    topic: payload.topic,
    sourceNotes: payload.sourceNotes,
    sourceUrl: payload.sourceUrl || undefined,
    result,
  });

  await saveDraft(draft);
  return NextResponse.json(draft);
}
