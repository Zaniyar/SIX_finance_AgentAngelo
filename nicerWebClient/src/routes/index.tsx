import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { recommendations, kpis, getClient, marketEvents } from "@/lib/mock-data";
import { useState } from "react";
import { ArrowUpRight, AlertCircle, TrendingUp, Users, Wallet, Sparkles, AlertTriangle, Layers, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard, AgentAngelo - AURA" },
      { name: "description", content: "Next best actions across your book of clients." },
    ],
  }),
  component: Dashboard,
});

function fmtCHF(m: number) {
  if (m >= 1000) return `CHF ${(m / 1000).toFixed(2)}B`;
  return `CHF ${m.toFixed(1)}M`;
}

const categoryStyles: Record<string, string> = {
  Reputational: "bg-accent/10 text-accent border-accent/20",
  Macro: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  Concentration: "bg-destructive/10 text-destructive border-destructive/20",
  Liquidity: "bg-chart-5/15 text-foreground/70 border-border",
  Tax: "bg-secondary text-secondary-foreground border-border",
  Opportunity: "bg-positive/10 text-positive border-positive/20",
  Fraud: "bg-destructive/15 text-destructive border-destructive/30",
};


function Dashboard() {
  const [expandEvents, setExpandEvents] = useState(false);
  const [expandRecs, setExpandRecs] = useState(false);
  const highCount = recommendations.filter((r) => r.priority === "High").length;
  const eventClientCount = marketEvents.reduce((s, e) => s + e.affected.length, 0);

  const visibleEvents = expandEvents ? marketEvents : marketEvents.slice(0, 3);
  const visibleRecs = expandRecs ? recommendations : recommendations.slice(0, 3);

  return (
    <AppShell>
      {/* Hero greeting, the biggest thing on screen */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <h1 className="font-display text-6xl md:text-7xl tracking-tight leading-[0.95]">Good morning, Sarah.</h1>
        </div>
        <div className="text-right text-xs text-muted-foreground tabular hidden md:block">
          <div>{recommendations.length + marketEvents.length} items on your desk</div>
          <div>{highCount} high priority</div>
        </div>
      </div>

      {/* NEXT BEST ACTIONS, the only thing that matters today */}
      <div className="mb-5">
        <h2 className="font-display text-3xl tracking-tight">Next best actions</h2>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden mb-8">
        {visibleEvents.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
        {marketEvents.length > 3 && (
          <button
            onClick={() => setExpandEvents((v) => !v)}
            className="w-full px-6 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5 border-t border-border"
          >
            {expandEvents ? (
              <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Show all {marketEvents.length} events <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden mb-16">
        {recommendations.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_2.5fr_90px_70px] gap-5 px-6 py-3 border-b border-border bg-secondary/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <div>Client</div><div>Strategy</div><div>Recommendation</div><div>Category</div><div className="text-right">Review</div>
          </div>
        )}
        {visibleRecs.map((rec) => {
          const c = getClient(rec.clientId);
          return (
            <Link key={rec.id} to="/recommendations/$id" params={{ id: rec.id }}
            className="grid grid-cols-[1fr_1fr_2.5fr_90px_70px] gap-5 px-6 py-5 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors items-center group"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground tabular">{c.segment} · {fmtCHF(c.aum)}</div>
              </div>
              <div>
                <div className="text-sm">{c.strategy}</div>
                <div className="text-xs text-muted-foreground">{c.mandate}</div>
              </div>
              <div>
                <div className="text-sm leading-snug">{rec.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{rec.advised}</div>
              </div>
              <div>
                <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap ${categoryStyles[rec.category]}`}>{rec.category}</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Review <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
        {recommendations.length > 3 && (
          <button
            onClick={() => setExpandRecs((v) => !v)}
            className="w-full px-6 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5 border-t border-border"
          >
            {expandRecs ? (
              <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Show all {recommendations.length} actions <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>

      {/* KPIs at the bottom, ambient context, not the headline */}
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-3xl tracking-tight">Book at a glance</h3>
        <span className="text-[11px] text-muted-foreground">As of {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
      </div>
      <div className="grid grid-cols-4 gap-px bg-border rounded-lg overflow-hidden border border-border">
        <KpiCard label="Clients" value={String(kpis.clients)} sub="active relationships" icon={<Users className="w-4 h-4" />} />
        <KpiCard label="Assets under Management" value={fmtCHF(kpis.aum)} sub="+2.1% MTD" icon={<Wallet className="w-4 h-4" />} positive />
        <KpiCard label="Net New Money" value={`${fmtCHF(kpis.netNewMoney)}`} sub="YTD" icon={<TrendingUp className="w-4 h-4" />} positive />
        <KpiCard label="Profitability" value={`${kpis.profitability.toFixed(2)}%`} sub="of AUM, TTM" icon={<Sparkles className="w-4 h-4" />} />
      </div>
    </AppShell>
  );
}

function EventRow({ event: e }: { event: typeof marketEvents[number] }) {
  const isOpp = e.kind === "Opportunity";
  const iconWrap = isOpp ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive";
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors"
        aria-expanded={open}
      >
        <div className={`w-9 h-9 rounded-full ${iconWrap} flex items-center justify-center shrink-0`}>
          {isOpp ? <Sparkles className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-background text-foreground/70">Event · {e.kind}</span>
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${categoryStyles[e.category]}`}>{e.category}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
              <Layers className="w-3 h-3" /> {e.affected.length} client{e.affected.length > 1 ? "s" : ""} affected
            </span>
            <span className="text-[10px] text-muted-foreground tabular ml-auto">{e.date}</span>
          </div>
          <div className="font-medium leading-snug truncate">{e.title}</div>
          <div className="text-xs text-muted-foreground leading-snug line-clamp-1">{e.summary}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          <Link to="/events/$id" params={{ id: e.id }} onClick={(ev) => ev.stopPropagation()}
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition inline-flex items-center gap-1.5">
            Brief <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </button>
      {open && (
        <div className="px-6 pb-5 pl-[88px] space-y-1">
          {e.affected.map((a) => {
            const c = getClient(a.clientId);
            const metric = isOpp
              ? `Fit ${a.fitScore}/100`
              : `${(a.exposurePct ?? 0).toFixed(1)}% · ${fmtCHF(a.exposureChf ?? 0)}`;
            return (
              <Link key={a.clientId} to="/events/$id" params={{ id: e.id }}
                className="flex items-center gap-3 py-2 px-3 -mx-3 rounded hover:bg-secondary/40 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {isOpp ? a.fitReason : `${c.preferredChannel} · ${c.timezone}`}
                  </div>
                </div>
                <div className="text-xs tabular text-muted-foreground whitespace-nowrap">{metric}</div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, positive }: { label: string; value: string; sub: string; icon: React.ReactNode; positive?: boolean }) {
  return (
    <div className="bg-surface p-6">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-[0.14em]">{label}</span>{icon}
      </div>
      <div className="mt-4 font-display text-4xl tracking-tight tabular">{value}</div>
      <div className={`mt-1 text-xs tabular ${positive ? "text-positive" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}
