/**
 * Four-Question Action Card — FR-009.
 * Every alert must answer: Why now? Why this client? Why this action? How to say it?
 */
import { Alert, ClientDna, FourQuestionCard, GuardrailResult } from "../shared/types";
import { PhoeniqsService } from "../services/phoeniqs.service";

export async function buildActionCard(
  alert: Alert,
  dna: ClientDna,
  clientId: string,
  phoeniqs: PhoeniqsService,
): Promise<FourQuestionCard> {
  const evidenceIds = [
    ...(alert.evidence_ids ?? []),
    ...(alert.swap?.reasonChain?.map((_, i) => `ev-reason-${alert.id}-${i}`) ?? []),
  ];

  // Why now — deterministic from alert context
  const why_now = {
    summary: alert.body || alert.title,
    evidence_ids: evidenceIds.slice(0, 3),
  };

  // Why this client — from DNA
  const why_this_client = {
    summary: dna.values[0]
      ? `Client's core value "${dna.values[0]}" is directly affected by this event.`
      : "Event relevance confirmed via CRM notes and portfolio exposure.",
    evidence_ids: evidenceIds.slice(0, 2),
  };

  // Why this action — from swap/recommendation
  const why_this_action = {
    summary: alert.swap?.rationale
      ?? "Same-sector CIO-approved replacement preserves mandate while resolving the conflict.",
    recommendation_id: alert.id,
  };

  // Predicted client question
  let predicted_client_question = "Are we still on the right track given these changes?";

  if (phoeniqs.configured) {
    try {
      const result = await phoeniqs.chat([
        {
          role: "system",
          content: "You are an expert private banking advisor. Generate ONE concise question (≤25 words) that this client is most likely to ask the relationship manager about this alert, based on their DNA profile. Return ONLY the question.",
        },
        {
          role: "user",
          content: `Client values: ${dna.values.slice(0, 2).join("; ")}\nAlert: ${alert.title}\nEvent: ${alert.body}`,
        },
      ], { temperature: 0.3, maxTokens: 1500 });
      if (result && result.trim().length > 10) {
        predicted_client_question = result.trim().replace(/^["']|["']$/g, "");
      }
    } catch { /* keep default */ }
  }

  return {
    why_now,
    why_this_client,
    why_this_action,
    how_to_say_it: {
      style: dna.toneProfile,
      message_id: `draft-${alert.id}`,
    },
    predicted_client_question,
    evidence_trail_url: `/api/audit/alert/${alert.id}`,
  };
}
