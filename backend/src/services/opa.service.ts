/**
 * OPA (Open Policy Agent) service — Policy Decision Point.
 *
 * Runs OPA as a child process (eval mode) — no separate server needed.
 * Each call is ~5-15ms. For higher throughput, switch to OPA server mode.
 */
import { spawn } from "child_process";
import path from "path";

const POLICY_DIR = path.join(__dirname, "..", "..", "opa", "policies");
const DATA_FILE = path.join(__dirname, "..", "..", "opa", "data", "policy.json");

function runOpa(args: string[], stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("opa", args);
    let out = ""; let err = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { err += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(err || `opa exited ${code}`));
      else resolve(out);
    });
    proc.stdin.write(stdin);
    proc.stdin.end();
  });
}

export interface OpaInput {
  action: "recommend" | "rebalance" | "draft" | "copilot" | "twin";
  client: {
    id: string;
    risk_score: number;
    mandate: "Defensive" | "Balanced" | "Growth";
    sanctioned: boolean;
    pep: boolean;
    tax_domicile: string;
    aum_chf_m: number;
  };
  product?: {
    risk_score: number;
    category: string;
  };
  resulting_position_pct?: number;
  context: {
    portfolio_tickers: string[];
    data_age_days: number;
  };
  claimed_tickers: string[];
  citations: Citation[];
}

export interface Citation {
  api_endpoint: string;
  field: string;
  value: string;
  client_id?: string;
}

export interface OpaDecision {
  allow: boolean;
  reasons: string[];
  obligations: string[];
  citation_required: boolean;
}

export async function evaluate(input: OpaInput): Promise<OpaDecision> {
  const inputJson = JSON.stringify(input);

  try {
    const stdout = await runOpa([
      "eval",
      "--data", POLICY_DIR,
      "--data", DATA_FILE,
      "--stdin-input",
      "--format", "json",
      "data.advisory.authz",
    ], inputJson);

    const parsed = JSON.parse(stdout);
    const result = parsed.result?.[0]?.expressions?.[0]?.value ?? {};

    return {
      allow: result.allow ?? false,
      reasons: result.reasons ?? [],
      obligations: result.obligations ?? [],
      citation_required: result.citation_required ?? true,
    };
  } catch (err) {
    // Fail closed — any OPA error = deny
    console.error("[OPA] evaluation failed, failing closed:", err);
    return {
      allow: false,
      reasons: ["OPA_ERROR: policy evaluation failed — failing closed"],
      obligations: [],
      citation_required: true,
    };
  }
}

/** Build OPA input from a client object + portfolio data */
export function buildOpaInput(params: {
  action: OpaInput["action"];
  clientId: string;
  riskScore?: number;
  mandate?: string;
  aumChfM?: number;
  taxDomicile?: string;
  portfolioTickers?: string[];
  claimedTickers?: string[];
  citations?: Citation[];
  productRisk?: number;
  productCategory?: string;
  resultingPositionPct?: number;
  dataAgeDays?: number;
}): OpaInput {
  return {
    action: params.action,
    client: {
      id: params.clientId,
      risk_score: params.riskScore ?? 5,
      mandate: (params.mandate ?? "Balanced") as OpaInput["client"]["mandate"],
      sanctioned: false,
      pep: false,
      tax_domicile: params.taxDomicile ?? "CH",
      aum_chf_m: params.aumChfM ?? 2.0,
    },
    product: params.productRisk !== undefined ? {
      risk_score: params.productRisk,
      category: params.productCategory ?? "Equity",
    } : undefined,
    resulting_position_pct: params.resultingPositionPct,
    context: {
      portfolio_tickers: params.portfolioTickers ?? [],
      data_age_days: params.dataAgeDays ?? 0,
    },
    claimed_tickers: params.claimedTickers ?? [],
    citations: params.citations ?? [],
  };
}

/** Extract tickers mentioned in an LLM response */
export function extractClaimedTickers(text: string): string[] {
  // Match common SIX/Bloomberg ticker patterns: NOVN.SW, ROG.SW, AAPL, MSFT.US etc.
  const matches = text.match(/\b[A-Z]{2,5}(?:\.[A-Z]{2,3})?\b/g) ?? [];
  // Filter out common English words that look like tickers
  const stopwords = new Set(["CEO", "CIO", "AUM", "CHF", "USD", "EUR", "GBP", "ESG", "PEP", "EDD", "DNA", "CRM", "TAA", "BUY", "SELL", "HOLD"]);
  return [...new Set(matches.filter(m => !stopwords.has(m)))];
}

/** Build citations from the API context we already sent to the LLM */
export function buildCitationsFromContext(context: Record<string, unknown>, clientId: string): Citation[] {
  const citations: Citation[] = [];

  const holdings = (context as any)?.liveClients?.find((c: any) => c.id === clientId)?.holdings ?? [];
  for (const h of holdings) {
    if (h.currentChf) citations.push({ api_endpoint: `/api/clients/${clientId}/portfolio-fit`, field: "holdings[].currentChf", value: String(h.currentChf), client_id: clientId });
    if (h.ticker)     citations.push({ api_endpoint: `/api/clients/${clientId}/portfolio-fit`, field: "holdings[].ticker",     value: h.ticker, client_id: clientId });
  }

  const alerts = (context as any)?.alerts ?? [];
  for (const a of alerts) {
    if (a.client_id === clientId && a.title) {
      citations.push({ api_endpoint: `/api/alerts/${a.id}`, field: "title", value: a.title, client_id: clientId });
    }
  }

  return citations;
}
