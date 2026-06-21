// Typed client for the Agent Angelo API. Mirrors backend/src/shared/types.ts.

export type Mandate = "Defensive" | "Balanced" | "Growth";

export interface ClientSummary {
  id: string;
  name: string;
  displayName: string;
  mandate: Mandate;
  tagline: string;
  location: { city: string; country: string; lat: number; lng: number };
  direction: "conflict" | "opportunity";
  event: string;
  dnaHook: string;
  avatarUrl?: string;
}

export interface ClientDna {
  values: string[];
  context: string[];
  preferences: string[];
  commsStyle: string;
  toneProfile: "analytical" | "values-led" | "relationship-led";
  summary: string;
}

export interface Holding {
  assetClass: string;
  subAssetClass: string;
  region: string;
  industry: string;
  issuer: string;
  security: string;
  isin: string;
  targetChf: number;
  currentChf: number;
  valor: string;
  mic: string;
  yahoo: string;
}

export interface ReasonStep { label: string; detail: string; pass: boolean; }
export interface HoldingRef { issuer: string; isin: string; industry: string; currentChf: number; targetChf: number; driftPp: number; }
export interface LivePrice { symbol: string; name: string; currentPrice: number; currency: string; change: number; changePercent: number; timestamp: string; }
export interface CandidateRef { issuer: string; isin: string; industry: string; rating: string; cioView: string; valor: string; mic: string; livePrice?: LivePrice; }

export interface SwapProposal {
  fromHolding: HoldingRef | null;
  toCandidate: CandidateRef;
  sector: string;
  amountChf: number;
  reasonChain: ReasonStep[];
  rationale: string;
}

export interface NewsArticle {
  id: string; title: string; summary: string; url: string; source: string; publishedAt: string;
  sentiment?: { score: number; label: string };
}

export interface Alert {
  id: string;
  severity: "high" | "medium" | "info";
  direction: "conflict" | "opportunity";
  title: string;
  body: string;
  dnaValue: string;
  holding: HoldingRef | null;
  swap: SwapProposal | null;
  reasonChain: ReasonStep[];
  news: NewsArticle[];
}

export interface ClientDetail {
  client: ClientSummary & { rm: string; scenario: { dnaHook: string; affectedSector: string } };
  dna: ClientDna;
  dnaAvailable: boolean;
  holdings: Holding[];
  portfolioValueChf: number;
  alerts: Alert[];
  generatedAt: string;
}

export interface HighlightGroup { topic: string; color: string; terms: string[]; }

export interface DraftMessage { subject: string; body: string; tone: string; }

export interface IntegrationProbe {
  name: string; configured: boolean; ok: boolean; durationMs: number; error?: string;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `request failed: ${url}`);
  return json.data as T;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `request failed: ${url}`);
  return json.data as T;
}

export const api = {
  clients: () => get<ClientSummary[]>("/api/clients"),
  client: (id: string) => get<ClientDetail>(`/api/clients/${id}`),
  draft: (id: string, alertId?: string) => post<DraftMessage>(`/api/clients/${id}/draft`, { alertId }),
  twinChat: (id: string, messages: { role: string; content: string }[]) =>
    post<{ reply: string }>(`/api/twin/${id}/chat`, { messages }),
  highlights: (id: string) => get<{ groups: HighlightGroup[] }>(`/api/clients/${id}/highlights`),
  integrations: () => get<{ probes: IntegrationProbe[] }>("/api/integrations"),
};

export function chf(n: number): string {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);
}
