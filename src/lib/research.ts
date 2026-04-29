import { v4 as uuid } from "uuid";

import { SOURCE_PROFILES } from "@/lib/source-profiles";
import { EvidenceItem, RankedSource, SourceCategory, SourceType, TopicDomain } from "@/lib/types";
import { clipText } from "@/lib/utils";

const KNOWN_CITIES = [
  "New York City",
  "New York",
  "Los Angeles",
  "San Francisco",
  "Miami Beach",
  "Miami",
  "Orlando",
  "Chicago",
  "Las Vegas",
  "New Orleans",
  "Seattle",
  "Boston",
  "Washington DC",
  "Austin",
  "Nashville",
  "Portland",
  "Denver",
  "San Diego",
  "Philadelphia",
  "Atlanta",
  "South Beach",
  "Little Havana",
  "Wynwood",
];

const OFFICIAL_TOURISM_GUIDES: Array<{
  match: RegExp;
  name: string;
  url: string;
  excerpt: string;
}> = [
  {
    match: /\borlando\b/i,
    name: "Visit Orlando",
    url: "https://www.visitorlando.com/things-to-do/",
    excerpt:
      "Official Orlando tourism coverage with attractions, neighborhoods, dining, and seasonal visitor recommendations.",
  },
  {
    match: /\bmiami\b/i,
    name: "Miami & Beaches",
    url: "https://www.miamiandbeaches.com/things-to-do",
    excerpt:
      "Official Greater Miami tourism guide with attraction roundups, neighborhood guides, and visitor planning content.",
  },
  {
    match: /\bnew york city\b|\bnew york\b/i,
    name: "NYC Tourism",
    url: "https://www.nyctourism.com/things-to-do/",
    excerpt:
      "Official New York City tourism site with attraction roundups, neighborhood picks, and seasonal planning guides.",
  },
  {
    match: /\bsan francisco\b/i,
    name: "SF Travel",
    url: "https://www.sftravel.com/explore",
    excerpt:
      "Official San Francisco visitor guide with attraction ideas, neighborhoods, and local planning recommendations.",
  },
];

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isTravelTopic(topic: string) {
  return /\b(travel|visit|things to do|places to go|itinerary|weekend|trip|vacation|city guide|restaurants?|hotels?|beaches?|neighborhoods?|attractions?)\b/i.test(
    topic
  );
}

function isTechLearningTopic(topic: string) {
  return /\b(learn|code|coding|programming|developer|software|javascript|typescript|python|react|next\.?js|web dev|web development|computer science|tutorial|course|beginner|coding journey|frontend|backend|api)\b/i.test(
    topic
  );
}

function isAiInfraTopic(topic: string) {
  return /\b(mcp|model context protocol|agent sdk|tool calling|ai sdk|llm tooling|protocol|rag|vector db|embeddings?|prompt engineering|openai api|anthropic api|agent tooling|inference|context window)\b/i.test(
    topic
  );
}

function isHealthTopic(topic: string) {
  return /\b(health|fitness|workout|exercise|diet|nutrition|mental health|sleep|weight loss|calories|yoga|running|meditation|wellness|symptoms|medical)\b/i.test(
    topic
  );
}

function isFinanceTopic(topic: string) {
  return /\b(invest|investing|stocks?|budget|budgeting|save money|personal finance|crypto|401k|retirement|debt|credit score|financial|taxes?)\b/i.test(
    topic
  );
}

function isRecipeTopic(topic: string) {
  return /\b(recipe|cook|cooking|bake|baking|meal|food|dinner|lunch|breakfast|ingredients|dessert|soup|salad|pasta|cake)\b/i.test(
    topic
  );
}

function classifyTopic(topic: string): TopicDomain {
  if (isTravelTopic(topic)) return "travel";
  if (isAiInfraTopic(topic)) return "ai-infra";
  if (isTechLearningTopic(topic)) return "tech-learning";
  if (isHealthTopic(topic)) return "health";
  if (isFinanceTopic(topic)) return "finance";
  if (isRecipeTopic(topic)) return "recipe";
  return "general";
}

function extractCoreQuery(topic: string) {
  return topic
    .replace(/^(top\s+\d+\s+|best\s+\d+\s+|how\s+to\s+|guide\s+to\s+|what\s+is\s+|why\s+)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPlaceCandidates(topic: string): string[] {
  const normalized = toTitleCase(topic.toLowerCase());
  const knownMatches = KNOWN_CITIES.filter((city) =>
    normalized.toLowerCase().includes(city.toLowerCase())
  );

  if (knownMatches.length > 0) {
    return knownMatches;
  }

  const cleaned = normalized
    .replace(
      /\b(Top|Best|Guide|Things To Do|Places To Visit|Places To Go|Where To Go|Where To Stay|Weekend|Itinerary|Trip|Travel|\d+)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const matches = cleaned.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.trim()))).filter(Boolean);
}

