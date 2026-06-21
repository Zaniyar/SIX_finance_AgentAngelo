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
import { buildHighlights } from "../advisory/highlights";
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
    dnaHook: c.scenario.dnaHook,
    avatarUrl: c.avatarUrl,
  }));
  ok(res, list);
});

// ── GET /api/clients/:id/highlights ──────────────────────────────────────────
router.get("/clients/:id/highlights", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const groups = await buildHighlights(client.scenario.event, client.scenario.dnaHook, phoeniqs).catch(() => []);
    ok(res, { groups });
  } catch (error) { fail(res, error); }
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

// ── POST /api/copilot-chat ────────────────────────────────────────────────────
import { buildCitationSystemPrompt, extractActiveSources, annotateCitations } from "../middleware/citation-enforcement";
import { evaluate as opaEvaluate, buildOpaInput, extractClaimedTickers, buildCitationsFromContext } from "../services/opa.service";

router.post("/copilot-chat", async (req: Request, res: Response) => {
  const { messages, context } = req.body as { messages?: ChatMessage[]; context?: string };
  if (!Array.isArray(messages)) return fail(res, new Error("messages[] required"), 400);
  if (!phoeniqs.configured) return fail(res, new Error("Phoeniqs not configured — set PHOENIQS_API_KEY"), 503);

  // Parse context to extract verified sources for citation enforcement
  let parsedCtx: Record<string, unknown> = {};
  try { if (context) parsedCtx = JSON.parse(context); } catch { /* ignore */ }

  const activeSources = extractActiveSources(parsedCtx, "book");
  const citationSuffix = buildCitationSystemPrompt(activeSources);

  const system =
    `You are the Relationship Intelligence Copilot for Michael Berger, a Relationship Manager at a Swiss private bank.\n` +
    `You help her reason across her entire book of clients. You have full visibility on portfolios, client DNA, open recommendations, and live market events.\n\n` +
    `When the RM mentions a company, ticker, fraud event, macro event or theme:\n` +
    `- Identify which of her clients are exposed (use the provided data, not assumptions).\n` +
    `- Rank them by urgency: severity of the event × absolute CHF exposure × client risk sensitivity.\n` +
    `- Propose concrete next steps per client: trim/exit/hold, preferred channel given client DNA & timezone, and a one-line message tone.\n` +
    `- Cite the data point you used (e.g. "Räber · CIO TAA conflicts with mandate exclusion").\n` +
    `- Always use the client's full name (e.g. "Hubertus Schneider", "Martin Huber") so they can be identified.\n\n` +
    `Format your response with markdown:\n` +
    `- Use **bold** for client names and key figures.\n` +
    `- Use bullet lists for per-client breakdowns.\n` +
    `- Use markdown tables when comparing multiple clients side-by-side.\n` +
    `- Use headers (##) to separate major sections.\n` +
    `- Keep it structured, concise, and numerate.\n\n` +
    `Never invent holdings, prices, or sources not in the data. If something is unknown, say so plainly.` +
    (context ? `\n\n# BOOK DATA (JSON)\n${context}` : "") +
    citationSuffix;

  const fullMessages: ChatMessage[] = [{ role: "system", content: system }, ...messages];

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const rawReply = await phoeniqs.chat(fullMessages, { temperature: 0.4, maxTokens: 3000 });

    // Extract all portfolio tickers from context for grounding check
    const allTickers: string[] = (parsedCtx?.clients as any[])
      ?.flatMap((c: any) => c.holdings?.map((h: any) => h.ticker) ?? []) ?? [];

    // Citation enforcement — annotate reply + detect grounding issues
    const claimedTickers = extractClaimedTickers(rawReply);
    const { reply, citations, grounding_warnings } = annotateCitations(
      rawReply, "book", allTickers, new Map()
    );

    // OPA grounding check for the book-level copilot (lenient — no product/position data)
    const opaInput = buildOpaInput({
      action: "copilot",
      clientId: "book",
      portfolioTickers: allTickers,
      claimedTickers,
      citations,
      dataAgeDays: 0,
    });
    const decision = await opaEvaluate(opaInput);

    res.write(`data: ${JSON.stringify({
      reply,
      citations,
      grounding_warnings,
      opa: { allow: decision.allow, reasons: decision.reasons, obligations: decision.obligations },
    })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
    res.end();
  }
});

// ── POST /api/recommendation-chat ─────────────────────────────────────────────
// Context-aware chat for a single client recommendation page (nicerWebClient).
router.post("/recommendation-chat", async (req: Request, res: Response) => {
  const { messages, context } = req.body as { messages?: ChatMessage[]; context?: string | Record<string, unknown> };
  if (!Array.isArray(messages)) return fail(res, new Error("messages[] required"), 400);
  if (!context) return fail(res, new Error("context required"), 400);
  if (!phoeniqs.configured) return fail(res, new Error("Phoeniqs not configured — set PHOENIQS_API_KEY"), 503);

  // context may arrive as a JSON string (from proxy) or already parsed object (direct fetch)
  let parsed: Record<string, unknown>;
  if (typeof context === "object" && context !== null) {
    parsed = context as Record<string, unknown>;
  } else {
    try {
      parsed = JSON.parse(context as string) as Record<string, unknown>;
    } catch {
      return fail(res, new Error("context must be valid JSON"), 400);
    }
  }

  const client = parsed.client as {
    name?: string;
    preferredChannel?: string;
    portfolio?: { holdings?: { ticker?: string; name?: string; alert?: string }[] };
  } | undefined;
  const holdings = client?.portfolio?.holdings ?? [];
  const alertHoldings = holdings.filter((h) => h.alert).slice(0, 3);
  const newsQuery = alertHoldings[0]?.name || alertHoldings[0]?.ticker || client?.name || "markets";

  const [sixProbe, newsProbe, phoeniqsProbe] = await Promise.all([
    six.ping().catch(() => ({ ok: false, configured: six.configured, name: "SIX MCP" })),
    news.ping().catch(() => ({ ok: false, configured: news.configured, name: "News" })),
    phoeniqs.ping().catch(() => ({ ok: false, configured: phoeniqs.configured, name: "Phoeniqs" })),
  ]);

  const liveData: Record<string, unknown> = {
    integrationStatus: { six: sixProbe, news: newsProbe, phoeniqs: phoeniqsProbe },
  };

  if (news.configured) {
    try {
      liveData.latestNews = await news.getLatestNews(String(newsQuery), 6);
    } catch {
      liveData.latestNews = [];
    }
  }

  if (six.configured && alertHoldings.length > 0) {
    const prices: Record<string, unknown> = {};
    await Promise.all(
      alertHoldings.map(async (h) => {
        if (!h.ticker) return;
        try {
          prices[h.ticker] = await six.getStockPrice(h.name || h.ticker);
        } catch {
          prices[h.ticker] = null;
        }
      }),
    );
    liveData.sixPrices = prices;
  }

  const ui = parsed.ui as { activeTab?: string } | undefined;
  const activeTab = ui?.activeTab ?? "reco";

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const isSelectionAsk = lastUser.includes("[Ask AI · selection]");

  const styleBlock = isSelectionAsk
    ? `## Response style (mandatory for this message)\n` +
      `- **Maximum 4 short sentences (~80 words).** Write like you're whispering a tip to Michael at the desk, not drafting a report.\n` +
      `- No markdown tables, no ## headers, no numbered checklists, no "Point | Why it matters" layouts.\n` +
      `- One clear takeaway + one concrete next step. That's it.\n` +
      `- Warm and direct — use the client's first name once if natural.\n\n`
    : `## Response style\n` +
      `- Default: **under 120 words** unless the RM explicitly asks for detail.\n` +
      `- Conversational and human — colleague over coffee, not compliance memo.\n` +
      `- No tables. At most 3 short bullets if truly needed. Skip ## section headers for simple questions.\n\n`;

  const system =
    `You are the Client Context Assistant for Michael Berger, a Relationship Manager at a Swiss private bank.\n` +
    `You are embedded on a single client's page (active tab: ${activeTab}). Answer ONLY about this client and the data in the provided context.\n` +
    `The RM may highlight text and ask via "Ask AI" (messages tagged [Ask AI · selection]) — answer ONLY about that quoted text.\n\n` +
    styleBlock +
    `You have read access to the full recommendation brief, portfolio, and client DNA in CONTEXT JSON.\n` +
    `Live integrations (use when relevant — data is appended below):\n` +
    `- **Phoeniqs LLM** — you are running on this\n` +
    `- **SIX MCP** — live prices for flagged holdings when available in LIVE DATA\n` +
    `- **Event Registry / News** — latest headlines in LIVE DATA\n\n` +
    `Rules:\n` +
    `- Ground every answer in CONTEXT JSON or LIVE DATA. Never invent holdings, prices, or regulatory facts.\n` +
    `- Prefer the client's preferred channel (${(client as { preferredChannel?: string })?.preferredChannel ?? "see context"}) and DNA when suggesting outreach.\n` +
    `- If asked something outside this client or missing from data, say briefly what's unknown.\n\n` +
    `# CONTEXT (JSON)\n${JSON.stringify(parsed)}\n\n` +
    `# LIVE DATA (integrations)\n${JSON.stringify(liveData)}`;

  const fullMessages: ChatMessage[] = [{ role: "system", content: system }, ...messages];

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reply = await phoeniqs.chat(fullMessages, {
      temperature: 0.35,
      maxTokens: isSelectionAsk ? 220 : 900,
    });
    res.write(`data: ${JSON.stringify({ reply })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
    res.end();
  }
});

// ── POST /api/tts — ElevenLabs TTS proxy (streams audio/mpeg back) ───────────
router.post("/tts", async (req: Request, res: Response) => {
  const { text, voiceId } = req.body as { text?: string; voiceId?: string };
  if (!text) return fail(res, new Error("text required"), 400);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return fail(res, new Error("ELEVENLABS_API_KEY not set"), 503);

  const vid = voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? "IKne3meq5aSn9XLyUdCD";

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.3, use_speaker_boost: true },
      }),
    });
    if (!upstream.ok) {
      const err = await upstream.text();
      return fail(res, new Error(`ElevenLabs ${upstream.status}: ${err}`), upstream.status);
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    // Pipe stream directly to client
    const reader = upstream.body!.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(value);
      await pump();
    };
    await pump();
  } catch (error) { fail(res, error); }
});

// ── GET /api/integrations (alias: /api/health/integrations) ──────────────────
router.get(["/integrations", "/health/integrations"], async (_req, res) => {
  try {
    const probes = await Promise.all([six.ping(), news.ping(), phoeniqs.ping()]);
    ok(res, { probes });
  } catch (error) { fail(res, error); }
});

// ── Agent Angelo Proactive Call Endpoints ─────────────────────────────────────
import { triggerCall, getLastCall, getCallById, getAudioPath } from "../services/proactive-call.service";

// POST /api/calls/trigger — manual trigger from dashboard
router.post("/calls/trigger", async (req: Request, res: Response) => {
  let { client_id, alert_id, to_number } = req.body as { client_id?: string; alert_id?: string; to_number?: string };
  // Override RM_PHONE_NUMBER for this call if provided by the frontend
  if (to_number) process.env.RM_PHONE_NUMBER = to_number;
  if (!client_id) return fail(res, new Error("client_id required"), 400);

  // "all" → pick the highest-priority client automatically
  if (client_id === "all") {
    try {
      const { buildAlerts } = await import("../advisory/alerts");
      const { buildDna } = await import("../advisory/dna");
      const { computeClientScores } = await import("../advisory/scoring");
      let bestId = "schneider";
      let bestScore = -1;
      for (const c of getClients()) {
        try {
          const holdings = getPortfolio(c.portfolio);
          const dna = await buildDna(c.id, phoeniqs);
          const { alerts } = buildAlerts(c, dna);
          if (!alerts.length) continue;
          const pv = holdings.reduce((s, h) => s + h.currentChf, 0);
          const scores = computeClientScores(dna, holdings, alerts[0], pv);
          if (scores.alert_priority_score > bestScore) {
            bestScore = scores.alert_priority_score;
            bestId = c.id;
          }
        } catch { /* skip */ }
      }
      client_id = bestId;
    } catch { client_id = "schneider"; }
  }

  // Use alert_id if provided, else fallback to first alert for this client
  const alertId = alert_id ?? `alert-${client_id}-1`;

  try {
    triggerCall(client_id, alertId, phoeniqs).catch(console.error);
    ok(res, { message: "Call queued — Angelo is preparing your briefing.", callId: alertId });
  } catch (error) { fail(res, error); }
});

// GET /api/calls/status — poll last call status
router.get("/calls/status", (_req, res) => {
  const record = getLastCall();
  if (!record) return ok(res, { status: "idle" });
  ok(res, record);
});

// GET /api/calls/status/:callId — poll specific call
router.get("/calls/status/:callId", (req, res) => {
  const record = getCallById(req.params.callId);
  if (!record) return fail(res, new Error("Call not found"), 404);
  ok(res, record);
});

// GET /api/calls/audio/:callId — serve MP3 for Twilio to play
router.get("/calls/audio/:callId", (req, res) => {
  const audioPath = getAudioPath(req.params.callId);
  if (!require("fs").existsSync(audioPath)) return fail(res, new Error("Audio not ready"), 404);
  res.setHeader("Content-Type", "audio/mpeg");
  res.sendFile(audioPath);
});

export default router;
