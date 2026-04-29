import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { hasSupabaseConfig } from "@/lib/config";
import { Draft, EvidenceItem } from "@/lib/types";

const dataDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "content-machine-data")
  : path.join(process.cwd(), "data");
const draftsFile = path.join(dataDir, "drafts.json");

type DraftPatch = Partial<Omit<Draft, "id" | "createdAt">>;

async function ensureDraftFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(draftsFile);
  } catch {
    await fs.writeFile(draftsFile, "[]", "utf8");
  }
}

async function readLocalDrafts() {
  await ensureDraftFile();
  const content = await fs.readFile(draftsFile, "utf8");
  return JSON.parse(content) as Draft[];
}

async function writeLocalDrafts(drafts: Draft[]) {
  await ensureDraftFile();
  await fs.writeFile(draftsFile, JSON.stringify(drafts, null, 2), "utf8");
}

function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function normalizeDraft(draft: Draft): Draft {
  return {
    ...draft,
    evidence: draft.evidence ?? [],
    sources: draft.sources ?? [],
    warnings: draft.warnings ?? [],
    outputJson: draft.outputJson ?? null,
  };
}

function sanitizeEvidence(evidence: EvidenceItem[]) {
  return evidence.map((item) => ({
    ...item,
    verified: Boolean(item.verified),
    confidence: Number(item.confidence ?? 0.5),
  }));
}

export async function listDrafts() {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("drafts")
      .select("*")
      .order("updatedAt", { ascending: false });

    if (!error && data) {
      return (data as Draft[]).map(normalizeDraft);
    }
  }

  const drafts = await readLocalDrafts();
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDraftById(id: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("drafts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return normalizeDraft(data as Draft);
    }
  }

  const drafts = await readLocalDrafts();
  return drafts.find((draft) => draft.id === id) ?? null;
}

export async function saveDraft(draft: Draft) {
  const payload: Draft = {
    ...draft,
    evidence: sanitizeEvidence(draft.evidence),
  };

  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("drafts").upsert(payload);
    if (!error) {
      return payload;
    }
  }

  const drafts = await readLocalDrafts();
  const next = drafts.filter((item) => item.id !== payload.id);
  next.unshift(payload);
  await writeLocalDrafts(next);
  return payload;
}

export async function updateDraft(id: string, patch: DraftPatch) {
  const current = await getDraftById(id);

  if (!current) {
    return null;
  }

  const updated: Draft = {
    ...current,
    ...patch,
    evidence: patch.evidence ? sanitizeEvidence(patch.evidence) : current.evidence,
    updatedAt: new Date().toISOString(),
  };

  await saveDraft(updated);
  return updated;
}
