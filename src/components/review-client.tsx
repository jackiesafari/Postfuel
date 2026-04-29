"use client";

import { useState, useTransition } from "react";
import { Mail, CheckCircle2, Copy, ExternalLink, Send, ChevronDown, ChevronUp } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Draft, EvidenceItem, RankedSource, SocialOutputs } from "@/lib/types";
import { clipText, stripMarkdown } from "@/lib/utils";

function getDraftMarkdown(draft: Draft) {
  return draft.outputMarkdown || "";
}

function isSocialDraft(draft: Draft) {
  return draft.format === "social";
}

function getSocialOutputs(draft: Draft): SocialOutputs | null {
  if (!isSocialDraft(draft) || !draft.outputJson) {
    return null;
  }

  return draft.outputJson as SocialOutputs;
}

function renderLinkedInBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function buildXPreviewPosts(thread: string[]) {
  const normalizedBlocks = thread.map((item) => item.trim()).filter(Boolean);
  const previewPosts: string[] = [];
  const tweetLimit = 280;

  normalizedBlocks.forEach((block) => {
    if (previewPosts.length === 0) {
      previewPosts.push(block);
      return;
    }

    const current = previewPosts[previewPosts.length - 1];
    const combined = `${current}\n\n${block}`;

    if (combined.length <= tweetLimit) {
      previewPosts[previewPosts.length - 1] = combined;
      return;
    }

    previewPosts.push(block);
  });

  return previewPosts;
}

function renderTweetParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function buildSocialMarkdown(thread: string[], linkedin: string) {
  return `# X / Twitter thread\n\n${thread
    .map((tweet, index) => `## ${index + 1}\n\n${tweet}`)
    .join("\n\n")}\n\n---\n\n# LinkedIn\n\n${linkedin}`;
}

function getEvidenceDisplay(item: EvidenceItem) {
  const ref = item.sourceRef.toLowerCase();
  const label = item.sourceLabel.toLowerCase();

  if (ref.includes("tripadvisor") || label.includes("tripadvisor")) {
    return {
      badge: "Traveler reviews",
      source: "Tripadvisor",
    };
  }

  if (ref.includes("google.com/maps") || label.includes("google maps")) {
    return {
      badge: "Map listing",
      source: "Google Maps",
    };
  }

  if (ref.includes("travel.usnews.com") || label.includes("travel + destination guide")) {
    return {
      badge: "Travel guide",
      source: "U.S. News Travel",
    };
  }

  if (ref.includes("mapbox") || label.includes("mapbox")) {
    return {
      badge: "Place data",
      source: "Mapbox",
    };
  }

  if (ref.includes("miamiandbeaches.com") || label.includes("official tourism")) {
    return {
      badge: "Official tourism guide",
      source: "Miami & Beaches",
    };
  }

  if (item.sourceType === "note") {
    return {
      badge: "Source note",
      source: item.sourceLabel,
    };
  }

  if (item.sourceType === "url") {
    return {
      badge: "Provided source",
      source: item.sourceLabel,
    };
  }

  if (item.sourceType === "pdf") {
    return {
      badge: "Uploaded document",
      source: item.sourceLabel,
    };
  }

  return {
    badge: "Web source",
    source: item.sourceLabel,
  };
}

function groupEvidenceSources(evidence: EvidenceItem[]) {
  const seen = new Map<
    string,
    {
      key: string;
      title: string;
      badge: string;
      ref: string;
      excerpt: string;
      count: number;
    }
  >();

  evidence.forEach((item) => {
    const display = getEvidenceDisplay(item);
    const key = `${display.source}::${item.sourceRef}`;
    const current = seen.get(key);

    if (current) {
      current.count += 1;
      return;
    }

    seen.set(key, {
      key,
      title: display.source,
      badge: display.badge,
      ref: item.sourceRef,
      excerpt: item.excerpt,
      count: 1,
    });
  });

  return Array.from(seen.values());
}

