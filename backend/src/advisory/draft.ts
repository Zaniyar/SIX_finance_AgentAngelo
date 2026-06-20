import { PhoeniqsService } from "../services/phoeniqs.service";
import { Alert, Client, ClientDna, DraftMessage } from "../shared/types";

/**
 * Draft the RM's client-facing message. The LLM only writes language — the
 * recommendation itself comes from the deterministic matcher. Tone is matched
 * to the client's DNA comms style (the personalisation requirement).
 */
export async function draftMessage(
  client: Client,
  dna: ClientDna,
  alert: Alert,
  phoeniqs: PhoeniqsService
): Promise<DraftMessage> {
  const swap = alert.swap;
  const recommendation = swap
    ? swap.fromHolding
      ? `Swap out ${swap.fromHolding.issuer} and reinvest in ${swap.toCandidate.issuer} (same sector, CIO ${swap.toCandidate.rating}).`
      : `Add a position in ${swap.toCandidate.issuer} (CIO ${swap.toCandidate.rating}).`
    : alert.reasonChain.map((r) => r.detail).join(" ");

  const toneGuide: Record<ClientDna["toneProfile"], string> = {
    analytical: "Lead with the data and the rationale; concise, precise, numbers-first.",
    "values-led": "Lead with their values and what matters to them; warm but substantive, connect the action to their purpose.",
    "relationship-led": "Warm and personal; acknowledge the relationship, then explain the action plainly.",
  };

  const system =
    "You are a Swiss private-banking relationship manager drafting a short, personal message to a client. " +
    "You NEVER place trades or give the client direct instructions to act — you propose, explain, and invite a " +
    'conversation; the client decides. Output ONLY this JSON (no reasoning, no markdown): {"subject":"...","body":"...","tone":"..."}';


  const user =
    `Client: ${client.displayName}. Mandate: ${client.mandate} (fixed).\n` +
    `Client DNA summary: ${dna.summary}\n` +
    `Comms style: ${dna.commsStyle}\n` +
    `Tone to use (${dna.toneProfile}): ${toneGuide[dna.toneProfile]}\n\n` +
    `Situation: ${alert.body}\n` +
    `Why it matters to them: ${alert.reasonChain.map((r) => r.detail).join(" ")}\n` +
    `Recommended action (already validated, do not change): ${recommendation}\n\n` +
    `Write a message (120-160 words) that: references the event, connects it to their values, explains the ` +
    `proposed action and why it stays within their mandate, and invites them to discuss. Sign as their RM ${client.rm}.\n` +
    `Return JSON: {"subject":"<short>","body":"<message>","tone":"<one-word tone>"}`;

  const draft = await phoeniqs.chatJson<DraftMessage>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.5, maxTokens: 2500 }
  );

  return {
    subject: draft.subject || `Regarding your ${client.mandate} portfolio`,
    body: draft.body || "",
    tone: draft.tone || dna.toneProfile,
  };
}
