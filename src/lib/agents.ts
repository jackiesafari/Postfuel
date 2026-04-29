import OpenAI from "openai";
import { v4 as uuid } from "uuid";

import { AGENT_VERSION, hasOpenAIConfig, hasPythonSummaryService } from "@/lib/config";
import { suggestWebSources, evidenceFromSource } from "@/lib/research";
import { MENTIONABLE_SOURCE_PROFILES } from "@/lib/source-profiles";
import { chunkText, extractArticleFromUrl } from "@/lib/summary";
import {
  AgentResult,
  BlogAgentRequest,
  CodeAgentRequest,
  DraftFormat,
  EvidenceItem,
  RankedSource,
  SocialAgentRequest,
  SummaryAgentRequest,
} from "@/lib/types";
import { clipText } from "@/lib/utils";

const openai = hasOpenAIConfig()
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function targetEvidenceCount(format: DraftFormat) {
  switch (format) {
    case "blog":
      return 3;
    case "code":
      return 2;
    case "summary":
      return 2;
    case "social":
      return 2;
    default:
      return 1;
  }
}

function targetSourceCount(format: DraftFormat) {
  switch (format) {
    case "blog":
      return 6;
    case "code":
      return 4;
    case "summary":
      return 4;
    case "social":
      return 5;
    default:
      return 3;
  }
}

function augmentSourcesFromDraftCopy(
  draftText: string,
  sources: RankedSource[],
  topic: string,
  format: DraftFormat
) {
  if (!draftText.trim()) {
    return sources;
  }

  const normalized = draftText.toLowerCase();
  const citedSources = MENTIONABLE_SOURCE_PROFILES.filter((profile) =>
    profile.aliases.some((alias) => normalized.includes(alias))
  ).map((profile) => ({
    id: uuid(),
    name: profile.name,
    url: profile.url,
    searchQuery: topic,
    sourceType: "web" as const,
    sourceCategory: profile.sourceCategory,
    domain: profile.domain,
    authorityScore: profile.authorityScore,
    relevanceScore: 9,
    specificityScore: 10,
    freshnessScore: profile.freshnessScore,
    formatFitScore: profile.formatFitScore + (format === "blog" ? 1 : 0),
    finalScore: Number(
      (
        profile.authorityScore * 0.35 +
        9 * 0.3 +
        10 * 0.15 +
        profile.freshnessScore * 0.1 +
        (profile.formatFitScore + (format === "blog" ? 1 : 0)) * 0.1
      ).toFixed(2)
    ),
    whySelected: `Explicitly cited in the draft copy. ${profile.whySelected}`,
    supports: profile.supports,
    excerpt: profile.excerpt,
  }));

  const merged = [...citedSources, ...sources];
  const deduped = merged.filter(
    (source, index, array) =>
      array.findIndex((item) => item.name.toLowerCase() === source.name.toLowerCase()) === index
  );

  return deduped
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, targetSourceCount(format));
}

function sourceAwareEvidence(
  format: DraftFormat,
  topic: string,
  sourceNotes?: string,
  sourceUrl?: string,
  pdfUrl?: string
) {
  const evidence: EvidenceItem[] = [];
  const count = targetEvidenceCount(format);

  if (sourceNotes?.trim()) {
    const lines = sourceNotes
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, count);

    lines.forEach((line, index) => {
      evidence.push(
        evidenceFromSource(
          `${topic}: supporting note ${index + 1}`,
          "Source notes",
          `note:${index + 1}`,
          line,
          "note",
          0.74
        )
      );
    });
  }

  if (sourceUrl) {
    evidence.push(
      evidenceFromSource(
        `${topic}: source URL provided`,
        sourceUrl,
        sourceUrl,
        "User supplied this URL as a primary source.",
        "url",
        0.8
      )
    );
  }

  if (pdfUrl) {
    evidence.push(
      evidenceFromSource(
        `${topic}: uploaded PDF referenced`,
        "Uploaded PDF",
        pdfUrl,
        "This draft references the uploaded PDF and should be reviewed against the original document.",
        "pdf",
        0.82
      )
    );
  }

  return evidence.slice(0, count);
}

async function appendSuggestedEvidence(
  baseEvidence: EvidenceItem[],
  format: DraftFormat,
  topic: string,
  sourceNotes?: string,
  draftText?: string
) {
  const suggestions = augmentSourcesFromDraftCopy(
    draftText || "",
    await suggestWebSources(topic, targetSourceCount(format)),
    topic,
    format
  );
  if (baseEvidence.length >= targetEvidenceCount(format)) {
    return { evidence: baseEvidence, sources: suggestions };
  }

  const extras = suggestions.map((item) =>
    evidenceFromSource(
      `${topic}: suggested source`,
      item.name,
      item.url,
      item.excerpt || sourceNotes || topic,
      item.sourceType,
      0.58
    )
  );

  return {
    evidence: [...baseEvidence, ...extras].slice(0, targetEvidenceCount(format)),
    sources: suggestions,
  };
}

