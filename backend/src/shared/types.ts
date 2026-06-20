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
  portfolio: string;
  tagline: string;
  location: { city: string; country: string; lat: number; lng: number };
  rm: string;
  avatarUrl?: string;
  scenario: Scenario;
}

// ---- Evidence & Audit (Section 14) -----------------------------------------
export type EvidenceSourceType = "crm_note" | "portfolio_holding" | "cio_signal" | "news_event" | "policy_rule";
export type EvidenceAllowedUse = "dna_extraction" | "alert_trigger" | "swap_candidate" | "message_draft" | "suitability_check";

export interface EvidenceItem {
  evidence_id: string;
  source_type: EvidenceSourceType;
  source_id: string;       // note_id, holding isin, signal_id, etc.
  snippet: string;         // short excerpt shown in UI
  timestamp: string;
  reliability_score: number; // 0-1
  allowed_use: EvidenceAllowedUse[];
}

export interface AuditLog {
  audit_id: string;
  actor_id: string;        // rm_id or "system"
  action: string;          // "DNA_EXTRACTED" | "ALERT_CREATED" | "DRAFT_APPROVED" | ...
  object_type: string;
  object_id: string;
  before_hash: string | null;
  after_hash: string;
  timestamp: string;
  evidence_ids: string[];
  note?: string;
}

export interface ApprovalEvent {
  approval_id: string;
  object_id: string;
  object_type: "recommendation" | "message_draft";
  rm_id: string;
  action: "APPROVED" | "REJECTED" | "EDITED" | "REQUESTED_CHANGES";
  timestamp: string;
  edits_summary?: string;
  final_text_hash: string;
}

// ---- DNA Attributes (richer than the simple array format) ------------------
export type DnaSignalType = "explicit" | "repeated_pattern" | "inferred" | "missing";
export type DnaCategory = "values" | "goals" | "business_context" | "family_context" | "preferences" | "sensitivities" | "communication_style" | "relationship_memory";

export interface DnaAttribute {
  attribute_id: string;
  client_id: string;
  category: DnaCategory;
  value: string;
  confidence: number;      // 0-1
  signal_type: DnaSignalType;
  evidence_ids: string[];
  last_updated: string;
}

export interface DnaGap {
  category: DnaCategory;
  description: string;
  rm_question: string;     // suggested question for next meeting
}

// ---- Client DNA (extended) --------------------------------------------------
export interface ClientDna {
  values: string[];
  context: string[];
  preferences: string[];
  commsStyle: string;
  toneProfile: "analytical" | "values-led" | "relationship-led";
  summary: string;
  // Extended fields (populated when dnaAvailable=true and deep=true)
  gaps?: DnaGap[];
  attributes?: DnaAttribute[];
}

// ---- Memory Card (FR-004) ---------------------------------------------------
export interface MemoryCard {
  client_id: string;
  display_name: string;
  mandate: Mandate;
  rm: string;
  // What matters most
  top_values: string[];
  personal_context: string;
  communication_style: string;
  // Relationship signals
  previous_objections: string[];
  open_promises: string[];
  sensitive_topics: string[];
  // DNA gaps
  gaps: DnaGap[];
  // Scores
  relationship_opportunity_score: number;
  generated_at: string;
  evidence_ids: string[];
}

// ---- Scoring (Section 7.1) --------------------------------------------------
export interface ClientScores {
  client_concern_score: number;    // 0-100 — likelihood client will care/reach out
  alert_priority_score: number;    // 0-100 — ranks dashboard
  actionability_score: number;     // 0-100 — can we propose a concrete action?
  relationship_opportunity_score: number; // 0-100 — deepen relationship
}

// ---- Action eligibility status (Section 7) ----------------------------------
export type ActionEligibilityStatus = "Actionable" | "Warning" | "RM_Review" | "Blocked" | "DNA_Gap";

