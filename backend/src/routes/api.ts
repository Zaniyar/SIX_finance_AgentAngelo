import { Router, Request, Response } from "express";
import { PhoeniqsService, ChatMessage } from "../services/phoeniqs.service";
import { SixService } from "../services/six.service";
import { NewsAIService } from "../services/newsai.service";
import { getClient, getClients, getPortfolio, getCrm } from "../data/loader";
import { buildDna } from "../advisory/dna";
import { buildAlerts } from "../advisory/alerts";
import { draftMessage } from "../advisory/draft";
import { twinReply } from "../advisory/twin";
import { buildDnaGaps } from "../advisory/gaps";
import { buildMemoryCard } from "../advisory/memoryCard";
import { buildActionCard } from "../advisory/actionCard";
import { buildActionPack } from "../advisory/actionPack";
import { runGuardrails, overallSuitabilityStatus } from "../advisory/guardrails";
import { computeClientScores, materialityScore, cioRatingStrength } from "../advisory/scoring";
import { getAuditTrail, appendAuditLog, makeEvidenceFromNote, storeEvidence } from "../advisory/evidence";
import { POLICY } from "../config/policy";
import { Alert, ApiResponse, ClientDetail, Recommendation, HoldingWithFit, PortfolioFit } from "../shared/types";
import crypto from "crypto";

const router = Router();
const phoeniqs = new PhoeniqsService();
const six = new SixService();
const news = new NewsAIService();

function ok<T>(res: Response, data: T) { res.json({ success: true, data } as ApiResponse<T>); }
function fail(res: Response, error: unknown, status = 500) {
  res.status(status).json({ success: false, error: (error as Error).message || String(error) });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function enrichNews(alert: Alert, issuer: string | null, sector: string) {
  if (!news.configured) return;
  const query = issuer || alert.holding?.issuer || sector;
  try { alert.news = await news.getLatestNews(query, 4); } catch { alert.news = []; }
}

async function enrichPrice(alert: Alert) {
  if (!six.configured || !alert.swap) return;
  try {
    const cand = alert.swap.toCandidate;
    if (cand.valor && cand.mic) {
      alert.swap.toCandidate.livePrice = await six.getStockPrice(cand.issuer);
    }
  } catch { /* best-effort */ }
}

// ── GET /api/clients ──────────────────────────────────────────────────────────
router.get("/clients", (_req, res) => {
  const list = getClients().map((c) => ({
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    mandate: c.mandate,
    tagline: c.tagline,
    location: c.location,
    direction: c.scenario.direction,
    event: c.scenario.event,
    avatarUrl: c.avatarUrl,
  }));
  ok(res, list);
});

// ── GET /api/clients/:id ──────────────────────────────────────────────────────
router.get("/clients/:id", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);

  try {
    let dna; let dnaAvailable = true;
    try {
      dna = await buildDna(client.id, phoeniqs);
    } catch {
      dnaAvailable = false;
      dna = { values: [], context: [], preferences: [], commsStyle: "", toneProfile: "relationship-led" as const, summary: "Client DNA requires the Phoeniqs LLM — add PHOENIQS_API_KEY to .env." };
    }

    const { holdings, alerts } = buildAlerts(client, dna);
    const portfolioValueChf = Math.round(holdings.reduce((s, h) => s + h.currentChf, 0));

    await Promise.all(alerts.map(async (a) => {
      await enrichNews(a, client.scenario.affectedIssuer, client.scenario.affectedSector);
      await enrichPrice(a);
      // Attach Four-Question Action Card
      if (dnaAvailable) {
        try {
          a.action_card = await buildActionCard(a, dna, client.id, phoeniqs);
        } catch { /* non-blocking */ }
      }
    }));

    const scores = computeClientScores(dna, holdings, alerts[0], portfolioValueChf);

    const detail: ClientDetail = { client, dna, dnaAvailable, holdings, portfolioValueChf, alerts, scores, generatedAt: new Date().toISOString() };
    ok(res, detail);
  } catch (error) { fail(res, error); }
});

