import { NextResponse } from "next/server";

import { readLocalUpload } from "@/lib/uploads";

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const file = await readLocalUpload(params.filename);
    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${params.filename}"`,
      },
    });
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }
}

