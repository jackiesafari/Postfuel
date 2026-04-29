import { NextResponse } from "next/server";
import { z } from "zod";

import { AGENT_VERSION } from "@/lib/config";
import { createDraftRecord, generateSummary } from "@/lib/agents";
import { saveDraft } from "@/lib/draft-store";
import { AgentResult } from "@/lib/types";

const schema = z.object({
  topic: z.string().min(3),
  sourceNotes: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  pdfUrl: z.string().optional(),
  depth: z.enum(["executive", "standard", "deep-imrad"]).optional(),
  researchMode: z.enum(["web-suggested", "user-only"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return new NextResponse(parsed.error.issues[0]?.message || "Invalid request", {
        status: 400,
      });
    }

    const payload = parsed.data;

    let result: AgentResult;

    const pdfSource = payload.pdfUrl || payload.sourceUrl || "";

    const isPdfSource =
      pdfSource.toLowerCase().includes("arxiv.org/pdf") ||
      pdfSource.toLowerCase().endsWith(".pdf");

    if (pdfSource && isPdfSource) {
      console.log("PDF detected:", pdfSource);

      const pdfRes = await fetch(pdfSource);

      if (!pdfRes.ok) {
        throw new Error(`Failed to download PDF: ${pdfRes.status}`);
      }

      const pdfBlob = await pdfRes.blob();

      const formData = new FormData();
      formData.append("file", pdfBlob, "source.pdf");

      const pythonRes = await fetch(process.env.PYTHON_SUMMARY_SERVICE_URL, {
        method: "POST",
        body: formData,
      });

      const pythonData = await pythonRes.json();

      console.log("Python response:", pythonData);

      if (!pythonRes.ok) {
        throw new Error(pythonData.detail || "Python PDF service failed");
      }

      result = {
        outputMarkdown: pythonData.summary || "",
        evidence: [],
        warnings: [],
        agentVersion: AGENT_VERSION,
        sources: [],
      };
    } else {
      result = await generateSummary({
        ...payload,
        sourceUrl: payload.sourceUrl || undefined,
      });
    }

    console.log("Final result before draft:", result);

    const draft = createDraftRecord({
      format: "summary",
      topic: payload.topic,
      sourceNotes: payload.sourceNotes,
      sourceUrl: payload.sourceUrl || undefined,
      pdfUrl: payload.pdfUrl,
      result,
    });

    await saveDraft(draft);

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Summary route failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown summary error",
      },
      { status: 500 }
    );
  }
}