function getSourceBadge(source: RankedSource) {
  switch (source.sourceCategory) {
    case "official-docs":
      return "Official docs";
    case "spec":
      return "Spec";
    case "government":
      return "Government";
    case "peer-reviewed":
      return "Research";
    case "editorial-guide":
      return "Guide";
    case "tutorial":
      return "Tutorial";
    case "open-source":
      return "Open source";
    case "developer-discussion":
      return "Dev discussion";
    case "maps":
      return "Map listing";
    case "reviews":
      return "Traveler reviews";
    case "official-tourism":
      return "Official tourism";
    case "recipe-editorial":
      return "Recipe guide";
    case "encyclopedia":
      return "Reference";
    default:
      return "Web source";
  }
}

function defaultShareText(draft: Draft) {
  if (draft.format === "social" && draft.outputJson) {
    return (draft.outputJson as SocialOutputs).linkedin;
  }

  return clipText(stripMarkdown(getDraftMarkdown(draft)), 220);
}

function defaultXShareText(draft: Draft) {
  if (draft.format === "social" && draft.outputJson) {
    const social = draft.outputJson as SocialOutputs;
    const thread = social.xThread ?? [];
    return thread.join("\n\n").trim();
  }

  return clipText(stripMarkdown(getDraftMarkdown(draft)), 220);
}

