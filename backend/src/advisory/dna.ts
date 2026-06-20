import { PhoeniqsService } from "../services/phoeniqs.service";
import { cacheGet, cacheSet, getClient, getCrm } from "../data/loader";
import { ClientDna, CrmNote } from "../shared/types";

/**
 * Build a structured "client DNA" from the CRM notes via Phoeniqs.
 * Cached to disk (data/cache/dna-<id>.json) to conserve shared LLM credits.
 * The DNA is the personalisation substrate the alert matcher and draft writer read.
 */
export async function buildDna(clientId: string, phoeniqs: PhoeniqsService, force = false): Promise<ClientDna> {
  const cacheKey = `dna-${clientId}`;
  if (!force) {
    const cached = cacheGet<ClientDna>(cacheKey);
    if (cached) return cached;
  }

  const client = getClient(clientId);
  if (!client) throw new Error(`unknown client: ${clientId}`);
  const notes = getCrm(clientId);

  const transcript = notes
    .map((n: CrmNote) => `[${(n.date || "").slice(0, 10)} | ${n.medium} | ${n.contact}] ${n.note}`)
    .join("\n");

  const system =
    "You are a private-banking analyst building a structured client profile ('DNA') from a relationship " +
    "manager's CRM notes. Be faithful to the notes; do not invent facts. Respond with ONLY a single minified " +
    "JSON object, no prose or markdown.";

  const user =
    `Client: ${client.displayName} (mandate: ${client.mandate}).\n` +
    `CRM notes (chronological):\n${transcript}\n\n` +
    `Return JSON with exactly these keys:\n` +
    `{"values":[3-5 short value statements that should constrain their portfolio],` +
    `"context":[3-5 personal/financial context facts],` +
    `"preferences":[3-5 explicit investment preferences or aversions],` +
    `"commsStyle":"<one sentence: how this client likes to be communicated with>",` +
    `"toneProfile":"analytical|values-led|relationship-led",` +
    `"summary":"<=40 words capturing who they are and what matters to them"}`;

  const dna = await phoeniqs.chatJson<ClientDna>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.2, maxTokens: 700 }
  );

  // Defensive normalisation so the UI always has arrays.
  const safe: ClientDna = {
    values: Array.isArray(dna.values) ? dna.values : [],
    context: Array.isArray(dna.context) ? dna.context : [],
    preferences: Array.isArray(dna.preferences) ? dna.preferences : [],
    commsStyle: dna.commsStyle || "",
    toneProfile: (["analytical", "values-led", "relationship-led"].includes(dna.toneProfile)
      ? dna.toneProfile
      : "relationship-led") as ClientDna["toneProfile"],
    summary: dna.summary || "",
  };

  cacheSet(cacheKey, safe);
  return safe;
}
