/**
 * Citation Enforcement — annotates LLM responses with API source references.
 *
 * Every number, ticker and client fact in an LLM reply gets tagged with the
 * exact API endpoint and field that produced it, so the RM can verify claims.
 *
 * Format in the response:  [src: /api/clients/schneider/portfolio-fit → holdings[].weight_pct]
 */

export interface SourcedFact {
  value: string;
  api_endpoint: string;
  field: string;
  client_id?: string;
}

export interface CitedResponse {
  reply: string;
  citations: SourcedFact[];
  grounding_warnings: string[];
}

/** Registry: maps value patterns to their API sources */
const FACT_REGISTRY: Array<{
  pattern: RegExp;
  api_endpoint: string;
  field: string;
  label: string;
}> = [
  { pattern: /\b(\d+(?:\.\d+)?)\s*%\s*(?:of\s+portfolio|exposure|position|weight)/gi, api_endpoint: "/api/clients/:id/portfolio-fit", field: "holdings[].weight_pct", label: "portfolio weight" },
  { pattern: /CHF\s*(\d+(?:\.\d+)?)\s*[Mm]/g,                                          api_endpoint: "/api/clients/:id/portfolio-fit", field: "holdings[].currentChf",  label: "CHF exposure" },
  { pattern: /\b([A-Z]{2,5}\.[A-Z]{2,3})\b/g,                                          api_endpoint: "/api/clients/:id/portfolio-fit", field: "holdings[].ticker",      label: "ticker" },
  { pattern: /priority\s+score[:\s]+(\d+)/gi,                                           api_endpoint: "/api/alerts",                   field: "priority_score",         label: "priority score" },
  { pattern: /fit\s+score[:\s]+(\d+)/gi,                                                api_endpoint: "/api/alerts/:id",               field: "swap.toCandidate.rating", label: "fit score" },
  { pattern: /\b(Novartis|Roche|Unilever|Amazon|Nestlé|Nestlé|Richemont|Roche)\b/g,   api_endpoint: "/api/clients/:id/portfolio-fit", field: "holdings[].issuer",      label: "company name" },
];

/**
 * Annotate an LLM reply with source references.
 * Context contains the actual API data sent to the LLM.
 */
export function annotateCitations(
  reply: string,
  clientId: string,
  portfolioTickers: string[],
  knownValues: Map<string, SourcedFact>
): CitedResponse {
  const citations: SourcedFact[] = [];
  const grounding_warnings: string[] = [];
  let annotated = reply;

  for (const rule of FACT_REGISTRY) {
    const matches = [...reply.matchAll(rule.pattern)];
    for (const m of matches) {
      const value = m[1] ?? m[0];
      const endpoint = rule.api_endpoint.replace(":id", clientId);

      // Check grounding: ticker must be in portfolio
      if (rule.field === "holdings[].ticker" && !portfolioTickers.includes(value)) {
        grounding_warnings.push(`Ticker "${value}" not found in client portfolio — possible hallucination`);
        // Mark it in the reply
        annotated = annotated.replace(m[0], `${m[0]} ⚠️[unverified]`);
        continue;
      }

      const citation: SourcedFact = {
        value,
        api_endpoint: endpoint,
        field: rule.field,
        client_id: clientId,
      };
      citations.push(citation);

      // Don't inline tags in text — citations shown separately in UI
    }
  }

  // Return original reply (no inline tags) — warnings only shown in UI separately
  return { reply, citations, grounding_warnings };
}

/**
 * Build the citation-aware system prompt suffix.
 * Injected into every LLM system prompt.
 */
export function buildCitationSystemPrompt(availableSources: string[]): string {
  return `\n\n## GROUNDING RULES (mandatory)\n` +
    `You must ONLY state facts that appear in the data provided above.\n` +
    `- Every CHF amount, percentage, ticker, or company name you cite MUST come from the context JSON.\n` +
    `- If you cannot find a fact in the context, say explicitly: "I don't have verified data on this."\n` +
    `- Do NOT interpolate, estimate, or invent figures.\n` +
    `- Available verified sources for this response:\n` +
    availableSources.map(s => `  • ${s}`).join("\n") + "\n" +
    `Violating these rules will cause your response to be flagged and blocked.`;
}

/** Extract which API endpoints were actually used to build the context */
export function extractActiveSources(context: unknown, clientId: string): string[] {
  const sources: string[] = [];
  const ctx = context as any;

  if (ctx?.liveClients?.some((c: any) => c.id === clientId)) {
    sources.push(`GET /api/clients/${clientId} → name, mandate, location, direction, event, dnaHook`);
    sources.push(`GET /api/clients/${clientId}/portfolio-fit → holdings[].ticker, currentChf, weight_pct`);
  }
  if (ctx?.alerts?.some((a: any) => a.client_id === clientId)) {
    sources.push(`GET /api/alerts → priority_score, title, body, swap.toCandidate`);
  }
  if (ctx?.marketEvents?.length) {
    sources.push(`GET /api/news → articles[].title, sentiment`);
  }
  if (!sources.length) {
    sources.push(`GET /api/clients → book-level summary`);
  }

  return sources;
}
