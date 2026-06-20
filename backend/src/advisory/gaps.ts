/**
 * DNA Gap Finder — FR-005.
 * Detects missing or weak knowledge areas in client DNA and generates
 * RM-friendly questions to ask in the next meeting.
 */
import { PhoeniqsService } from "../services/phoeniqs.service";
import { ClientDna, DnaGap, DnaCategory } from "../shared/types";

/** Known important categories every client profile should cover. */
const REQUIRED_CATEGORIES: Array<{ category: DnaCategory; keywords: string[]; fallbackQuestion: string }> = [
  {
    category: "preferences",
    keywords: ["sustainability", "esg", "impact", "green", "environment", "social"],
    fallbackQuestion: "Does sustainability or ESG play a role in your investment decisions?",
  },
  {
    category: "preferences",
    keywords: ["liquidity", "cash", "liquid", "horizon", "term"],
    fallbackQuestion: "Do you anticipate any significant liquidity needs in the next 12–24 months?",
  },
  {
    category: "preferences",
    keywords: ["sector", "exclusion", "avoid", "exclude", "no", "never"],
    fallbackQuestion: "Are there any sectors or companies you would like to avoid for personal or ethical reasons?",
  },
  {
    category: "goals",
    keywords: ["inheritance", "estate", "next generation", "succession", "heirs", "children", "philanthropy"],
    fallbackQuestion: "Have you thought about estate planning or wealth transfer to the next generation?",
  },
  {
    category: "business_context",
    keywords: ["business", "company", "corporate", "entrepreneurial", "ownership", "equity"],
    fallbackQuestion: "Are there connections between your business activities and your investment portfolio we should be aware of?",
  },
  {
    category: "sensitivities",
    keywords: ["sensitive", "confidential", "private", "personal", "family", "health"],
    fallbackQuestion: "Are there personal or family circumstances that might affect your financial planning priorities?",
  },
];

function hasKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/**
 * Deterministic gap detection: check which important topics are absent from DNA.
 */
export function detectGapsFromDna(dna: ClientDna): DnaGap[] {
  const allText = [
    ...dna.values,
    ...dna.context,
    ...dna.preferences,
    dna.commsStyle,
    dna.summary,
  ].join(" ");

  const gaps: DnaGap[] = [];

  for (const req of REQUIRED_CATEGORIES) {
    if (!hasKeywords(allText, req.keywords)) {
      gaps.push({
        category: req.category,
        description: `No mention of ${req.keywords.slice(0, 3).join("/")} in client profile.`,
        rm_question: req.fallbackQuestion,
      });
    }
  }

  // Also flag if preferences list is very short
  if (dna.preferences.length < 2) {
    gaps.push({
      category: "preferences",
      description: "Client investment preferences are underspecified — only one or fewer recorded.",
      rm_question: "Can you tell me more about what you look for in your investments beyond what we've discussed so far?",
    });
  }

  return gaps;
}

/**
 * LLM-enhanced gap detection: ask Phoeniqs to identify what's missing.
 * Falls back to deterministic version if LLM unavailable.
 */
export async function buildDnaGaps(
  clientId: string,
  dna: ClientDna,
  phoeniqs: PhoeniqsService,
): Promise<DnaGap[]> {
  // Always run deterministic baseline
  const deterministicGaps = detectGapsFromDna(dna);

  if (!phoeniqs.configured) return deterministicGaps;

  try {
    const system =
      "You are a private banking expert reviewing a client DNA profile. " +
      "Identify knowledge gaps — important wealth-management topics that are missing or weak. " +
      "Return ONLY a JSON array of gap objects. Each object must have: " +
      '{"category":"string","description":"string","rm_question":"string"}. ' +
      "Limit to 4 most important gaps. Be concise.";

    const user =
      `Client DNA summary: ${dna.summary}\n` +
      `Values: ${dna.values.join("; ")}\n` +
      `Preferences: ${dna.preferences.join("; ")}\n` +
      `Context: ${dna.context.join("; ")}\n\n` +
      "What crucial wealth-planning topics are missing from this profile?";

    const llmGaps = await phoeniqs.chatJson<DnaGap[]>(
      [{ role: "system", content: system }, { role: "user", content: user }],
      { temperature: 0.2, maxTokens: 2000 }
    );

    if (Array.isArray(llmGaps) && llmGaps.length > 0) {
      // Merge: LLM gaps first, then add any deterministic gaps not already covered
      const covered = llmGaps.map((g) => g.rm_question.toLowerCase());
      const extra = deterministicGaps.filter(
        (g) => !covered.some((c) => c.includes(g.category))
      );
      return [...llmGaps.slice(0, 4), ...extra.slice(0, 2)];
    }
  } catch {
    // Fall back to deterministic
  }

  return deterministicGaps;
}
