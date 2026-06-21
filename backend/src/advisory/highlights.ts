import { PhoeniqsService } from "../services/phoeniqs.service";

export interface HighlightGroup {
  /** Canonical topic label shown nowhere — just for grouping */
  topic: string;
  /** Hex color to render for this group */
  color: string;
  /** Exact substrings (case-insensitive) to highlight in both texts */
  terms: string[];
}

const PALETTE = ["#b45309", "#0369a1", "#6d28d9", "#065f46", "#9f1239"];

/**
 * Ask the LLM to find semantically related keyword clusters shared across
 * the two texts, returning exact substrings to highlight and a color per cluster.
 */
export async function buildHighlights(
  whyNow: string,
  whyClient: string,
  phoeniqs: PhoeniqsService
): Promise<HighlightGroup[]> {
  const system = "You are a JSON-only API. Output only a raw JSON array, no prose, no markdown fences.";

  const user =
    `Find 2-3 shared semantic themes between Text A and Text B. ` +
    `For each theme output one JSON object with keys "topic" (1-2 word label) and "terms" (array of 1-3 single words that appear verbatim in the texts).\n` +
    `Output ONLY the JSON array. Example: [{"topic":"climate","terms":["deforestation","reforestation","rainforest"]}]\n\n` +
    `Text A: ${whyNow}\n` +
    `Text B: ${whyClient}\n\n` +
    `JSON:`;

  const raw = await phoeniqs.chat(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { temperature: 0.1, maxTokens: 800 }
  );

  console.log("[highlights] raw LLM response:", raw);

  // Extract the first [...] block — handles leading prose or markdown fences
  const cleaned = raw.replace(/```json|```/g, "");
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) {
    console.warn("[highlights] no JSON array found, returning empty");
    return [];
  }
  let parsed: { topic: string; terms: string[] }[];
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    console.warn("[highlights] JSON parse failed:", (e as Error).message, "raw:", match[0].slice(0, 200));
    return [];
  }

  return parsed.slice(0, PALETTE.length).map((g, i) => ({
    topic: g.topic,
    color: PALETTE[i],
    terms: g.terms.filter(Boolean),
  }));
}