async function runJsonPrompt<T>(system: string, user: string, fallback: T) {
  if (!openai) {
    return fallback;
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return fallback;
    }

    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function generateBlogDraft(request: BlogAgentRequest): Promise<AgentResult> {
  const fallbackMarkdown = `# ${request.topic}

${request.sourceNotes?.trim() || "A strong opening hook should quickly explain why this topic matters now."}

## Why this matters
Frame the problem, the moment, and the audience who should care about it.

## What is really happening
Pull together the clearest facts, patterns, or examples from the supplied notes and sources.

## Where teams get stuck
Show the common misunderstandings, tradeoffs, or operational risks.

## What to do next
Offer practical next steps, examples, or decision criteria.

## Conclusion
Close with a concise takeaway editors can reuse for distribution.`;

  const fallback = {
    outputMarkdown: fallbackMarkdown,
  };

  const ai = await runJsonPrompt<{ outputMarkdown: string }>(
    "You are a blog drafting agent. Return valid JSON with one key: outputMarkdown. The markdown must have a headline, a hook paragraph, 3 to 4 H2 sections, and a conclusion. Keep it editorial and source-aware.",
    JSON.stringify(request),
    fallback
  );

  const suggested = await appendSuggestedEvidence(
    sourceAwareEvidence(
      "blog",
      request.topic,
      request.sourceNotes,
      request.sourceUrl,
      request.pdfUrl
    ),
    "blog",
    request.topic,
    request.sourceNotes,
    ai.outputMarkdown || fallbackMarkdown
  );

  return {
    outputMarkdown: ai.outputMarkdown || fallbackMarkdown,
    evidence: suggested.evidence,
    sources: suggested.sources,
    warnings:
      suggested.evidence.length < 2
        ? ["Blog evidence is light. Add notes or a source URL for stronger verification."]
        : [],
    agentVersion: AGENT_VERSION,
  };
}

export async function generateCodeWalkthrough(
  request: CodeAgentRequest
): Promise<AgentResult> {
  const codeLines = request.codeSnippet
    .split("\n")
    .filter(Boolean)
    .slice(0, 18);

  const annotated = codeLines
    .map(
      (line, index) =>
        `### Block ${index + 1}\n\n\`\`\`\n${line}\n\`\`\`\n\nThis line is doing the core work for the walkthrough and should be explained in plain language.`
    )
    .join("\n\n");

  const fallbackMarkdown = `# ${request.topic || "Code walkthrough"}

This walkthrough explains the intent of the snippet before diving into the mechanics.

## Overview
${request.sourceNotes?.trim() || "Focus on what the code is trying to accomplish and where it fits into the system."}

## Block-by-block
${annotated}

## Key concepts
- Data flow
- Control flow
- Edge cases

## Try it
Extend the snippet with a small feature or test to reinforce the lesson.`;

  const ai = await runJsonPrompt<{ outputMarkdown: string }>(
    "You are a code walkthrough agent. Return valid JSON with outputMarkdown. Use a GitBook-like explanation style with an overview, block-by-block annotations, key concepts, and a Try it section.",
    JSON.stringify(request),
    { outputMarkdown: fallbackMarkdown }
  );

  const suggested = await appendSuggestedEvidence(
    sourceAwareEvidence(
      "code",
      request.topic || "Code walkthrough",
      request.sourceNotes || request.codeSnippet,
      request.sourceUrl
    ),
    "code",
    request.topic || "Code walkthrough",
    request.sourceNotes || request.codeSnippet,
    ai.outputMarkdown || fallbackMarkdown
  );

  return {
    outputMarkdown: ai.outputMarkdown || fallbackMarkdown,
    evidence: suggested.evidence,
    sources: suggested.sources,
    warnings:
      request.codeSnippet.trim().length < 20
        ? ["The snippet is short, so the walkthrough may feel generic."]
        : [],
    agentVersion: AGENT_VERSION,
  };
}

function buildFallbackSummary(
  topic: string,
  depth: SummaryAgentRequest["depth"],
  sourceText: string
) {
  const clean = clipText(sourceText || topic, 1800);
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const bullets = sentences.slice(0, 3).map((sentence) => `- ${clipText(sentence, 180)}`);

  if (depth === "executive") {
    return bullets.join("\n");
  }

  if (depth === "deep-imrad") {
    return `# ${topic}

## Introduction
${sentences[0] || "This paper or article sets up the central question and why it matters."}

## Methods
${sentences[1] || "The source describes its approach, dataset, or process."}

## Results
${sentences[2] || "Key findings are summarized here for editorial review."}

## Discussion
${sentences[3] || "Interpret the significance, caveats, and next questions."}`;
  }

  return `${sentences.slice(0, 4).join(" ")}`.trim();
}

async function summarizeWithPythonService(request: {
  topic: string;
  sourceUrl?: string;
  pdfUrl?: string; // This is a URL to the file in Vercel Blob or Supabase
  sourceNotes?: string;
  depth?: string;
}) {
  if (!hasPythonSummaryService()) {
    return null;
  }

  try {
    const serviceUrl = process.env.PYTHON_SUMMARY_SERVICE_URL!;
    
    // IF WE HAVE A PDF: We need to send it as 'multipart/form-data'
    if (request.pdfUrl) {
      const fileResponse = await fetch(request.pdfUrl);
      const blob = await fileResponse.blob();

      const formData = new FormData();
      formData.append("file", blob, "document.pdf");

      const response = await fetch(`${serviceUrl}/summarize`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) return null;
      const data = await response.json();
      return { outputMarkdown: data.summary };
    }

    // IF NO PDF: Fallback to the JSON request for text/URLs
    const response = await fetch(`${serviceUrl}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) return null;
    return (await response.json()) as { outputMarkdown?: string };
  } catch (error) {
    console.error("Agent logic failed to reach Python service:", error);
    return null;
  }
}

export async function generateSummary(request: SummaryAgentRequest): Promise<AgentResult> {
  let sourceText = request.sourceNotes?.trim() || "";
  const warnings: string[] = [];

  if (request.sourceUrl) {
    try {
      const article = await extractArticleFromUrl(request.sourceUrl);
      sourceText = [article.title, article.byline, article.excerpt, article.content]
        .filter(Boolean)
        .join("\n\n");
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? error.message
          : "Could not fetch the URL, so the summary relied on the text you provided."
      );
    }
  }

  if (request.pdfUrl && !request.sourceUrl) {
    warnings.push(
      hasPythonSummaryService()
        ? "PDF summary will be delegated to the Python service."
        : "Set PYTHON_SUMMARY_SERVICE_URL to enable the full PDF summarization pipeline."
    );
  }

  const pythonResult = await summarizeWithPythonService({
    topic: request.topic,
    sourceUrl: request.sourceUrl,
    pdfUrl: request.pdfUrl,
    sourceNotes: request.sourceNotes,
    depth: request.depth,
  });

  const fallbackMarkdown = buildFallbackSummary(
    request.topic,
    request.depth,
    sourceText || request.topic
  );

  const ai = pythonResult?.outputMarkdown
    ? { outputMarkdown: pythonResult.outputMarkdown }
    : await runJsonPrompt<{ outputMarkdown: string }>(
        "You are a summarization agent. Return JSON with outputMarkdown only. Support executive bullet mode, standard prose, and deep IMRaD mode. If the content appears scientific, preserve the paper framing.",
        JSON.stringify({
          ...request,
          chunks: chunkText(sourceText || request.topic, 3000, 300).slice(0, 5),
        }),
        { outputMarkdown: fallbackMarkdown }
      );

  const suggested = await appendSuggestedEvidence(
    sourceAwareEvidence(
      "summary",
      request.topic,
      sourceText || request.sourceNotes,
      request.sourceUrl,
      request.pdfUrl
    ),
    "summary",
    request.topic,
    sourceText,
    ai.outputMarkdown || fallbackMarkdown
  );

  return {
    outputMarkdown: ai.outputMarkdown || fallbackMarkdown,
    evidence: suggested.evidence,
    sources: suggested.sources,
    warnings,
    agentVersion: AGENT_VERSION,
  };
}

function isSubjectiveTopic(topic: string) {
  return /feel|feeling|my take|i think|i learned|personal/i.test(topic);
}

function buildToneInstructions(tone?: string) {
  switch (tone?.toLowerCase()) {
    case "founder":
      return "Write like a sharp founder with real operating experience: confident, concrete, concise, and slightly contrarian.";
    case "social influencer":
      return "Write like a high-performing social creator: hook-first, punchy, high-clarity, but still intelligent and not gimmicky.";
    case "dry, opinionated":
      return "Write in a dry, opinionated voice: crisp, skeptical, witty, and allergic to fluff.";
    case "technical":
      return "Write like an experienced engineer explaining meaningful trends with clear taste.";
    default:
      return `Write in this custom voice: ${tone}. Keep it readable and natural.`;
  }
}

export async function generateSocialDraft(
  request: SocialAgentRequest
): Promise<AgentResult> {
  const seed = request.existingDraft || request.sourceNotes || request.topic;

  const ai = await runJsonPrompt<{
    xThread: string[];
    linkedin: string;
  }>(
    `
You are a premium social media ghostwriter.

Return ONLY valid JSON with:
{
  "xThread": ["tweet 1", "tweet 2", "tweet 3"],
  "linkedin": "linkedin post"
}

Rules:
- X thread should feel sharp, intelligent, and highly shareable.
- X posts should use short punchy sentences.
- Format X content like a real viral thread.
- Start with a hook.
- Each tweet should feel standalone.
- Keep tweets readable and skimmable.

- LinkedIn should feel thoughtful, professional, and human.
- Use whitespace heavily.
- Use short paragraphs (1–3 sentences max).
- Never return one giant paragraph.
- Include a strong opening hook.
- Add spacing between ideas.
- Make it look native to LinkedIn when pasted: plenty of line breaks, compact sections, easy scanning.
- Prefer 6 to 10 short blocks, not one essay.
- Use dashes or bullets when listing examples, events, places, or takeaways.
- The first line should be strong enough to stop the scroll.
- The second block should deepen the setup, not repeat it.
- If relevant, add a short list section in the middle.
- End with a crisp takeaway or question that invites comments.
- End with either:
  - a thoughtful takeaway,
  - a question,
  - or a future-facing insight.

- Avoid cringe marketing language.
- Avoid generic AI phrasing.
- Write like an experienced operator or founder.
- Do not use markdown headings like # or ## in the LinkedIn post.
- Do not output one long wall of text.

- ${buildToneInstructions(request.tone)}
- Audience: ${request.audience || "builders and tech professionals"}
`,
    JSON.stringify(request),
    {
      xThread: [
        `${request.topic} is more important than most people realize.`,
        `Most people miss the deeper implications.`,
        `The real opportunity is how this changes workflows and behavior.`,
      ],
      linkedin: `${request.topic}

Most people talk about the surface.

The more interesting angle is what changes in practice.

- What people do differently
- What teams learn the hard way
- Where the real leverage is

That is where the post becomes useful.

What is your take?`,
    }
  );

  const safeThread = Array.isArray(ai.xThread)
    ? ai.xThread
    : [String(ai.xThread || "")];

  const threadMarkdown = safeThread
    .map(
      (tweet, index) => `## ${index + 1}

${tweet}`
    )
    .join("\n\n");

  const normalizedLinkedin = (ai.linkedin || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const outputMarkdown = `# X / Twitter thread

${threadMarkdown}

---

# LinkedIn

${normalizedLinkedin}`;


  const shouldAttachEvidence = !isSubjectiveTopic(request.topic);

  const suggested = shouldAttachEvidence
    ? await appendSuggestedEvidence(
        sourceAwareEvidence(
          "social",
          request.topic,
          request.sourceNotes || request.existingDraft,
          request.sourceUrl
        ),
        "social",
        request.topic,
        seed,
        outputMarkdown
      )
    : { evidence: [], sources: [] as RankedSource[] };

  return {
    outputMarkdown,
    outputJson: {
      x: safeThread.join("\n\n"),
      xThread: safeThread,
      linkedin: normalizedLinkedin,
    },
    evidence: suggested.evidence,
    sources: suggested.sources,
    warnings: shouldAttachEvidence
      ? []
      : ["This appears subjective, so evidence is optional."],
    agentVersion: AGENT_VERSION,
  };
}

export function createDraftRecord(params: {
  format: DraftFormat;
  topic: string;
  sourceNotes?: string;
  sourceUrl?: string;
  pdfUrl?: string;
  result: AgentResult;
}) {
  const now = new Date().toISOString();

  return {
    id: uuid(),
    format: params.format,
    status: "review" as const,
    topic: params.topic,
    sourceNotes: params.sourceNotes || "",
    sourceUrl: params.sourceUrl,
    pdfUrl: params.pdfUrl,
    outputMarkdown: params.result.outputMarkdown,
    outputJson: params.result.outputJson || null,
    evidence: params.result.evidence,
    sources: params.result.sources || [],
    warnings: params.result.warnings,
    agentVersion: params.result.agentVersion,
    createdAt: now,
    updatedAt: now,
  };
}