// ── GET /api/clients/:id/memory-card (FR-004, <500ms from cache) ─────────────
router.get("/clients/:id/memory-card", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const dna = await buildDna(client.id, phoeniqs).catch(() => ({
      values: [], context: [], preferences: [], commsStyle: "", toneProfile: "relationship-led" as const, summary: ""
    }));
    const gaps = await buildDnaGaps(client.id, dna, phoeniqs);
    const card = buildMemoryCard(client, dna, gaps);
    ok(res, card);
  } catch (error) { fail(res, error); }
});

// ── GET /api/clients/:id/dna ──────────────────────────────────────────────────
router.get("/clients/:id/dna", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const dna = await buildDna(client.id, phoeniqs);
    const gaps = await buildDnaGaps(client.id, dna, phoeniqs);
    ok(res, { ...dna, gaps });
  } catch (error) { fail(res, error); }
});

// ── POST /api/clients/:id/dna/refresh ─────────────────────────────────────────
router.post("/clients/:id/dna/refresh", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const dna = await buildDna(client.id, phoeniqs, true); // force=true
    const gaps = await buildDnaGaps(client.id, dna, phoeniqs);
    appendAuditLog({ actor_id: "system", action: "DNA_REFRESHED", object_type: "client", object_id: client.id, content: JSON.stringify(dna), evidence_ids: [], note: "Full DNA refresh requested" });
    ok(res, { ...dna, gaps });
  } catch (error) { fail(res, error); }
});

// ── GET /api/clients/:id/portfolio-fit (FR-006) ───────────────────────────────
router.get("/clients/:id/portfolio-fit", (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const portfolio = getPortfolio(client.portfolio);
    const holdings = portfolio as any[];
    const totalChf = holdings.reduce((s: number, h: any) => s + (h.currentChf ?? 0), 0) || 1;

    const withFit: HoldingWithFit[] = holdings.map((h: any) => {
      const weightPct = (h.currentChf / totalChf) * 100;
      const targetWeightPct = h.targetChf ? (h.targetChf / totalChf) * 100 : weightPct;
      const driftPp = weightPct - targetWeightPct;
      let materiality: HoldingWithFit["materiality"] = "low";
      if (weightPct >= POLICY.materiality.concentratedWeightPct) materiality = "concentrated";
      else if (weightPct >= POLICY.materiality.highWeightPct) materiality = "high";
      else if (weightPct >= POLICY.materiality.actionableWeightPct) materiality = "actionable";
      else if (weightPct >= POLICY.materiality.watchWeightPct) materiality = "watch";

      const suitabilityFlags: string[] = [];
      if (Math.abs(driftPp) > POLICY.drift.maxDriftPp) suitabilityFlags.push(`drift:${driftPp.toFixed(1)}pp`);
      if (materiality === "concentrated") suitabilityFlags.push("concentration:high");

      return { ...h, weightPct: +weightPct.toFixed(2), targetWeightPct: +targetWeightPct.toFixed(2), driftPp: +driftPp.toFixed(2), materiality, suitabilityFlags };
    });

    const sectorExposure: Record<string, number> = {};
    for (const h of withFit) {
      const s = h.industry || h.assetClass || "Other";
      sectorExposure[s] = (sectorExposure[s] ?? 0) + h.weightPct;
    }

    const concentrationFlags = withFit.filter((h) => h.materiality === "concentrated").map((h) => `${h.issuer}: ${h.weightPct.toFixed(1)}%`);
    const mandateDrift = withFit.reduce((s, h) => s + Math.abs(h.driftPp), 0) / Math.max(withFit.length, 1);

    const result: PortfolioFit = {
      client_id: client.id, holdings: withFit, portfolio_value_chf: totalChf,
      mandate_drift_pp: +mandateDrift.toFixed(2), concentration_flags: concentrationFlags,
      sector_exposure: Object.fromEntries(Object.entries(sectorExposure).map(([k, v]) => [k, +v.toFixed(2)])),
      generated_at: new Date().toISOString(),
    };
    ok(res, result);
  } catch (error) { fail(res, error); }
});

