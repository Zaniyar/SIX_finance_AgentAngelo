/**
 * Client Memory Card — FR-004.
 * Compact, cached, evidence-backed client summary for the UI.
 * GET /api/clients/:id/memory-card must return in < 500ms from cached data.
 */
import { Client, ClientDna, CrmNote, MemoryCard, DnaGap } from "../shared/types";
import { cacheGet, cacheSet, getCrm } from "../data/loader";
import { makeEvidenceFromNote, storeEvidence } from "./evidence";
import { relationshipOpportunityScore } from "./scoring";

/** Extract open promises from CRM notes (lines with "will", "promised", "next time"). */
function extractOpenPromises(notes: CrmNote[]): string[] {
  const PROMISE_PATTERNS = /\b(will|promised?|next time|follow[- ]up|committed?|agreed? to)\b/i;
  const promises: string[] = [];
  for (const n of notes.slice(-20)) {
    if (PROMISE_PATTERNS.test(n.note)) {
      promises.push(n.note.slice(0, 120).trim());
      if (promises.length >= 3) break;
    }
  }
  return promises;
}

/** Extract previous objections (lines with "but", "concern", "worried", "not sure"). */
function extractObjections(notes: CrmNote[]): string[] {
  const OBJ_PATTERNS = /\b(concern|worried|not sure|hesitant|prefer not|uncomfortable|object|resist)\b/i;
  const objections: string[] = [];
  for (const n of notes.slice(-30)) {
    if (OBJ_PATTERNS.test(n.note)) {
      objections.push(n.note.slice(0, 100).trim());
      if (objections.length >= 3) break;
    }
  }
  return objections;
}

/** Extract sensitive topics (health, family, legal, tax). */
function extractSensitiveTopics(notes: CrmNote[]): string[] {
  const SENSITIVE = /\b(health|sick|diagnos|legal|tax|divorce|death|loss|grief|private|confidential)\b/i;
  const topics = new Set<string>();
  for (const n of notes) {
    const m = n.note.match(SENSITIVE);
    if (m) topics.add(m[0].toLowerCase());
  }
  return Array.from(topics).slice(0, 5);
}

export function buildMemoryCard(
  client: Client,
  dna: ClientDna,
  gaps: DnaGap[],
): MemoryCard {
  const cacheKey = `memory-card-${client.id}`;
  const cached = cacheGet<MemoryCard>(cacheKey);
  if (cached) return cached;

  const notes = getCrm(client.id);
  const openPromises = extractOpenPromises(notes);
  const objections = extractObjections(notes);
  const sensitiveTopics = extractSensitiveTopics(notes);

  // Build evidence items from recent notes
  const recentNotes = notes.slice(-5);
  const evidenceItems = recentNotes.map((n, i) =>
    makeEvidenceFromNote(n, notes.length - 5 + i, client.id, ["dna_extraction", "message_draft"])
  );
  storeEvidence(evidenceItems);

  const relOpp = relationshipOpportunityScore({
    clientRelevance: dna.values.length >= 3 ? 0.8 : 0.4,
    timingRelevance: 0.5,
    unmetNeed: gaps.length > 2 ? 0.8 : 0.4,
    relationshipGap: objections.length > 0 ? 0.7 : 0.3,
    nextBestServicePotential: 0.6,
  });

  const card: MemoryCard = {
    client_id: client.id,
    display_name: client.displayName,
    mandate: client.mandate,
    rm: client.rm,
    top_values: dna.values.slice(0, 3),
    personal_context: dna.context.slice(0, 2).join("; "),
    communication_style: dna.commsStyle,
    previous_objections: objections,
    open_promises: openPromises,
    sensitive_topics: sensitiveTopics,
    gaps: gaps.slice(0, 3),
    relationship_opportunity_score: relOpp,
    generated_at: new Date().toISOString(),
    evidence_ids: evidenceItems.map((e) => e.evidence_id),
  };

  cacheSet(cacheKey, card);
  return card;
}
