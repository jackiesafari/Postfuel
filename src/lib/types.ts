export type DraftFormat = "blog" | "code" | "summary" | "social";

export type DraftStatus = "draft" | "review" | "published";

export type SourceType = "note" | "url" | "pdf" | "web";

export type ToneVariant =
  | "conversational"
  | "technical"
  | "opinionated"
  | "tutorial";

export type CodeStyle = "inline-comments" | "tutorial-post" | "gitbook-style";

export type SummaryDepth = "executive" | "standard" | "deep-imrad";

export type ResearchMode = "web-suggested" | "user-only";

export type TopicDomain =
  | "travel"
  | "tech-learning"
  | "ai-infra"
  | "health"
  | "finance"
  | "recipe"
  | "general";

export type SourceCategory =
  | "official-docs"
  | "spec"
  | "government"
  | "peer-reviewed"
  | "editorial-guide"
  | "tutorial"
  | "open-source"
  | "developer-discussion"
  | "maps"
  | "reviews"
  | "official-tourism"
  | "recipe-editorial"
  | "search-fallback"
  | "encyclopedia";

export interface EvidenceItem {
  id: string;
  claim: string;
  sourceType: SourceType;
  sourceLabel: string;
  sourceRef: string;
  excerpt: string;
  verified: boolean;
  confidence: number;
}

export interface RankedSource {
  id: string;
  name: string;
  url: string;
  searchQuery: string;
  sourceType: SourceType;
  sourceCategory: SourceCategory;
  domain: TopicDomain;
  authorityScore: number;
  relevanceScore: number;
  specificityScore: number;
  freshnessScore: number;
  formatFitScore: number;
  finalScore: number;
  whySelected: string;
  supports: string[];
  excerpt: string;
}

export interface SocialOutputs {
  x?: string;
  xThread?: string[];
  linkedin: string;
}

export interface Draft {
  id: string;
  format: DraftFormat;
  status: DraftStatus;
  topic: string;
  sourceNotes: string;
  sourceUrl?: string;
  pdfUrl?: string;
  outputMarkdown: string;
  outputJson?: SocialOutputs | Record<string, unknown> | null;
  evidence: EvidenceItem[];
  sources: RankedSource[];
  warnings: string[];
  agentVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRequestBase {
  topic: string;
  sourceNotes?: string;
  sourceUrl?: string;
  pdfUrl?: string;
  researchMode?: ResearchMode;
}

export interface BlogAgentRequest extends AgentRequestBase {
  tone?: ToneVariant;
}

export interface CodeAgentRequest extends AgentRequestBase {
  codeSnippet: string;
  walkthroughStyle?: CodeStyle;
}

export interface SummaryAgentRequest extends AgentRequestBase {
  depth?: SummaryDepth;
}

export interface SocialAgentRequest extends AgentRequestBase {
  existingDraft?: string;
  tone?: string;
  audience?: string;
}

export interface AgentResult {
  outputMarkdown: string;
  outputJson?: SocialOutputs | null;
  evidence: EvidenceItem[];
  sources: RankedSource[];
  warnings: string[];
  agentVersion: string;
}
