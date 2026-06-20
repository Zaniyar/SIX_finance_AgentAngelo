import { Router, Request, Response } from "express";
import { PhoeniqsService, ChatMessage } from "../services/phoeniqs.service";
import { SixService } from "../services/six.service";
import { NewsAIService } from "../services/newsai.service";
import { getClient, getClients, getPortfolio } from "../data/loader";
import { buildDna } from "../advisory/dna";
import { buildAlerts } from "../advisory/alerts";
import { draftMessage } from "../advisory/draft";
import { twinReply } from "../advisory/twin";
import { Alert, ApiResponse, ClientDetail } from "../shared/types";

const router = Router();

// Construct integration clients once (they read env at construction time).
const phoeniqs = new PhoeniqsService();
const six = new SixService();
const news = new NewsAIService();

function ok<T>(res: Response, data: T) {
  res.json({ success: true, data } as ApiResponse<T>);
}
function fail(res: Response, error: unknown, status = 500) {
  res.status(status).json({ success: false, error: (error as Error).message || String(error) });
}

// ---- Client list (world-map hub) -------------------------------------------
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

// ---- Full client detail (DNA + portfolio + alerts + swap) -------------------
router.get("/clients/:id", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);

  try {
    // DNA needs the LLM; if it's unavailable we still render the deterministic
    // engine (portfolio + alerts + swap + reason chain) with a stub DNA.
    let dna;
    let dnaAvailable = true;
    try {
      dna = await buildDna(client.id, phoeniqs);
    } catch {
      dnaAvailable = false;
      dna = {
        values: [],
        context: [],
        preferences: [],
        commsStyle: "",
        toneProfile: "relationship-led" as const,
        summary: "Client DNA requires the Phoeniqs LLM — add PHOENIQS_API_KEY to .env.",
      };
    }
    const { holdings, alerts } = buildAlerts(client, dna);

    // Enrich alerts with live corroborating news + a live SIX price badge.
    await Promise.all(
      alerts.map(async (a) => {
        await enrichNews(a, client.scenario.affectedIssuer, client.scenario.affectedSector);
        await enrichPrice(a);
      })
    );

    const detail: ClientDetail = {
      client,
      dna,
      dnaAvailable,
      holdings,
      portfolioValueChf: Math.round(holdings.reduce((s, h) => s + h.currentChf, 0)),
      alerts,
      generatedAt: new Date().toISOString(),
    };
    ok(res, detail);
  } catch (error) {
    fail(res, error);
  }
});

async function enrichNews(alert: Alert, issuer: string | null, sector: string) {
  if (!news.configured) return;
  const query = issuer || alert.holding?.issuer || sector;
  try {
    const articles = await news.getLatestNews(query, 4);
    alert.news = articles;
  } catch {
    alert.news = [];
  }
}

async function enrichPrice(alert: Alert) {
  if (!six.configured || !alert.swap) return;
  try {
    const cand = alert.swap.toCandidate;
    if (cand.valor && cand.mic) {
      alert.swap.toCandidate.livePrice = await six.getStockPrice(cand.issuer);
    }
  } catch {
    /* price badge is best-effort */
  }
}

// ---- RM draft message -------------------------------------------------------
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
  } catch (error) {
    fail(res, error);
  }
});

// ---- Digital twin chat ------------------------------------------------------
router.post("/twin/:id/chat", async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) return fail(res, new Error("unknown client"), 404);
  try {
    const messages: ChatMessage[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const dna = await buildDna(client.id, phoeniqs);
    const reply = await twinReply(client, dna, messages, phoeniqs);
    ok(res, { reply });
  } catch (error) {
    fail(res, error);
  }
});

// ---- Live news passthrough --------------------------------------------------
router.get("/news", async (req: Request, res: Response) => {
  const q = String(req.query.q || "markets");
  try {
    const articles = await news.getLatestNews(q, 8);
    ok(res, { articles, sentiment: news.analyzeNewsSentiment(articles) });
  } catch (error) {
    fail(res, error);
  }
});

// ---- Integration liveness panel --------------------------------------------
router.get("/integrations", async (_req, res) => {
  try {
    const probes = await Promise.all([six.ping(), news.ping(), phoeniqs.ping()]);
    ok(res, { probes });
  } catch (error) {
    fail(res, error);
  }
});

export default router;