// ---- Four-Question Action Card (FR-009, Section 11) ------------------------
export interface FourQuestionCard {
  why_now: { summary: string; evidence_ids: string[] };
  why_this_client: { summary: string; evidence_ids: string[] };
  why_this_action: { summary: string; recommendation_id?: string };
  how_to_say_it: { style: string; message_id?: string };
  predicted_client_question: string;
  evidence_trail_url: string;
}

// ---- Suitability guardrail result ------------------------------------------
export interface GuardrailResult {
  rule: string;
  status: "PASS" | "WARNING" | "BLOCKED";
  detail: string;
}

// ---- Advisory engine output ------------------------------------------------
export interface ReasonStep {
  label: string;
  detail: string;
  pass: boolean;
}

export interface SwapProposal {
  fromHolding: HoldingRef | null;
  toCandidate: CandidateRef;
  sector: string;
  amountChf: number;
  reasonChain: ReasonStep[];
  rationale: string;
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

// ---- Alert (extended with Section 11 fields) --------------------------------
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
  // New: Four-Question Action Card
  action_card?: FourQuestionCard;
  // New: scores
  priority_score?: number;
  concern_score?: number;
  action_status?: ActionEligibilityStatus;
  guardrails?: GuardrailResult[];
  evidence_ids?: string[];
}

// ---- Recommendation (Section 11) -------------------------------------------
export type RecommendationActionType = "HOLD_WITH_EXPLANATION" | "WATCH" | "SWAP" | "REBALANCE" | "CALL_CLIENT";

export interface Recommendation {
  recommendation_id: string;
  alert_id: string;
  action_type: RecommendationActionType;
  current_holding: HoldingRef | null;
  candidate: CandidateRef | null;
  suitability_status: "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED";
  guardrails: GuardrailResult[];
  asset_fit_score: number;
  client_dna_alignment: { attribute: string; confidence: number }[];
  rm_required_action: string;
  evidence_ids: string[];
  action_card?: FourQuestionCard;
  approved?: ApprovalEvent;
}

// ---- Message Draft (extended) -----------------------------------------------
export interface MessageDraft {
  message_id: string;
  recommendation_id: string;
  style_tag: string;
  subject: string;
  opening: string;
  situation: string;
  recommendation_text: string;
  next_step: string;
  approval_status: "DRAFT" | "APPROVED" | "REJECTED";
  evidence_ids: string[];
  disclaimer: string;
}

// Legacy alias
export interface DraftMessage {
  subject: string;
  body: string;
  tone: string;
}

// ---- Advisor Action Pack (FR-013) -------------------------------------------
export interface AdvisorActionPack {
  recommendation_id: string;
  meeting_prep: {
    last_interaction: string;
    open_promises: string[];
    portfolio_changes: string[];
    relevant_alerts: string[];
    likely_questions: string[];
  };
  presentation_outline: string[];
  follow_up_draft: string;
  admin_documentation: {
    client_need: string;
    recommendation_basis: string;
    suitability_status: string;
    rm_approval_summary: string;
    final_output_hash: string;
  };
  evidence_ids: string[];
}

// ---- Portfolio fit (FR-006) -------------------------------------------------
export interface HoldingWithFit extends Holding {
  weightPct: number;
  targetWeightPct: number;
  driftPp: number;
  materiality: "concentrated" | "high" | "actionable" | "watch" | "low";
  suitabilityFlags: string[];
}

export interface PortfolioFit {
  client_id: string;
  holdings: HoldingWithFit[];
  portfolio_value_chf: number;
  mandate_drift_pp: number;
  concentration_flags: string[];
  sector_exposure: Record<string, number>;
  generated_at: string;
}

// ---- Client Detail (extended) -----------------------------------------------
export interface ClientDetail {
  client: Client;
  dna: ClientDna;
  dnaAvailable: boolean;
  holdings: Holding[];
  portfolioValueChf: number;
  alerts: Alert[];
  scores?: ClientScores;
  generatedAt: string;
}
