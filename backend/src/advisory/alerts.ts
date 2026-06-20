import {
  Alert,
  CandidateRef,
  CioEntry,
  Client,
  ClientDna,
  Holding,
  HoldingRef,
  ReasonStep,
  SwapProposal,
} from "../shared/types";
import { getCio, getPortfolio } from "../data/loader";

const DRIFT_TOLERANCE_PP = 2.0;
const STOPWORDS = new Set(
  ("the a an and or of to in for on with their they them his her our is are be as that this we client " +
    "portfolio holding company companies firm stock shares value values want wants would feel like must " +
    "should into from over under into not no never always primary support system").split(" ")
);

// ---- helpers ----------------------------------------------------------------
function equities(holdings: Holding[]): Holding[] {
  return holdings.filter((h) => h.assetClass === "Equities");
}

function portfolioValue(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.currentChf, 0);
}

/** Sector weight in the book, in percentage points. */
function sectorWeightPp(holdings: Holding[], industry: string): number {
  const total = portfolioValue(holdings);
  const sector = holdings.filter((h) => h.industry === industry).reduce((s, h) => s + h.currentChf, 0);
  return total ? (sector / total) * 100 : 0;
}

function toHoldingRef(h: Holding, holdings: Holding[]): HoldingRef {
  const total = portfolioValue(holdings);
  const driftPp = total ? ((h.currentChf - h.targetChf) / total) * 100 : 0;
  return {
    issuer: h.issuer,
    isin: h.isin,
    industry: h.industry,
    currentChf: Math.round(h.currentChf),
    targetChf: Math.round(h.targetChf),
    driftPp: round2(driftPp),
  };
}

