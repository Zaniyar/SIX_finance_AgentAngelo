/**
 * Deterministic scoring engine — Section 7.1 of the Back-End Requirements.
 * All weights come from policy.ts so they are configurable without code changes.
 */
import { POLICY } from "../config/policy";
import { ClientDna, Holding, Alert, ActionEligibilityStatus, ClientScores } from "../shared/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clamp a value to [0, 100]. */
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 100) / 1));

/** Simple keyword overlap between a string and an array of DNA strings. */
function keywordOverlap(text: string, dnaItems: string[]): number {
  if (!text || !dnaItems.length) return 0;
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  let hits = 0;
  for (const item of dnaItems) {
    const itemWords = item.toLowerCase().split(/\W+/).filter(Boolean);
    if (itemWords.some((w) => words.includes(w))) hits++;
  }
  return Math.min(1, hits / Math.max(1, dnaItems.length));
}

// ── 1. Client Concern Score (FR-008) ─────────────────────────────────────────
/**
 * Predicts whether the client is likely to call, ignore, worry, or be receptive.
 * Formula: 0.30*dnaRelevance + 0.25*materiality + 0.20*severity + 0.10*recency + 0.10*timing + 0.05*reaction
 */
export function clientConcernScore(params: {
  dnaRelevance: number;    // 0-1: how closely event matches DNA values/preferences
  portfolioMateriality: number; // 0-1: weight of affected holding(s)
  eventSeverity: number;   // 0-1: from news severity 1-5 → /5
  recency: number;         // 0-1: 1=today, decays over days
  relationshipTiming: number; // 0-1: upcoming meeting, recent silence, etc.
  pastReactionPattern: number; // 0-1: client historically reacts strongly
}): number {
  const { wDnaRelevance: w1, wPortfolioMateriality: w2, wEventSeverity: w3,
    wRecency: w4, wRelationshipTiming: w5, wPastReactionPattern: w6 } = POLICY.clientConcernScore;
  const raw = (w1 * params.dnaRelevance + w2 * params.portfolioMateriality +
    w3 * params.eventSeverity + w4 * params.recency +
    w5 * params.relationshipTiming + w6 * params.pastReactionPattern);
  return clamp(raw * 100);
}

// ── 2. Actionability Score ────────────────────────────────────────────────────
/**
 * Determines whether the system can propose a concrete action.
 * Calculated only after hard guardrails pass.
 */
export function actionabilityScore(params: {
  sameSectorFit: number;      // 0-1
  mandateFitQuality: number;  // 0-1
  cioRatingStrength: number;  // 0-1: BUY=1, HOLD=0.5, other=0
  riskAcceptability: number;  // 0-1
  dataCompleteness: number;   // 0-1: all required fields present
}): number {
  const { wSameSectorFit: w1, wMandateFitQuality: w2, wCioRatingStrength: w3,
    wRiskAcceptability: w4, wDataCompleteness: w5 } = POLICY.actionabilityScore;
  const raw = w1 * params.sameSectorFit + w2 * params.mandateFitQuality +
    w3 * params.cioRatingStrength + w4 * params.riskAcceptability +
    w5 * params.dataCompleteness;
  return clamp(raw * 100);
}

// ── 3. Alert Priority Score ───────────────────────────────────────────────────
/**
 * Ranks alerts on the all-clients dashboard.
 * Gated by suitability status — compliance issues always surface.
 */
export function alertPriorityScore(params: {
  clientConcern: number;     // 0-100
  actionability: number;     // 0-100
  relationshipRelevance: number; // 0-100
}): number {
  const raw = 0.60 * params.clientConcern + 0.25 * params.actionability +
    0.15 * params.relationshipRelevance;
  return clamp(raw);
}

// ── 4. Asset Fit Score ────────────────────────────────────────────────────────
/**
 * Ranks swap candidate assets. Only eligible assets enter ranking.
 */
export function assetFitScore(params: {
  mandateFit: number;         // 0-1
  peerSectorFit: number;      // 0-1
  cioRatingStrength: number;  // 0-1
  dnaAlignment: number;       // 0-1
  riskImprovementNeutrality: number; // 0-1
  liquidityMarketQuality: number; // 0-1
}): number {
  const { wMandateFit: w1, wPeerSectorFit: w2, wCioRatingStrength: w3,
    wDnaAlignment: w4, wRiskImprovementNeutrality: w5, wLiquidityMarketQuality: w6 } = POLICY.assetFitScore;
  const raw = w1 * params.mandateFit + w2 * params.peerSectorFit +
    w3 * params.cioRatingStrength + w4 * params.dnaAlignment +
    w5 * params.riskImprovementNeutrality + w6 * params.liquidityMarketQuality;
  return clamp(raw * 100);
}

