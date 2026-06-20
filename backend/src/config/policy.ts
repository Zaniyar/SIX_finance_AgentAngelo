/**
 * Policy configuration — all scoring thresholds live here, never hard-coded
 * in business logic. Section 7 of the Back-End Requirements document.
 * Treat this as a versioned config: bump `version` on every change.
 */
export const POLICY = {
  version: "1.0.0",
  effective: "2026-06-20",

  // ── DNA Confidence ─────────────────────────────────────────────────────────
  dna: {
    confidenceHigh: 0.80,
    confidenceMedium: 0.55,
    confidenceLow: 0.35,
    staleAfterMonths: 12,          // reduce confidence after 12 months without reconfirmation
    evidenceMinimumSnippets: 1,    // at least 1 note snippet required
  },

  // ── Alert Priority ─────────────────────────────────────────────────────────
  alert: {
    priorityCritical: 85,
    priorityHigh: 70,
    priorityWatch: 50,
    priorityLow: 0,
  },

  // ── Client Concern Score formula weights ───────────────────────────────────
  // Score = w1*dnaRelevance + w2*materiality + w3*severity + w4*recency + w5*timing + w6*reactionPattern
  clientConcernScore: {
    wDnaRelevance: 0.30,
    wPortfolioMateriality: 0.25,
    wEventSeverity: 0.20,
    wRecency: 0.10,
    wRelationshipTiming: 0.10,
    wPastReactionPattern: 0.05,
    concernThreshold: 70,          // trigger anticipation alert when >= 70
  },

  // ── Asset Fit Score formula weights ────────────────────────────────────────
  assetFitScore: {
    wMandateFit: 0.25,
    wPeerSectorFit: 0.20,
    wCioRatingStrength: 0.20,
    wDnaAlignment: 0.15,
    wRiskImprovementNeutrality: 0.10,
    wLiquidityMarketQuality: 0.10,
  },

  // ── Actionability Score weights ────────────────────────────────────────────
  actionabilityScore: {
    wSameSectorFit: 0.25,
    wMandateFitQuality: 0.25,
    wCioRatingStrength: 0.20,
    wRiskAcceptability: 0.15,
    wDataCompleteness: 0.15,
  },

  // ── Relationship Opportunity Score weights ─────────────────────────────────
  relationshipOpportunityScore: {
    wClientRelevance: 0.35,
    wTimingRelevance: 0.25,
    wUnmetNeed: 0.20,
    wRelationshipGap: 0.10,
    wNextBestServicePotential: 0.10,
  },

  // ── Portfolio Materiality ──────────────────────────────────────────────────
  materiality: {
    watchWeightPct: 1,             // ≥1% → Watch
    actionableWeightPct: 2,        // ≥2% → Actionable
    highWeightPct: 5,              // ≥5% → High
    concentratedWeightPct: 10,     // >10% → Concentrated
    watchAbsoluteChf: 100_000,
    actionableAbsoluteChf: 500_000,
    highAbsoluteChf: 1_000_000,
  },

  // ── Mandate Drift ──────────────────────────────────────────────────────────
  drift: {
    maxDriftPp: 2.0,               // ±2pp from target before flagging
  },

  // ── Concentration ──────────────────────────────────────────────────────────
  concentration: {
    singleNameDefensivePct: 10,
    singleNameBalancedPct: 12,
    singleNameGrowthPct: 15,
  },

  // ── Sector Delta ───────────────────────────────────────────────────────────
  sectorDelta: {
    preferredPp: 1.0,
    warningPp: 2.0,
    blockPp: 2.0,                  // block if > 2pp unless rebalancing case
  },

  // ── Risk Score Delta ───────────────────────────────────────────────────────
  riskDelta: {
    preferredDelta: 0.25,
    warningDelta: 0.50,
    blockDelta: 0.50,
  },

  // ── News Severity ──────────────────────────────────────────────────────────
  newsSeverity: {
    informational: 1,
    minor: 2,
    meaningful: 3,
    major: 4,
    crisis: 5,
  },

  // ── Contact Fatigue ────────────────────────────────────────────────────────
  contactFatigue: {
    suppressWithinHours: 48,
    criticalAlwaysOverride: true,
  },

  // ── Message Style Confidence ───────────────────────────────────────────────
  messageStyle: {
    minimumConfidenceToUseStyle: 0.60,
    highSeverityMinLevel: 4,       // severity ≥4 forces balanced professional template
  },
} as const;

export type Policy = typeof POLICY;