function extractTravelSearchQuery(topic: string) {
  const normalized = topic.replace(/\s+/g, " ").trim();
  const intent = /\b(restaurants?|food|eat|dining)\b/i.test(normalized)
    ? "restaurants"
    : /\b(hotels?|stay|lodging)\b/i.test(normalized)
      ? "hotels"
      : /\b(beaches?)\b/i.test(normalized)
        ? "beaches"
        : /\b(neighborhoods?)\b/i.test(normalized)
          ? "neighborhoods"
          : /\b(museums?|art|culture)\b/i.test(normalized)
            ? "museums"
            : "attractions";

  const explicitLocationMatch = normalized.match(
    /\b(?:in|for|around|near|at)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,4}?)(?:\s*$|\s+(?:to|for|and|with|\d))/i
  );

  const location = explicitLocationMatch?.[1]?.trim() || extractPlaceCandidates(normalized)[0];
  return location ? `${location} ${intent}`.trim() : intent;
}

function buildQuery(topic: string, domain: TopicDomain) {
  if (domain === "travel") {
    return extractTravelSearchQuery(topic);
  }

  return extractCoreQuery(topic) || topic;
}

function findOfficialTourismGuide(topic: string) {
  return OFFICIAL_TOURISM_GUIDES.find((guide) => guide.match.test(topic));
}

function buildCandidateSources(topic: string, domain: TopicDomain): RankedSource[] {
  const query = buildQuery(topic, domain);
  if (domain === "travel") {
    const officialGuide = findOfficialTourismGuide(topic);
    const travelSources: RankedSource[] = [];

    if (officialGuide) {
      travelSources.push({
        id: uuid(),
        name: officialGuide.name,
        url: officialGuide.url,
        searchQuery: query,
        sourceType: "web" as SourceType,
        sourceCategory: "official-tourism",
        domain: "travel",
        authorityScore: 10,
        relevanceScore: 0,
        specificityScore: 0,
        freshnessScore: 8,
        formatFitScore: 10,
        finalScore: 0,
        whySelected:
          "Direct official destination source for validating attraction lists and visitor-facing recommendations.",
        supports: ["official recommendations", "destination overview"],
        excerpt: officialGuide.excerpt,
      });
    }

    const profiles = SOURCE_PROFILES.travel.filter(
      (profile) => !(officialGuide && profile.sourceCategory === "official-tourism")
    );

    return [
      ...travelSources,
      ...profiles.map((profile) => ({
        id: uuid(),
        name: profile.name,
        url: profile.urlTemplate(query),
        searchQuery: query,
        sourceType: "web" as SourceType,
        sourceCategory: profile.sourceCategory,
        domain: profile.domain,
        authorityScore: profile.authorityScore,
        relevanceScore: 0,
        specificityScore: 0,
        freshnessScore: profile.freshnessScore,
        formatFitScore: profile.formatFitScore,
        finalScore: 0,
        whySelected: profile.whySelected,
        supports: profile.supports,
        excerpt: profile.excerpt,
      })),
    ];
  }

  const profiles = SOURCE_PROFILES[domain];

  return profiles.map((profile) => ({
    id: uuid(),
    name: profile.name,
    url: profile.urlTemplate(query),
    searchQuery: query,
    sourceType: "web" as SourceType,
    sourceCategory: profile.sourceCategory,
    domain: profile.domain,
    authorityScore: profile.authorityScore,
    relevanceScore: 0,
    specificityScore: 0,
    freshnessScore: profile.freshnessScore,
    formatFitScore: profile.formatFitScore,
    finalScore: 0,
    whySelected: profile.whySelected,
    supports: profile.supports,
    excerpt: profile.excerpt,
  }));
}

function scoreRelevance(topic: string, candidate: RankedSource) {
  const normalizedTopic = topic.toLowerCase();
  const normalizedQuery = candidate.searchQuery.toLowerCase();
  const normalizedName = candidate.name.toLowerCase();
  let score = 5;

  if (normalizedTopic.includes(normalizedQuery) || normalizedQuery.includes(normalizedTopic)) {
    score = 9;
  } else if (
    normalizedTopic.split(/\s+/).some((word) => word.length > 2 && normalizedQuery.includes(word))
  ) {
    score = 8;
  } else if (normalizedName.includes("official") || normalizedName.includes("docs")) {
    score = 7;
  }

  if (candidate.domain === "ai-infra" && /(official-docs|spec|open-source)/.test(candidate.sourceCategory)) {
    score += 1;
  }

  if (candidate.domain === "tech-learning" && /(official-docs|tutorial|open-source)/.test(candidate.sourceCategory)) {
    score += 1;
  }

  return Math.min(score, 10);
}