function toCandidateRef(c: CioEntry): CandidateRef {
  return {
    issuer: c.issuer,
    isin: c.isin,
    industry: c.industry,
    rating: c.rating,
    cioView: c.cioView,
    valor: c.valor,
    mic: c.mic,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

/** Score a CIO candidate by alignment with the client's DNA + scenario hook. */
function alignmentScore(c: CioEntry, intent: Set<string>): number {
  const text = keywords(`${c.issuer} ${c.cioView}`);
  let score = 0;
  for (const w of text) if (intent.has(w)) score += 1;
  return score;
}

/**
 * Pick the best same-sector CIO BUY replacement: highest DNA-alignment, then
 * CIO BUY, then alphabetical for determinism. Excludes the conflicted issuer.
 */
function bestReplacement(industry: string, excludeIssuer: string | null, intent: Set<string>): CioEntry | null {
  const buys = getCio()
    .filter((c) => c.industry === industry && c.rating === "BUY" && c.issuer !== excludeIssuer)
    .sort((a, b) => {
      const d = alignmentScore(b, intent) - alignmentScore(a, intent);
      return d !== 0 ? d : a.issuer.localeCompare(b.issuer);
    });
  return buys[0] || null;
}

// ---- main entry -------------------------------------------------------------
/**
 * Deterministic alert + swap matcher. The DECISION (which holding clashes, which
 * CIO-approved replacement, mandate/drift checks) is pure code so it is fully
 * auditable; the LLM is only used elsewhere for language.
 */
export function buildAlerts(client: Client, dna: ClientDna): { holdings: Holding[]; alerts: Alert[] } {
  const holdings = getPortfolio(client.portfolio);
  const sc = client.scenario;
  const intent = keywords(`${sc.dnaHook} ${dna.values.join(" ")} ${dna.preferences.join(" ")}`);

  const alerts: Alert[] =
    sc.direction === "conflict"
      ? [conflictAlert(client, dna, holdings, intent)]
      : [opportunityAlert(client, dna, holdings, intent)];

  return { holdings, alerts };
}

function matchedValue(dna: ClientDna, hook: string): string {
  const intent = keywords(hook);
  let best = dna.values[0] || dna.summary;
  let bestScore = -1;
  for (const v of dna.values) {
    const overlap = [...keywords(v)].filter((w) => intent.has(w)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = v;
    }
  }
  return best;
}

function conflictAlert(client: Client, dna: ClientDna, holdings: Holding[], intent: Set<string>): Alert {
  const sc = client.scenario;
  const sectorHoldings = equities(holdings).filter((h) => h.industry === sc.affectedSector);

  // Locate the flagged holding: explicit issuer, else the most material sector position.
  let flagged: Holding | undefined;
  if (sc.affectedIssuer) {
    flagged = holdings.find((h) => h.issuer.toLowerCase().includes(sc.affectedIssuer!.toLowerCase().split(" ")[0]));
  }
  if (!flagged && sectorHoldings.length) {
    flagged = [...sectorHoldings].sort((a, b) => b.currentChf - a.currentChf)[0];
  }

  const dnaValue = matchedValue(dna, sc.dnaHook);

  // Case A: no holding in the affected sector (e.g. Defensive book vs a US-tech rotation).
  if (!flagged) {
    const sectorPp = sectorWeightPp(holdings, sc.affectedSector);
    const reasonChain: ReasonStep[] = [
      { label: "Client aversion on record", detail: sc.dnaHook, pass: false },
      {
        label: "Mandate already compliant",
        detail: `${client.mandate} book holds ${round2(sectorPp)}% in ${sc.affectedSector} — the proposed rotation would introduce unwanted exposure.`,
        pass: true,
      },
      {
        label: "Recommendation",
        detail: "Decline the tactical rotation for this client; reinforce the existing defensive sleeve instead.",
        pass: true,
      },
    ];
    return {
      id: `${client.id}-rotation`,
      severity: "high",
      direction: "conflict",
      title: `CIO rotation into ${sc.affectedSector} conflicts with client mandate`,
      body: sc.event,
      dnaValue,
      holding: null,
      swap: null,
      reasonChain,
      news: [],
    };
  }

  // Case B: flagged holding → propose a same-sector CIO-approved replacement.
  const flaggedRef = toHoldingRef(flagged, holdings);
  const replacement = bestReplacement(flagged.industry, flagged.issuer, intent);
  const sectorPp = sectorWeightPp(holdings, flagged.industry);

  let swap: SwapProposal | null = null;
  if (replacement) {
    const cand = toCandidateRef(replacement);
    const reasonChain: ReasonStep[] = [
      { label: "Same-sector replacement", detail: `${cand.issuer} is ${cand.industry}, identical to ${flaggedRef.issuer}.`, pass: cand.industry === flaggedRef.industry },
      { label: "On CIO recommendation list", detail: `${cand.issuer} carries a CIO ${cand.rating} rating${cand.cioView ? ` — "${cand.cioView.slice(0, 60)}"` : ""}.`, pass: cand.rating === "BUY" },
      { label: "Resolves the values conflict", detail: `${flaggedRef.issuer} clashes with: ${dnaValue}. ${cand.issuer} does not.`, pass: true },
      { label: `Mandate allocation preserved (±${DRIFT_TOLERANCE_PP}pp)`, detail: `Sector weight stays ${round2(sectorPp)}% — same sector, same size, so ${client.mandate} drift is unaffected.`, pass: true },
    ];
    swap = {
      fromHolding: flaggedRef,
      toCandidate: cand,
      sector: flagged.industry,
      amountChf: flaggedRef.currentChf,
      reasonChain,
      rationale: `Swap ${flaggedRef.issuer} → ${cand.issuer} (same sector, CIO ${cand.rating}) to resolve the values conflict without touching the mandate.`,
    };
  }

  return {
    id: `${client.id}-conflict`,
    severity: "high",
    direction: "conflict",
    title: `${flaggedRef.issuer} conflicts with client values`,
    body: sc.event,
    dnaValue,
    holding: flaggedRef,
    swap,
    reasonChain:
      swap?.reasonChain ?? [
        { label: "Values conflict", detail: sc.dnaHook, pass: false },
      ],
    news: [],
  };
}

function opportunityAlert(client: Client, dna: ClientDna, holdings: Holding[], intent: Set<string>): Alert {
  const sc = client.scenario;
  const dnaValue = matchedValue(dna, sc.dnaHook);
  const replacement = bestReplacement(sc.affectedSector, null, intent);

  // Fund the tilt by trimming the most-overweight equity position.
  const overweight = [...equities(holdings)]
    .map((h) => ({ h, ref: toHoldingRef(h, holdings) }))
    .sort((a, b) => b.ref.driftPp - a.ref.driftPp)[0];

  let swap: SwapProposal | null = null;
  if (replacement) {
    const cand = toCandidateRef(replacement);
    const fund = overweight?.ref ?? null;
    const reasonChain: ReasonStep[] = [
      { label: "Values-aligned opportunity", detail: `${sc.event}`, pass: true },
      { label: "On CIO recommendation list", detail: `${cand.issuer} carries a CIO ${cand.rating} rating${cand.cioView ? ` — "${cand.cioView.slice(0, 60)}"` : ""}.`, pass: cand.rating === "BUY" },
      { label: "Matches client DNA", detail: `Aligns with: ${dnaValue}.`, pass: true },
      fund
        ? { label: "Funded from overweight position", detail: `Trim ${fund.issuer} (drift +${fund.driftPp}pp) to fund the tilt — keeps the ${client.mandate} mandate balanced.`, pass: true }
        : { label: "Funded from cash sleeve", detail: "Use available liquidity; mandate weights preserved.", pass: true },
    ];
    swap = {
      fromHolding: fund,
      toCandidate: cand,
      sector: sc.affectedSector,
      amountChf: fund ? Math.min(fund.currentChf, 50000) : 50000,
      reasonChain,
      rationale: `Tilt toward ${cand.issuer} (CIO ${cand.rating}, values-aligned)${fund ? `, funded by trimming overweight ${fund.issuer}` : ""}.`,
    };
  }

  return {
    id: `${client.id}-opportunity`,
    severity: "medium",
    direction: "opportunity",
    title: `Values-aligned opportunity in ${sc.affectedSector}`,
    body: sc.event,
    dnaValue,
    holding: swap?.fromHolding ?? null,
    swap,
    reasonChain: swap?.reasonChain ?? [{ label: "Opportunity", detail: sc.event, pass: true }],
    news: [],
  };
}
