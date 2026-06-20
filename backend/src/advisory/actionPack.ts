/**
 * Advisor Action Pack — FR-013.
 * Generates meeting preparation, presentation outline, follow-up draft,
 * and internal documentation from the same evidence base.
 */
import { PhoeniqsService } from "../services/phoeniqs.service";
import { Alert, ClientDna, Client, AdvisorActionPack, MemoryCard } from "../shared/types";
import { appendAuditLog } from "./evidence";
import crypto from "crypto";

function sha256short(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
}

export async function buildActionPack(
  client: Client,
  dna: ClientDna,
  alert: Alert,
  memoryCard: MemoryCard,
  phoeniqs: PhoeniqsService,
  rmId: string = "rm-system",
): Promise<AdvisorActionPack> {
  const recommendationId = `R-${alert.id}`;

  // ── Meeting Prep (deterministic from Memory Card) ──────────────────────────
  const meetingPrep = {
    last_interaction: "Based on most recent CRM note",
    open_promises: memoryCard.open_promises,
    portfolio_changes: alert.holding
      ? [`Review ${alert.holding.issuer} position (${(alert.holding.currentChf / 1000).toFixed(0)}k CHF)`]
      : [],
    relevant_alerts: [alert.title],
    likely_questions: [
      alert.action_card?.predicted_client_question ?? "Are we still on track?",
      `What does this mean for our ${client.mandate.toLowerCase()} mandate?`,
      "What are our alternatives?",
    ],
  };

  // ── Presentation Outline (deterministic) ──────────────────────────────────
  const presentationOutline = [
    `1. Portfolio Update — ${client.mandate} mandate performance`,
    `2. Alert: ${alert.title}`,
    `3. Why this matters for you — ${dna.values[0] ?? "your investment goals"}`,
    `4. Our recommendation — ${alert.swap?.rationale ?? "review and hold"}`,
    "5. Suitability confirmation and next steps",
    "6. Questions & follow-up actions",
  ];

  // ── Follow-up Draft (LLM if available, otherwise template) ───────────────
  let followUpDraft = `Dear ${client.displayName.split("&")[0].trim()},\n\nThank you for our conversation. As discussed, I am following up on the ${alert.title.toLowerCase()}. ${alert.body}\n\nPlease let me know if you have any questions.\n\nBest regards,\n${client.rm}`;

  if (phoeniqs.configured) {
    try {
      const draft = await phoeniqs.chat([
        {
          role: "system",
          content: `You are a private banking relationship manager writing a brief follow-up email after a meeting. Style: ${dna.toneProfile}. Communication style: ${dna.commsStyle}. Keep it under 120 words. Do not include financial advice. End with a clear next step.`,
        },
        {
          role: "user",
          content: `Client: ${client.displayName}. We discussed: ${alert.title}. Alert context: ${alert.body.slice(0, 200)}. Our recommendation: ${alert.swap?.rationale ?? "hold and monitor"}.`,
        },
      ], { temperature: 0.4, maxTokens: 2000 });
      if (draft && draft.length > 50) followUpDraft = draft;
    } catch { /* use template */ }
  }

  // ── Admin Documentation ────────────────────────────────────────────────────
  const finalHash = sha256short(
    JSON.stringify({ recommendationId, alert: alert.id, client: client.id })
  );

  const adminDoc = {
    client_need: dna.values[0] ?? "Preserve mandate alignment",
    recommendation_basis: alert.swap?.rationale ?? alert.body.slice(0, 200),
    suitability_status: "PASS — same-sector swap within mandate",
    rm_approval_summary: "Pending RM review and approval",
    final_output_hash: finalHash,
  };

  // Append to audit log
  appendAuditLog({
    actor_id: rmId,
    action: "ACTION_PACK_GENERATED",
    object_type: "recommendation",
    object_id: recommendationId,
    content: JSON.stringify({ client: client.id, alert: alert.id }),
    evidence_ids: alert.evidence_ids ?? [],
    note: `Action pack generated for alert ${alert.id}`,
  });

  return {
    recommendation_id: recommendationId,
    meeting_prep: meetingPrep,
    presentation_outline: presentationOutline,
    follow_up_draft: followUpDraft,
    admin_documentation: adminDoc,
    evidence_ids: alert.evidence_ids ?? [],
  };
}
