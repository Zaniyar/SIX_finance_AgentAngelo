import { createFileRoute } from "@tanstack/react-router";
import { clients, recommendations, marketEvents } from "@/lib/mock-data";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3001";

async function fetchBackendClients() {
  try {
    const res = await fetch(`${BACKEND}/api/clients`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

function buildContext(backendClients: unknown[] | null) {
  const clientSummary = clients.map((c) => ({
    id: c.id, name: c.name, segment: c.segment, domicile: c.domicile, aum_chf_m: c.aum,
    strategy: c.strategy, mandate: c.mandate, riskScore: c.riskScore,
    archetype: c.archetype, communicationStyle: c.communicationStyle,
    preferredChannel: c.preferredChannel, timezone: c.timezone, workingHours: c.workingHours,
    dnaValues: c.dna.values.map((v) => v.label),
    sensitivities: c.dna.sensitivities,
    holdings: c.portfolio.holdings.map((h) => ({ ticker: h.ticker, name: h.name, weight_pct: h.weight, alert: h.alert })),
    allocation: c.portfolio.allocation,
  }));
  const recs = recommendations.map((r) => ({
    id: r.id, clientId: r.clientId, title: r.title, priority: r.priority, category: r.category, advised: r.advised,
  }));
  const events = marketEvents.map((e) => ({
    id: e.id, title: e.title, severity: e.severity, summary: e.summary,
    affected: e.affected.map((a) => ({ clientId: a.clientId, ticker: a.ticker, exposurePct: a.exposurePct, exposureChf_m: a.exposureChf })),
  }));
  return { clients: clientSummary, recommendations: recs, marketEvents: events, liveClients: backendClients ?? undefined };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: { role: string; content: string }[] };
        if (!Array.isArray(body.messages)) return new Response("messages[] required", { status: 400 });

        const backendClients = await fetchBackendClients();
        const ctx = buildContext(backendClients);

        // Forward to backend which has PHOENIQS_API_KEY already configured
        const upstream = await fetch(`${BACKEND}/api/copilot-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: body.messages,
            context: JSON.stringify(ctx),
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text();
          return new Response(`Backend error: ${text}`, { status: upstream.status });
        }

        // Pipe the SSE stream straight through
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      },
    },
  },
});
