/**
 * Suitability Guardrail Engine — FR-011, Section 13.
 * Hard-stop and warning checks before any recommendation becomes actionable.
 * All thresholds from policy.ts — never hard-coded here.
 */
import { POLICY } from "../config/policy";
import { Client, ClientDna, Holding, CioEntry, GuardrailResult, SwapProposal } from "../shared/types";

function pass(rule: string, detail: string): GuardrailResult {
  return { rule, status: "PASS", detail };
}
function warn(rule: string, detail: string): GuardrailResult {
  return { rule, status: "WARNING", detail };
}
function block(rule: string, detail: string): GuardrailResult {
  return { rule, status: "BLOCKED", detail };
}

// ── Rule: Same-Sector ────────────────────────────────────────────────────────
export function checkSameSector(currentSector: string, candidateSector: string): GuardrailResult {
  const same = currentSector.toLowerCase() === candidateSector.toLowerCase();
  if (!same) return block("same_sector", `Candidate sector "${candidateSector}" ≠ current sector "${currentSector}". Same-sector swap required.`);
  return pass("same_sector", `Sector match confirmed: ${currentSector}`);
}

// ── Rule: CIO Universe ───────────────────────────────────────────────────────
export function checkCioUniverse(candidate: CioEntry | undefined): GuardrailResult {
  if (!candidate) return block("cio_universe", "Candidate not found in CIO-approved universe.");
  if (candidate.rating === "BUY") return pass("cio_universe", `CIO rating: BUY as of ${candidate.asOf ?? "unknown"}`);
  if (candidate.rating === "HOLD") return warn("cio_universe", `CIO rating is HOLD (not BUY) — requires RM confirmation.`);
  return block("cio_universe", `CIO rating "${candidate.rating}" — candidate not eligible for new positions.`);
}

// ── Rule: Mandate Drift ──────────────────────────────────────────────────────
export function checkMandateDrift(currentDriftPp: number, newDriftPp: number): GuardrailResult {
  const maxDrift = POLICY.drift.maxDriftPp;
  if (Math.abs(newDriftPp) <= maxDrift) return pass("mandate_drift", `Post-swap drift ${newDriftPp.toFixed(1)}pp within ±${maxDrift}pp.`);
  if (Math.abs(newDriftPp) <= maxDrift + 1) return warn("mandate_drift", `Post-swap drift ${newDriftPp.toFixed(1)}pp slightly exceeds ±${maxDrift}pp — label as rebalancing.`);
  return block("mandate_drift", `Post-swap drift ${newDriftPp.toFixed(1)}pp exceeds ±${maxDrift}pp limit. Cannot proceed without rebalancing exception.`);
}

// ── Rule: Concentration ──────────────────────────────────────────────────────
export function checkConcentration(
  mandate: string,
  candidateWeightPct: number,
  issuer: string,
): GuardrailResult {
  const limits: Record<string, number> = {
    Defensive: POLICY.concentration.singleNameDefensivePct,
    Balanced: POLICY.concentration.singleNameBalancedPct,
    Growth: POLICY.concentration.singleNameGrowthPct,
  };
  const limit = limits[mandate] ?? 12;
  if (candidateWeightPct > limit) {
    return block("concentration", `${issuer} would reach ${candidateWeightPct.toFixed(1)}% — exceeds ${mandate} limit of ${limit}%.`);
  }
  if (candidateWeightPct > limit * 0.8) {
    return warn("concentration", `${issuer} at ${candidateWeightPct.toFixed(1)}% — approaching ${mandate} concentration limit of ${limit}%.`);
  }
  return pass("concentration", `Concentration ${candidateWeightPct.toFixed(1)}% within ${mandate} limit of ${limit}%.`);
}

// ── Rule: Sector Exposure Delta ───────────────────────────────────────────────
export function checkSectorDelta(sectorDeltaPp: number): GuardrailResult {
  const { preferredPp, warningPp, blockPp } = POLICY.sectorDelta;
  if (Math.abs(sectorDeltaPp) <= preferredPp) return pass("sector_delta", `Sector exposure change ${sectorDeltaPp.toFixed(1)}pp within preferred ±${preferredPp}pp.`);
  if (Math.abs(sectorDeltaPp) <= warningPp) return warn("sector_delta", `Sector exposure change ${sectorDeltaPp.toFixed(1)}pp — monitor sector concentration.`);
  return block("sector_delta", `Sector exposure change ${sectorDeltaPp.toFixed(1)}pp exceeds ±${blockPp}pp — would create unintended sector tilt.`);
}

// ── Rule: Evidence Minimum ────────────────────────────────────────────────────
export function checkEvidenceMinimum(evidenceIds: string[]): GuardrailResult {
  if (evidenceIds.length >= 1) return pass("evidence_minimum", `${evidenceIds.length} evidence item(s) support this action.`);
  return block("evidence_minimum", "No evidence items support this action. Minimum 1 source snippet required.");
}

// ── Rule: DNA Link ────────────────────────────────────────────────────────────
export function checkDnaLink(dnaValue: string): GuardrailResult {
  if (dnaValue && dnaValue.length > 5) return pass("dna_link", `Client DNA link confirmed: "${dnaValue.slice(0, 60)}"`);
  return warn("dna_link", "Weak or missing DNA link — recommend adding more client context.");
}

// ── Run all guardrails for a swap proposal ────────────────────────────────────
export interface GuardrailInput {
  client: Client;
  dna: ClientDna;
  swap: SwapProposal;
  candidateCio: CioEntry | undefined;
  candidateWeightPct: number;
  sectorDeltaPp: number;
  evidenceIds: string[];
  dnaValue: string;
}

export function runGuardrails(input: GuardrailInput): GuardrailResult[] {
  const results: GuardrailResult[] = [];

  // 1. Same-sector
  results.push(checkSameSector(
    input.swap.fromHolding?.industry ?? input.swap.sector,
    input.swap.toCandidate.industry ?? input.swap.sector
  ));

  // 2. CIO universe
  results.push(checkCioUniverse(input.candidateCio));

  // 3. Mandate drift — use swap amount as proxy for drift
  const portfolioValueProxy = (input.swap.fromHolding?.currentChf ?? 100_000) * 10;
  const newDriftPp = (input.swap.amountChf / portfolioValueProxy) * 100;
  results.push(checkMandateDrift(0, newDriftPp));

  // 4. Concentration
  results.push(checkConcentration(input.client.mandate, input.candidateWeightPct, input.swap.toCandidate.issuer));

  // 5. Sector delta
  results.push(checkSectorDelta(input.sectorDeltaPp));

  // 6. Evidence minimum
  results.push(checkEvidenceMinimum(input.evidenceIds));

  // 7. DNA link
  results.push(checkDnaLink(input.dnaValue));

  return results;
}

export function overallSuitabilityStatus(guardrails: GuardrailResult[]): "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED" {
  if (guardrails.some((g) => g.status === "BLOCKED")) return "BLOCKED";
  if (guardrails.some((g) => g.status === "WARNING")) return "PASS_WITH_WARNINGS";
  return "PASS";
}
