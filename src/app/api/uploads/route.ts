import { NextResponse } from "next/server";

import { storeUpload } from "@/lib/uploads";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return new NextResponse("No file provided", { status: 400 });
  }

  const result = await storeUpload(file);
  return NextResponse.json({ pdfUrl: result.url, fileName: result.fileName });
}