export function ReviewClient({ draft }: { draft: Draft }) {
  const [currentDraft, setCurrentDraft] = useState(draft);
  const [shareText, setShareText] = useState(defaultShareText(draft));
  const [socialShareText, setSocialShareText] = useState({
    linkedin: defaultShareText(draft),
    x: defaultXShareText(draft),
  });
  const [previewPlatform, setPreviewPlatform] = useState<"linkedin" | "x">("linkedin");
  const [publishPlatform, setPublishPlatform] = useState<"linkedin" | "x">("linkedin");
  const [reviewFeedback, setReviewFeedback] = useState<"good" | "improve" | null>(null);
  const [showSources, setShowSources] = useState(true);
  const [isPending, startTransition] = useTransition();

  const markdown = getDraftMarkdown(currentDraft);
  const socialOutputs = getSocialOutputs(currentDraft);
  const xPreviewPosts = buildXPreviewPosts(socialOutputs?.xThread ?? []);
  const activeShareText = isSocialDraft(currentDraft)
    ? socialShareText[publishPlatform]
    : shareText;
  const evidence = currentDraft.evidence ?? [];
  const rankedSources = currentDraft.sources ?? [];
  const sourceGroups = rankedSources.length ? [] : groupEvidenceSources(evidence);
  const totalSources = rankedSources.length || sourceGroups.length;
  const warnings = currentDraft.warnings ?? [];

  async function toggleEvidence(item: EvidenceItem) {
    const updatedEvidence = evidence.map((evidenceItem) =>
      evidenceItem.id === item.id
        ? { ...evidenceItem, verified: !evidenceItem.verified }
        : evidenceItem
    );

    setCurrentDraft((value) => ({ ...value, evidence: updatedEvidence }));

    startTransition(() => {
      void fetch(`/api/drafts/${currentDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: updatedEvidence, status: "review" }),
      });
    });
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
  }

  async function copyShareText() {
    await navigator.clipboard.writeText(activeShareText);
  }

  const emailHref = `mailto:?subject=${encodeURIComponent(currentDraft.topic)}&body=${encodeURIComponent(activeShareText)}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialShareText.x)}`;
  const linkedinHref = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(
    socialShareText.linkedin
  )}`;

  return (
    <div className="grid gap-8 xl:grid-cols-[1.35fr_0.75fr]">
      <Card className="overflow-hidden border-white/10 bg-[#120d0a] shadow-2xl">
        <CardHeader className="border-b border-white/10 bg-[#17110e] pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{currentDraft.format}</Badge>
            <Badge className="bg-[#ff9b53]/10 text-[#ffb882]">{currentDraft.status}</Badge>
            <Badge>{currentDraft.agentVersion}</Badge>
          </div>

          <input
            className="mt-4 w-full bg-transparent text-4xl font-bold tracking-tight text-white outline-none placeholder:text-white/30"
            value={currentDraft.topic}
            onChange={(event) =>
              setCurrentDraft((value) => ({ ...value, topic: event.target.value }))
            }
            placeholder="Draft title"
          />

          <CardDescription>
            Edit the draft, polish the voice, then copy or share when it feels ready.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Editable draft</p>
              <p className="text-xs text-[#8f7c70]">Make changes directly before publishing.</p>
            </div>

            <Button onClick={copyMarkdown} type="button" variant="secondary">
              <Copy className="mr-2 h-4 w-4" />
              Copy draft
            </Button>
          </div>

          {isSocialDraft(currentDraft) && socialOutputs ? (
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8f7c70]">X thread</p>
                <Textarea
                  value={(socialOutputs.xThread ?? []).join("\n\n")}
                  onChange={(event) => {
                    const thread = event.target.value
                      .split(/\n\s*\n/)
                      .map((item) => item.trim())
                      .filter(Boolean);
                    const linkedin = socialOutputs.linkedin || "";
                    setCurrentDraft((value) => ({
                      ...value,
                      outputMarkdown: buildSocialMarkdown(thread, linkedin),
                      outputJson: { ...socialOutputs, x: thread.join("\n\n"), xThread: thread },
                    }));
                  }}
                  className="min-h-[260px] resize-y rounded-[28px] border border-[#ff9b53]/30 bg-[#0d0907] p-6 text-sm leading-7 text-white shadow-inner focus-visible:ring-[#ff9b53]/40"
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8f7c70]">LinkedIn draft</p>
                <Textarea
                  value={socialOutputs.linkedin || ""}
                  onChange={(event) => {
                    const linkedin = event.target.value;
                    const thread = socialOutputs.xThread ?? [];
                    setCurrentDraft((value) => ({
                      ...value,
                      outputMarkdown: buildSocialMarkdown(thread, linkedin),
                      outputJson: { ...socialOutputs, linkedin },
                    }));
                    setSocialShareText((value) => ({ ...value, linkedin }));
                  }}
                  className="min-h-[260px] resize-y rounded-[28px] border border-[#ff9b53]/40 bg-[#0d0907] p-6 text-base leading-8 text-white shadow-inner focus-visible:ring-[#ff9b53]/40"
                />
              </div>

              <div className="xl:col-span-2 rounded-[28px] border border-white/10 bg-[#17110e] p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8f7c70]">
                    Social preview
                  </p>
                  <div className="inline-flex rounded-full border border-white/10 bg-[#0d0907] p-1">
                    <button
                      className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                        previewPlatform === "linkedin"
                          ? "bg-[#ff9b53] text-[#140f0c]"
                          : "text-[#b8ada5] hover:text-white"
                      }`}
                      onClick={() => setPreviewPlatform("linkedin")}
                      type="button"
                    >
                      LinkedIn
                    </button>
                    <button
                      className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                        previewPlatform === "x"
                          ? "bg-[#ff9b53] text-[#140f0c]"
                          : "text-[#b8ada5] hover:text-white"
                      }`}
                      onClick={() => setPreviewPlatform("x")}
                      type="button"
                    >
                      X thread
                    </button>
                  </div>
                </div>

                {previewPlatform === "linkedin" ? (
                  <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-[#1c1713] shadow-[0_25px_80px_rgba(0,0,0,0.28)]">
                    <div className="border-b border-white/10 px-8 py-5">
                      <h3 className="font-serif text-4xl leading-none text-[#f4ede8]">
                        LinkedIn post
                      </h3>
                    </div>
                    <div className="space-y-6 px-8 py-8 text-[16px] leading-[1.85] text-[#ddd2ca] md:text-[18px]">
                      {renderLinkedInBlocks(socialOutputs.linkedin || "").map((block, index) => (
                        <p key={`${index}-${block.slice(0, 12)}`} className="whitespace-pre-wrap">
                          {block}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-[#121212] shadow-[0_25px_80px_rgba(0,0,0,0.28)]">
                    <div className="border-b border-white/10 px-8 py-5">
                      <h3 className="text-3xl font-semibold leading-none text-white">X thread</h3>
                    </div>
                    <div className="space-y-4 px-6 py-6">
                      {xPreviewPosts.map((tweet, index) => (
                        <div
                          key={`${index}-${tweet.slice(0, 12)}`}
                          className="rounded-[24px] border border-white/10 bg-[#0d0d0d] px-5 py-5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs uppercase tracking-[0.24em] text-[#8f7c70]">
                              Post {index + 1}
                            </span>
                            <span className="text-xs text-[#8f7c70]">{tweet.length} chars</span>
                          </div>
                          <div className="space-y-4 text-[15px] leading-8 text-[#f3ede7] md:text-[17px]">
                            {renderTweetParagraphs(tweet).map((paragraph, paragraphIndex) => (
                              <p
                                key={`${index}-${paragraphIndex}-${paragraph.slice(0, 12)}`}
                                className="whitespace-pre-wrap"
                              >
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mx-auto mt-5 max-w-3xl rounded-[24px] border border-white/10 bg-[#17110e] px-6 py-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8f7c70]">
                    How did this draft land?
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        reviewFeedback === "good"
                          ? "border-[#ff9b53] bg-[#ff9b53] text-[#140f0c]"
                          : "border-white/10 bg-white/[0.03] text-[#d5c7bd] hover:bg-white/[0.06]"
                      }`}
                      onClick={() => setReviewFeedback("good")}
                      type="button"
                    >
                      Good as is
                    </button>
                    <button
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        reviewFeedback === "improve"
                          ? "border-[#ff9b53] bg-[#ff9b53] text-[#140f0c]"
                          : "border-white/10 bg-white/[0.03] text-[#d5c7bd] hover:bg-white/[0.06]"
                      }`}
                      onClick={() => setReviewFeedback("improve")}
                      type="button"
                    >
                      Suggest improvement
                    </button>
                    {reviewFeedback ? (
                      <button
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#8f7c70] transition hover:bg-white/[0.04] hover:text-white"
                        onClick={() => setReviewFeedback(null)}
                        type="button"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Textarea
                value={markdown}
                onChange={(event) => {
                  const updatedMarkdown = event.target.value;
                  setCurrentDraft((value) => ({ ...value, outputMarkdown: updatedMarkdown }));
                  setShareText(clipText(stripMarkdown(updatedMarkdown), 220));
                }}
                className="min-h-[520px] resize-y rounded-[28px] border border-[#ff9b53]/40 bg-[#0d0907] p-6 text-base leading-8 text-white shadow-inner focus-visible:ring-[#ff9b53]/40"
                placeholder="Start editing your draft..."
              />

              <div className="rounded-[24px] border border-white/10 bg-[#17110e] p-6">
                <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#8f7c70]">
                  Reader preview
                </p>
                <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-7 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:px-10 md:py-10">
                  <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-white/8 pb-5">
                    <Badge className="bg-[#ff9b53]/12 text-[#ffbf91]">{currentDraft.format}</Badge>
                    <span className="text-xs uppercase tracking-[0.24em] text-[#8f7c70]">
                      Draft preview
                    </span>
                  </div>
                  <article className="mx-auto max-w-3xl">
                    <MarkdownRenderer markdown={markdown} />
                  </article>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <aside className="space-y-6">
        <Card className="border-white/10 bg-[#120d0a]">
          <CardHeader>
            <CardTitle className="text-xl">Publish</CardTitle>
            <CardDescription>Prepare a short share snippet and export the draft.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isSocialDraft(currentDraft) ? (
              <div className="inline-flex rounded-full border border-white/10 bg-[#0d0907] p-1">
                <button
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                    publishPlatform === "linkedin"
                      ? "bg-[#ff9b53] text-[#140f0c]"
                      : "text-[#b8ada5] hover:text-white"
                  }`}
                  onClick={() => setPublishPlatform("linkedin")}
                  type="button"
                >
                  LinkedIn
                </button>
                <button
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                    publishPlatform === "x"
                      ? "bg-[#ff9b53] text-[#140f0c]"
                      : "text-[#b8ada5] hover:text-white"
                  }`}
                  onClick={() => setPublishPlatform("x")}
                  type="button"
                >
                  X
                </button>
              </div>
            ) : null}
            <Textarea
              className="min-h-[150px] rounded-2xl border-white/10 bg-[#0d0907] text-sm leading-6 text-white"
              value={activeShareText}
              onChange={(event) => {
                if (isSocialDraft(currentDraft)) {
                  setSocialShareText((value) => ({
                    ...value,
                    [publishPlatform]: event.target.value,
                  }));
                  return;
                }

                setShareText(event.target.value);
              }}
            />

            <Button onClick={copyMarkdown} className="w-full" type="button">
              <Copy className="mr-2 h-4 w-4" />
              Copy markdown
            </Button>

            <Button onClick={copyShareText} className="w-full" type="button" variant="secondary">
              <Copy className="mr-2 h-4 w-4" />
              Copy share text
            </Button>

            <div className="grid gap-3">
              <a href={emailHref}>
                <Button className="w-full" type="button" variant="secondary">
                  <Mail className="mr-2 h-4 w-4" />
                  Share by email
                </Button>
              </a>

              <a href={xHref} rel="noreferrer" target="_blank">
                <Button className="w-full" type="button" variant="secondary">
                  <Send className="mr-2 h-4 w-4" />
                  Share to X
                </Button>
              </a>

              <a href={linkedinHref} rel="noreferrer" target="_blank">
                <Button className="w-full" type="button" variant="secondary">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Share to LinkedIn
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#120d0a]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Sources</CardTitle>
                <CardDescription>
                  Suggested references behind this draft.
                </CardDescription>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#e6dbd3] transition hover:bg-white/[0.07]"
                onClick={() => setShowSources((value) => !value)}
                type="button"
              >
                <span>{totalSources} sources</span>
                {showSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </CardHeader>

          {showSources ? (
            <CardContent className="space-y-3">
              {rankedSources.length ? (
                rankedSources.map((source) => (
                  <a
                    key={source.id}
                    className="block rounded-2xl border border-white/10 bg-[#0d0907] p-4 transition hover:border-[#ff9b53]/40"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Badge>{getSourceBadge(source)}</Badge>
                      <span className="text-xs text-[#8f7c70]">
                        {source.finalScore.toFixed(1)} score
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{source.name}</p>
                    <p className="mt-2 text-xs leading-6 text-[#d0c3b9]">{source.whySelected}</p>
                    <p className="mt-1 text-xs leading-6 text-[#8f7c70]">{source.excerpt}</p>
                  </a>
                ))
              ) : sourceGroups.length ? (
                sourceGroups.map((source) => (
                  <a
                    key={source.key}
                    className="block rounded-2xl border border-white/10 bg-[#0d0907] p-4 transition hover:border-[#ff9b53]/40"
                    href={source.ref}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Badge>{source.badge}</Badge>
                      <span className="text-xs text-[#8f7c70]">
                        {source.count} claim{source.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{source.title}</p>
                    <p className="mt-2 text-xs leading-6 text-[#b8ada5]">{source.excerpt}</p>
                  </a>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-[#b8ada5]">
                  No sources are attached yet.
                </div>
              )}
            </CardContent>
          ) : null}
        </Card>

        <Card className="border-white/10 bg-[#120d0a]">
          <CardHeader>
            <CardTitle className="text-xl">Evidence review</CardTitle>
            <CardDescription>Verify each claim before publishing.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {evidence.length ? (
              evidence.map((item) => (
                (() => {
                  const display = getEvidenceDisplay(item);

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleEvidence(item)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0907] p-4 text-left hover:border-[#ff9b53]/40"
                      type="button"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <Badge>{display.badge}</Badge>
                        <CheckCircle2
                          className={item.verified ? "h-4 w-4 text-[#8be28b]" : "h-4 w-4 text-[#8f7c70]"}
                        />
                      </div>
                      <p className="text-sm text-white">{item.claim}</p>
                      <p className="mt-2 text-xs text-[#d0c3b9]">{display.source}</p>
                      <p className="mt-1 text-xs text-[#8f7c70]">{item.excerpt}</p>
                    </button>
                  );
                })()
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-[#b8ada5]">
                No evidence is attached yet.
              </div>
            )}

            {isPending ? <p className="text-xs text-[#8f7c70]">Saving evidence review…</p> : null}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#120d0a]">
          <CardHeader>
            <CardTitle className="text-xl">Warnings</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-[#b8ada5]">
            {warnings.length ? (
              warnings.map((warning) => <p key={warning}>{warning}</p>)
            ) : (
              <p>No blocking warnings.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