// ── GET /api/alerts ───────────────────────────────────────────────────────────
router.get("/alerts", async (req: Request, res: Response) => {
  const rmId = req.query.rm_id as string | undefined;
  const status = req.query.status as string | undefined;
  const minPriority = req.query.min_priority ? Number(req.query.min_priority) : 0;

  try {
    const clients = getClients().filter((c) => !rmId || c.rm === rmId);
    const allAlerts: any[] = [];

    for (const client of clients) {
      const dna = await buildDna(client.id, phoeniqs).catch(() => ({
        values: [], context: [], preferences: [], commsStyle: "", toneProfile: "relationship-led" as const, summary: ""
      }));
      const { holdings, alerts } = buildAlerts(client, dna);
      const portfolioValueChf = holdings.reduce((s, h) => s + h.currentChf, 0);
      const scores = computeClientScores(dna, holdings, alerts[0], portfolioValueChf);

      for (const a of alerts) {
        const priorityScore = scores.alert_priority_score;
        if (priorityScore < minPriority) continue;
        allAlerts.push({ ...a, client_id: client.id, client_name: client.name, priority_score: priorityScore, concern_score: scores.client_concern_score });
      }
    }

    allAlerts.sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
    ok(res, { alerts: allAlerts, total: allAlerts.length });
  } catch (error) { fail(res, error); }
});

// ── GET /api/alerts/:alert_id ────────────────────────────────────────────────
router.get("/alerts/:alertId", async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const clientId = req.query.client_id as string;
  const client = clientId ? getClient(clientId) : getClients()[0];
  if (!client) return fail(res, new Error("client_id required"), 400);

  try {
    const dna = await buildDna(client.id, phoeniqs).catch(() => ({
      values: [], context: [], preferences: [], commsStyle: "", toneProfile: "relationship-led" as const, summary: ""
    }));
    const { alerts } = buildAlerts(client, dna);
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return fail(res, new Error("alert not found"), 404);
    if (!alert.action_card) {
      try { alert.action_card = await buildActionCard(alert, dna, client.id, phoeniqs); } catch { /* non-blocking */ }
    }
    ok(res, alert);
  } catch (error) { fail(res, error); }
});

// ── POST /api/alerts/:alert_id/recommendations ───────────────────────────────
router.post("/alerts/:alertId/recommendations", async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const clientId = req.body?.client_id as string;
  const client = clientId ? getClient(clientId) : null;
  if (!client) return fail(res, new Error("client_id required in body"), 400);

  try {
    const dna = await buildDna(client.id, phoeniqs);
    const { holdings, alerts } = buildAlerts(client, dna);
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert || !alert.swap) return fail(res, new Error("alert or swap not found"), 404);

    const portfolioValueChf = holdings.reduce((s, h) => s + h.currentChf, 0);
    const candidateWeightPct = (alert.swap.amountChf / portfolioValueChf) * 100;

    const guardrails = runGuardrails({
      client, dna, swap: alert.swap,
      candidateCio: undefined,  // simplified — real impl would look up CIO entry
      candidateWeightPct,
      sectorDeltaPp: 0.5,
      evidenceIds: alert.evidence_ids ?? [],
      dnaValue: alert.dnaValue,
    });

    const recommendation: Recommendation = {
      recommendation_id: `R-${alertId}`,
      alert_id: alertId,
      action_type: alert.direction === "conflict" ? "SWAP" : "WATCH",
      current_holding: alert.holding,
      candidate: alert.swap.toCandidate,
      suitability_status: overallSuitabilityStatus(guardrails),
      guardrails,
      asset_fit_score: 78, // simplified
      client_dna_alignment: dna.values.slice(0, 2).map((v) => ({ attribute: v.slice(0, 40), confidence: 0.82 })),
      rm_required_action: "Review and approve before client contact",
      evidence_ids: alert.evidence_ids ?? [],
      action_card: alert.action_card,
    };

    ok(res, recommendation);
  } catch (error) { fail(res, error); }
});

// ── POST /api/recommendations/:id/message-draft ───────────────────────────────
router.post("/recommendations/:id/message-draft", async (req: Request, res: Response) => {
  const clientId = req.body?.client_id as string;
  const client = clientId ? getClient(clientId) : null;
  if (!client) return fail(res, new Error("client_id required"), 400);
  try {
    const dna = await buildDna(client.id, phoeniqs);
    const { alerts } = buildAlerts(client, dna);
    const alert = alerts[0];
    if (!alert) return fail(res, new Error("no alert"), 404);
    const draft = await draftMessage(client, dna, alert, phoeniqs);
    ok(res, { ...draft, message_id: `M-${req.params.id}`, recommendation_id: req.params.id, approval_status: "DRAFT", disclaimer: "This is a draft for RM review only. Not for direct client distribution." });
  } catch (error) { fail(res, error); }
});

