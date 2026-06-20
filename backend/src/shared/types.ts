// ---- Live-integration probe (reused from the reference demo) ----------------
export interface IntegrationProbe {
  name: string;
  configured: boolean;
  ok: boolean;
  durationMs: number;
  request: { method: string; url: string; headers?: Record<string, string>; body?: unknown };
  response?: { status?: number; body: string };
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: SentimentAnalysis;
}

export interface SentimentAnalysis {
  score: number;
  magnitude: number;
  label: "BEARISH" | "NEUTRAL" | "BULLISH";
  confidence: number;
}

export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  change: number;
  changePercent: number;
  timestamp: string;
}

// ---- Dataset (parsed from the provided xlsx seeds) --------------------------
export type Mandate = "Defensive" | "Balanced" | "Growth";

export interface CrmNote {
  date: string | null;
  medium: string | null;
  rm: string | null;
  contact: string | null;
  note: string;
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

export interface CioEntry {
  rating: "BUY" | "HOLD" | "SELL" | string;
  ratingSince: string | null;
  assetClass: string;
  subAssetClass: string;
  region: string;
  industry: string;
  issuer: string;
  security: string;
  isin: string;
  cioView: string;
  valor: string;
  mic: string;
  yahoo: string;
  asOf: string | null;
}

export interface Scenario {
  direction: "conflict" | "opportunity";
  affectedSector: string;
  affectedIssuer: string | null;
  event: string;
  dnaHook: string;
}

export interface Client {
  id: string;
  name: string;
  displayName: string;
  mandate: Mandate;
  portfolio: string; // seed key: defensive | balanced | growth
  tagline: string;
  location: { city: string; country: string; lat: number; lng: number };
  rm: string;
  avatarUrl?: string;
  scenario: Scenario;
}

// ---- Advisory engine output -------------------------------------------------
export interface ClientDna {
  values: string[];
  context: string[];
  preferences: string[];
  commsStyle: string;
  /** "analytical" | "values-led" — drives draft tone. */
  toneProfile: "analytical" | "values-led" | "relationship-led";
  summary: string;
}

/** One auditable check in the reasoning chain (the "trust" surface). */
export interface ReasonStep {
  label: string;
  detail: string;
  pass: boolean;
}

export interface SwapProposal {
  /** null for add-only opportunities funded from cash / overweight elsewhere. */
  fromHolding: HoldingRef | null;
  toCandidate: CandidateRef;
  sector: string;
  amountChf: number;
  reasonChain: ReasonStep[];
  rationale: string; // one-line human summary
}

export interface HoldingRef {
  issuer: string;
  isin: string;
  industry: string;
  currentChf: number;
  targetChf: number;
  driftPp: number;
}

export interface CandidateRef {
  issuer: string;
  isin: string;
  industry: string;
  rating: string;
  cioView: string;
  valor: string;
  mic: string;
  livePrice?: StockData;
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
  /** Audit trail for why this was flagged (the trust surface). */
  reasonChain: ReasonStep[];
  news: NewsArticle[];
}

export interface ClientDetail {
  client: Client;
  dna: ClientDna;
  /** false when Phoeniqs is not configured — DNA is a deterministic stub. */
  dnaAvailable: boolean;
  holdings: Holding[];
  portfolioValueChf: number;
  alerts: Alert[];
  generatedAt: string;
}

export interface DraftMessage {
  subject: string;
  body: string;
  tone: string;
}
