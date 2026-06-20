/**
 * Evidence Ledger + Audit Log — Section 14 & FR-015.
 * Every AI output must be reconstructable from sources.
 * In production this would be a database; for MVP we use append-only JSON files.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { EvidenceItem, AuditLog, EvidenceSourceType, EvidenceAllowedUse } from "../shared/types";
import { CrmNote } from "../shared/types";

const LEDGER_DIR = path.join(__dirname, "..", "..", "data", "ledger");

function ensureDir() {
  if (!fs.existsSync(LEDGER_DIR)) fs.mkdirSync(LEDGER_DIR, { recursive: true });
}

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// ── Evidence Items ────────────────────────────────────────────────────────────

export function makeEvidenceFromNote(
  note: CrmNote,
  noteIndex: number,
  clientId: string,
  allowedUse: EvidenceAllowedUse[]
): EvidenceItem {
  const snippet = note.note.slice(0, 180) + (note.note.length > 180 ? "…" : "");
  return {
    evidence_id: `ev-crm-${clientId}-${noteIndex}`,
    source_type: "crm_note",
    source_id: `note-${clientId}-${noteIndex}`,
    snippet,
    timestamp: note.date || new Date().toISOString(),
    reliability_score: 0.95,
    allowed_use: allowedUse,
  };
}

export function makeEvidenceFromPolicy(ruleId: string, detail: string): EvidenceItem {
  return {
    evidence_id: `ev-policy-${ruleId}`,
    source_type: "policy_rule",
    source_id: ruleId,
    snippet: detail,
    timestamp: new Date().toISOString(),
    reliability_score: 1.0,
    allowed_use: ["suitability_check", "alert_trigger"],
  };
}

export function makeEvidenceFromHolding(isin: string, detail: string): EvidenceItem {
  return {
    evidence_id: `ev-holding-${isin}`,
    source_type: "portfolio_holding",
    source_id: isin,
    snippet: detail,
    timestamp: new Date().toISOString(),
    reliability_score: 0.99,
    allowed_use: ["alert_trigger", "swap_candidate", "suitability_check"],
  };
}

export function makeEvidenceFromCio(signalId: string, detail: string): EvidenceItem {
  return {
    evidence_id: `ev-cio-${signalId}`,
    source_type: "cio_signal",
    source_id: signalId,
    snippet: detail,
    timestamp: new Date().toISOString(),
    reliability_score: 0.98,
    allowed_use: ["swap_candidate", "alert_trigger"],
  };
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export function appendAuditLog(entry: Omit<AuditLog, "audit_id" | "before_hash" | "after_hash" | "timestamp"> & { content: string; timestamp?: string }): AuditLog {
  ensureDir();
  const ledgerFile = path.join(LEDGER_DIR, "audit.jsonl");

  // Read last entry to get previous hash (hash chain)
  let beforeHash: string | null = null;
  if (fs.existsSync(ledgerFile)) {
    const lines = fs.readFileSync(ledgerFile, "utf8").trim().split("\n").filter(Boolean);
    if (lines.length > 0) {
      try {
        const last = JSON.parse(lines[lines.length - 1]) as AuditLog;
        beforeHash = last.after_hash;
      } catch { /* ignore */ }
    }
  }

  const afterHash = sha256(JSON.stringify(entry.content) + (beforeHash ?? "genesis"));
  const audit_id = `aud-${Date.now()}-${sha256(entry.object_id).slice(0, 6)}`;

  const log: AuditLog = {
    audit_id,
    actor_id: entry.actor_id,
    action: entry.action,
    object_type: entry.object_type,
    object_id: entry.object_id,
    before_hash: beforeHash,
    after_hash: afterHash,
    timestamp: new Date().toISOString(),
    evidence_ids: entry.evidence_ids,
    note: entry.note,
  };

  fs.appendFileSync(ledgerFile, JSON.stringify(log) + "\n", "utf8");
  return log;
}

export function getAuditTrail(objectType: string, objectId: string): AuditLog[] {
  ensureDir();
  const ledgerFile = path.join(LEDGER_DIR, "audit.jsonl");
  if (!fs.existsSync(ledgerFile)) return [];
  return fs.readFileSync(ledgerFile, "utf8")
    .trim().split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as AuditLog; } catch { return null; } })
    .filter((l): l is AuditLog => l !== null && l.object_type === objectType && l.object_id === objectId);
}

// ── Evidence store (in-memory for MVP, keyed by evidence_id) ─────────────────

const evidenceStore = new Map<string, EvidenceItem>();

export function storeEvidence(items: EvidenceItem[]): void {
  for (const item of items) evidenceStore.set(item.evidence_id, item);
}

export function getEvidence(ids: string[]): EvidenceItem[] {
  return ids.map((id) => evidenceStore.get(id)).filter((e): e is EvidenceItem => e !== null && e !== undefined);
}

export function getAllEvidence(): EvidenceItem[] {
  return Array.from(evidenceStore.values());
}