// ── POST /api/recommendations/:id/action-pack ─────────────────────────────────
router.post("/recommendations/:id/action-pack", async (req: Request, res: Response) => {
  const clientId = req.body?.client_id as string;
  const client = clientId ? getClient(clientId) : null;
  if (!client) return fail(res, new Error("client_id required"), 400);
  try {
    const dna = await buildDna(client.id, phoeniqs);
    const { holdings, alerts } = buildAlerts(client, dna);
    const alert = alerts[0];
    if (!alert) return fail(res, new Error("no alert"), 404);
    const gaps = await buildDnaGaps(client.id, dna, phoeniqs);
    const memoryCard = buildMemoryCard(client, dna, gaps);
    const pack = await buildActionPack(client, dna, alert, memoryCard, phoeniqs, req.body?.rm_id ?? "rm-system");
    ok(res, pack);
  } catch (error) { fail(res, error); }
});

// ── POST /api/recommendations/:id/approve ─────────────────────────────────────
router.post("/recommendations/:id/approve", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rm_id, action = "APPROVED", edits_summary } = req.body ?? {};
  if (!rm_id) return fail(res, new Error("rm_id required"), 400);
  try {
    const contentHash = crypto.createHash("sha256").update(id + rm_id + action).digest("hex").slice(0, 16);
    const approval = { approval_id: `APR-${id}`, object_id: id, object_type: "recommendation", rm_id, action, timestamp: new Date().toISOString(), edits_summary, final_text_hash: contentHash };
    appendAuditLog({ actor_id: rm_id, action: `RECOMMENDATION_${action}`, object_type: "recommendation", object_id: id, content: JSON.stringify(approval), evidence_ids: [], note: edits_summary });
    ok(res, approval);
  } catch (error) { fail(res, error); }
});

// ── GET /api/audit/:object_type/:object_id ────────────────────────────────────
router.get("/audit/:objectType/:objectId", (req: Request, res: Response) => {
  const { objectType, objectId } = req.params;
  try {
    const trail = getAuditTrail(objectType, objectId);
    ok(res, { object_type: objectType, object_id: objectId, entries: trail, total: trail.length });
  } catch (error) { fail(res, error); }
});

// ── POST /api/clients/:id/draft (legacy, kept for frontend compat) ────────────
router.post("/clients/:id/draft", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const dna = await buildDna(client.id, phoeniqs);
    const { alerts } = buildAlerts(client, dna);
    const alertId: string | undefined = req.body?.alertId;
    const alert = (alertId && alerts.find((a) => a.id === alertId)) || alerts[0];
    if (!alert) return fail(res, new Error("no alert to draft for"), 404);
    const draft = await draftMessage(client, dna, alert, phoeniqs);
    ok(res, draft);
  } catch (error) { fail(res, error); }
});

// ── POST /api/twin/:id/chat ───────────────────────────────────────────────────
router.post("/twin/:id/chat", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const messages: ChatMessage[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const dna = await buildDna(client.id, phoeniqs);
    const reply = await twinReply(client, dna, messages, phoeniqs);
    ok(res, { reply });
  } catch (error) { fail(res, error); }
});

// ── GET /api/news ─────────────────────────────────────────────────────────────
router.get("/news", async (req: Request, res: Response) => {
  const q = String(req.query.q || "markets");
  try {
    const articles = await news.getLatestNews(q, 8);
    ok(res, { articles, sentiment: news.analyzeNewsSentiment(articles) });
  } catch (error) { fail(res, error); }
});

// ── GET /api/integrations (alias: /api/health/integrations) ──────────────────
router.get(["/integrations", "/health/integrations"], async (_req, res) => {
  try {
    const probes = await Promise.all([six.ping(), news.ping(), phoeniqs.ping()]);
    ok(res, { probes });
  } catch (error) { fail(res, error); }
});

export default router;
