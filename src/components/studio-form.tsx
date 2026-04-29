"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileCode2, Newspaper, Sparkles, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DraftFormat } from "@/lib/types";
import { cn } from "@/lib/utils";

const formatOptions: Array<{
  id: DraftFormat;
  label: string;
  eyebrow: string;
  icon: typeof FileText;
}> = [
  { id: "blog", label: "Blog post", eyebrow: "Long-form markdown", icon: FileText },
  { id: "code", label: "Code example", eyebrow: "Snippet + walkthrough", icon: FileCode2 },
  { id: "summary", label: "Summary", eyebrow: "TL;DR from source", icon: Newspaper },
  { id: "social", label: "Social posts", eyebrow: "X + LinkedIn set", icon: Sparkles },
];

export function StudioForm() {
  const router = useRouter();
  const [format, setFormat] = useState<DraftFormat>("blog");
  const deferredFormat = useDeferredValue(format);
  const [topic, setTopic] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [tone, setTone] = useState("conversational");
  const [socialTonePreset, setSocialTonePreset] = useState("founder");
  const [customSocialTone, setCustomSocialTone] = useState("");
  const [audience, setAudience] = useState("");
  const [walkthroughStyle, setWalkthroughStyle] = useState("gitbook-style");
  const [depth, setDepth] = useState("standard");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeFormat =
    formatOptions.find((option) => option.id === deferredFormat) ?? formatOptions[0];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let pdfUrl = "";

      if (format === "summary" && file) {
        const uploadBody = new FormData();
        uploadBody.append("file", file);
        const uploadResponse = await fetch("/api/uploads", {
          method: "POST",
          body: uploadBody,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed. Please try the PDF again.");
        }

        const uploadPayload = (await uploadResponse.json()) as { pdfUrl: string };
        pdfUrl = uploadPayload.pdfUrl;
      }

      const payload = {
        topic,
        sourceNotes,
        sourceUrl,
        researchMode: "web-suggested",
        tone:
          format === "social"
            ? socialTonePreset === "custom"
              ? customSocialTone.trim()
              : socialTonePreset
            : tone,
        audience: format === "social" ? audience.trim() : undefined,
        codeSnippet,
        walkthroughStyle,
        depth,
        pdfUrl,
      };

      const response = await fetch(`/api/agents/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Generation failed.");
      }

      const draft = (await response.json()) as { id: string };

      startTransition(() => {
        router.push(`/drafts/${draft.id}`);
        router.refresh();
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong while generating the draft."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-white/5 pb-8">
        <CardTitle className="text-4xl leading-none tracking-tight md:text-6xl">
          Draft like an editor.
          <br />
          <span className="text-[#ff9b53] italic">Ship like a developer.</span>
        </CardTitle>
        <CardDescription className="max-w-2xl text-base leading-7">
          Turn rough notes, source docs, research links, and code snippets into structured
          drafts with evidence attached before anyone hits publish.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-8">
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">01 · Format</p>
            <div className="grid gap-3 md:grid-cols-4">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    className={cn(
                      "rounded-[24px] border px-5 py-4 text-left transition",
                      format === option.id
                        ? "border-[#ff9b53]/50 bg-[#ff9b53]/8"
                        : "border-white/10 bg-[#120f0d]"
                    )}
                    onClick={() => setFormat(option.id)}
                    type="button"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <Icon className="h-5 w-5 text-[#ffb882]" />
                      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8f7c70]">
                        {option.eyebrow}
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-white">{option.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">02 · Topic / Brief</p>
            <Input
              placeholder="e.g. The Postgres indexing lesson I wish I'd learned 5 years ago"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">03 · Source Notes</p>
              <span className="text-xs text-[#8f7c70]">Optional but recommended</span>
            </div>
            <Textarea
              placeholder="Paste outlines, research, source docs, changelog notes, transcript snippets, or rough thoughts..."
              value={sourceNotes}
              onChange={(event) => setSourceNotes(event.target.value)}
              className="min-h-[180px]"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">04 · Source URL</p>
              <Input
                placeholder="https://example.com/article"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
            </div>

            {format === "summary" ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">05 · PDF upload</p>
                <label className="flex h-12 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-[#120f0d] px-4 text-sm text-[#b8ada5]">
                  <Upload className="h-4 w-4 text-[#ffb882]" />
                  <span>{file ? file.name : "Attach a PDF for the summarizer"}</span>
                  <input
                    accept="application/pdf"
                    className="hidden"
                    type="file"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">05 · Research mode</p>
                <div className="flex h-12 items-center rounded-2xl border border-white/10 bg-[#120f0d] px-4 text-sm text-[#b8ada5]">
                  Web-suggested evidence enabled
                </div>
              </div>
            )}
          </div>

          {format === "blog" && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">Tone</p>
              <Select value={tone} onChange={(event) => setTone(event.target.value)}>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
                <option value="opinionated">Opinionated</option>
                <option value="tutorial">Tutorial</option>
              </Select>
            </div>
          )}

          {format === "code" && (
            <div className="grid gap-5 md:grid-cols-[1.1fr_0.5fr]">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">Code snippet</p>
                <Textarea
                  className="min-h-[220px] font-[family-name:var(--font-geist-mono)]"
                  placeholder={`function addEvidence(claims) {\n  return claims.map((claim) => ({ claim }))\n}`}
                  value={codeSnippet}
                  onChange={(event) => setCodeSnippet(event.target.value)}
                  required={format === "code"}
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">Style</p>
                <Select
                  value={walkthroughStyle}
                  onChange={(event) => setWalkthroughStyle(event.target.value)}
                >
                  <option value="gitbook-style">GitBook-style</option>
                  <option value="tutorial-post">Tutorial post</option>
                  <option value="inline-comments">Inline comments</option>
                </Select>
              </div>
            </div>
          )}

          {format === "summary" && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">Depth</p>
              <Select value={depth} onChange={(event) => setDepth(event.target.value)}>
                <option value="executive">Executive</option>
                <option value="standard">Standard</option>
                <option value="deep-imrad">Deep IMRaD</option>
              </Select>
            </div>
          )}

          {format === "social" && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">Tone</p>
                <Select
                  value={socialTonePreset}
                  onChange={(event) => setSocialTonePreset(event.target.value)}
                >
                  <option value="founder">Founder</option>
                  <option value="social influencer">Social influencer</option>
                  <option value="dry, opinionated">Dry, opinionated</option>
                  <option value="custom">Custom</option>
                </Select>
                {socialTonePreset === "custom" ? (
                  <Input
                    placeholder="e.g. witty, skeptical, a16z-core, concise"
                    value={customSocialTone}
                    onChange={(event) => setCustomSocialTone(event.target.value)}
                  />
                ) : null}
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8f7c70]">Audience</p>
                <Input
                  placeholder="e.g. startup founders, product designers, staff engineers"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Button disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating {activeFormat.label.toLowerCase()}
                </>
              ) : (
                `Generate ${activeFormat.label}`
              )}
            </Button>
            <p className="text-sm text-[#8f7c70]">
              Each run creates a draft in review with evidence attached where available.
            </p>
          </div>

          {error ? <p className="text-sm text-[#ff9d9d]">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
