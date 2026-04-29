import { NextResponse } from "next/server";

import { getDraftById, updateDraft } from "@/lib/draft-store";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const draft = await getDraftById(params.id);

  if (!draft) {
    return new NextResponse("Draft not found", { status: 404 });
  }

  return NextResponse.json(draft);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = (await request.json()) as Parameters<typeof updateDraft>[1];
  const updated = await updateDraft(params.id, body);

  if (!updated) {
    return new NextResponse("Draft not found", { status: 404 });
  }

  return NextResponse.json(updated);
}