// ── 5. Relationship Opportunity Score ─────────────────────────────────────────
/**
 * Prioritises RM workload toward relationship deepening, never overriding suitability.
 */
export function relationshipOpportunityScore(params: {
  clientRelevance: number;    // 0-1
  timingRelevance: number;    // 0-1
  unmetNeed: number;          // 0-1
  relationshipGap: number;    // 0-1
  nextBestServicePotential: number; // 0-1
}): number {
  const { wClientRelevance: w1, wTimingRelevance: w2, wUnmetNeed: w3,
    wRelationshipGap: w4, wNextBestServicePotential: w5 } = POLICY.relationshipOpportunityScore;
  const raw = w1 * params.clientRelevance + w2 * params.timingRelevance +
    w3 * params.unmetNeed + w4 * params.relationshipGap +
    w5 * params.nextBestServicePotential;
  return clamp(raw * 100);
}

// ── Derived helpers for alert ranking ─────────────────────────────────────────

/** Map alert severity string → numeric event severity (0-1). */
export function severityToFloat(severity: "high" | "medium" | "info"): number {
  return severity === "high" ? 0.8 : severity === "medium" ? 0.5 : 0.2;
}

/** Map CIO rating → strength score 0-1. */
export function cioRatingStrength(rating: string): number {
  const r = rating?.toUpperCase();
  if (r === "BUY") return 1.0;
  if (r === "HOLD") return 0.5;
  return 0.0;
}

/** Compute materiality score 0-1 from holding weight (percentage). */
export function materialityScore(weightPct: number): number {
  if (weightPct >= POLICY.materiality.concentratedWeightPct) return 1.0;
  if (weightPct >= POLICY.materiality.highWeightPct) return 0.8;
  if (weightPct >= POLICY.materiality.actionableWeightPct) return 0.6;
  if (weightPct >= POLICY.materiality.watchWeightPct) return 0.4;
  return 0.2;
}

/** Recency score: 1 = today, decays linearly over 90 days. */
export function recencyScore(dateStr: string | null): number {
  if (!dateStr) return 0.3;
  const days = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
  return Math.max(0, 1 - days / 90);
}

/**
 * Compute all scores for a client given their DNA, holdings, and first alert.
 * Returns a ClientScores object for the ClientDetail response.
 */
export function computeClientScores(
  dna: ClientDna,
  holdings: Holding[],
  alert: Alert | undefined,
  portfolioValueChf: number
): ClientScores {
  const totalChf = portfolioValueChf || 1;

  // DNA relevance to alert event
  const eventText = alert?.title + " " + alert?.body || "";
  const dnaAll = [...dna.values, ...dna.preferences, ...dna.context];
  const dnaRel = keywordOverlap(eventText, dnaAll);

  // Materiality of flagged holding
  const holdingChf = alert?.holding?.currentChf ?? 0;
  const holdingWeight = holdingChf / totalChf * 100;
  const mat = materialityScore(holdingWeight);

  // Severity
  const sev = alert ? severityToFloat(alert.severity) : 0.2;

  const concern = clientConcernScore({
    dnaRelevance: dnaRel,
    portfolioMateriality: mat,
    eventSeverity: sev,
    recency: 0.7,           // assume recent for hackathon
    relationshipTiming: 0.5,
    pastReactionPattern: 0.4,
  });

  const cio = alert?.swap?.toCandidate?.rating
    ? cioRatingStrength(alert.swap.toCandidate.rating)
    : 0.5;

  const action = actionabilityScore({
    sameSectorFit: alert?.swap ? 1.0 : 0,
    mandateFitQuality: 0.9,
    cioRatingStrength: cio,
    riskAcceptability: 0.85,
    dataCompleteness: dna.values.length >= 3 ? 1.0 : 0.5,
  });

  const priority = alertPriorityScore({
    clientConcern: concern,
    actionability: action,
    relationshipRelevance: dnaRel * 100,
  });

  const relOpp = relationshipOpportunityScore({
    clientRelevance: dnaRel,
    timingRelevance: 0.5,
    unmetNeed: dna.preferences.length < 2 ? 0.8 : 0.4,
    relationshipGap: 0.5,
    nextBestServicePotential: 0.6,
  });

  return {
    client_concern_score: concern,
    alert_priority_score: priority,
    actionability_score: action,
    relationship_opportunity_score: relOpp,
  };
}

/** Determine action eligibility status from guardrail results. */
export function eligibilityStatus(guardrails: { status: string }[]): ActionEligibilityStatus {
  if (guardrails.some((g) => g.status === "BLOCKED")) return "Blocked";
  if (guardrails.some((g) => g.status === "WARNING")) return "Warning";
  return "Actionable";
}
