import { describe, expect, it } from "vitest";

import {
  generateBlogDraft,
  generateCodeWalkthrough,
  generateSocialDraft,
  generateSummary,
} from "@/lib/agents";

describe("agent generators", () => {
  it("creates a blog draft with evidence", async () => {
    const result = await generateBlogDraft({
      topic: "Why evidence matters in AI content ops",
      sourceNotes: "Teams need a review state before publishing.\nEvidence should be tied to claims.",
    });

    expect(result.outputMarkdown).toContain("# Why evidence matters");
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("creates a code walkthrough from a snippet", async () => {
    const result = await generateCodeWalkthrough({
      topic: "Annotate a reducer",
      codeSnippet: "export function reducer(state, action) {\n  return state\n}",
    });

    expect(result.outputMarkdown).toContain("## Block-by-block");
  });

  it("creates social variants", async () => {
    const result = await generateSocialDraft({
      topic: "How we review AI drafts",
      sourceNotes: "Evidence chips make it easier to verify claims before sharing.",
    });

    expect(result.outputJson).toBeTruthy();
  });

  it("creates an executive summary", async () => {
    const result = await generateSummary({
      topic: "A paper about map reduce summarization",
      sourceNotes:
        "The paper explores chunking and synthesis for long documents. It compares iterative map-reduce against direct summarization.",
      depth: "executive",
    });

    expect(result.outputMarkdown).toContain("-");
  });
});