function scoreSpecificity(candidate: RankedSource) {
  const encodedQuery = encodeURIComponent(candidate.searchQuery);
  if (candidate.url.includes(encodedQuery)) return 9;

  const firstWord = candidate.searchQuery.toLowerCase().split(" ")[0];
  if (firstWord && candidate.url.toLowerCase().includes(firstWord)) return 7;

  return 5;
}

function computeFinalScore(candidate: RankedSource) {
  return Number(
    (
      candidate.authorityScore * 0.35 +
      candidate.relevanceScore * 0.3 +
      candidate.specificityScore * 0.15 +
      candidate.freshnessScore * 0.1 +
      candidate.formatFitScore * 0.1
    ).toFixed(2)
  );
}

function rankCandidateSources(topic: string, candidates: RankedSource[]) {
  return candidates
    .map((candidate) => {
      const ranked = {
        ...candidate,
        relevanceScore: scoreRelevance(topic, candidate),
        specificityScore: scoreSpecificity(candidate),
      };

      return {
        ...ranked,
        finalScore: computeFinalScore(ranked),
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

function isBalancedType(
  source: RankedSource,
  selectedCategories: Set<SourceCategory>,
  selected: RankedSource[],
  limit: number
) {
  if (selected.length === 0) return true;
  if (!selectedCategories.has(source.sourceCategory)) return true;
  return selected.length + 1 >= limit;
}

function dedupeAndBalanceSources(ranked: RankedSource[], limit: number) {
  const selected: RankedSource[] = [];
  const selectedKeys = new Set<string>();
  const selectedCategories = new Set<SourceCategory>();

  for (const source of ranked) {
    const key = `${source.name}:${source.url}`;
    if (selectedKeys.has(key)) continue;
    if (!isBalancedType(source, selectedCategories, selected, limit)) continue;

    selected.push(source);
    selectedKeys.add(key);
    selectedCategories.add(source.sourceCategory);

    if (selected.length >= limit) break;
  }

  return selected;
}

async function fetchWikipediaSuggestions(topic: string, limit: number): Promise<RankedSource[]> {
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(
    topic
  )}&limit=${limit}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "content-machine" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    pages?: Array<{ title: string; key: string; excerpt?: string }>;
  };

  return (payload.pages ?? []).map((page) => ({
    id: uuid(),
    name: page.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`,
    searchQuery: extractCoreQuery(topic) || topic,
    sourceType: "web" as const,
    sourceCategory: "encyclopedia",
    domain: "general" as const,
    authorityScore: 5,
    relevanceScore: 8,
    specificityScore: 7,
    freshnessScore: 5,
    formatFitScore: 5,
    finalScore: 0,
    whySelected: "Useful for background context and orientation when no stronger domain source is available.",
    supports: ["background context"],
    excerpt: clipText((page.excerpt ?? "").replace(/<[^>]+>/g, ""), 180),
  }));
}

export async function suggestWebSources(topic: string, limit = 4): Promise<RankedSource[]> {
  const domain = classifyTopic(topic);

  try {
    if (domain !== "general") {
      const candidates = buildCandidateSources(topic, domain);
      return dedupeAndBalanceSources(rankCandidateSources(topic, candidates), limit);
    }

    const wikipedia = await fetchWikipediaSuggestions(topic, limit);
    if (wikipedia.length > 0) {
      return dedupeAndBalanceSources(rankCandidateSources(topic, wikipedia), limit);
    }

    const generic = buildCandidateSources(topic, "general");
    return dedupeAndBalanceSources(rankCandidateSources(topic, generic), limit);
  } catch {
    const generic = buildCandidateSources(topic, domain === "general" ? "general" : domain);
    return dedupeAndBalanceSources(rankCandidateSources(topic, generic), limit);
  }
}

export function evidenceFromSource(
  claim: string,
  sourceLabel: string,
  sourceRef: string,
  excerpt: string,
  sourceType: SourceType,
  confidence = 0.7
): EvidenceItem {
  return {
    id: uuid(),
    claim,
    sourceLabel,
    sourceRef,
    excerpt: clipText(excerpt || claim, 220),
    sourceType,
    verified: false,
    confidence,
  };
}
