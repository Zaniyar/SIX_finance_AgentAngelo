import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  buildEventCardProps,
  buildRecommendationCardProps,
  ICON_GROUP_META,
  ICON_GROUP_ORDER,
  type IconGroupId,
} from "@/components/action-todo-tile";
import { ActionTodoStack, STACK_CARD_W, type StackCard } from "@/components/action-todo-stack";
import { ClientFlipCard } from "@/components/client-flip-card";
import { recommendations, kpis, getClient, marketEvents } from "@/lib/mock-data";
import { Sparkles, TrendingUp, Users, Wallet, LayoutList, LayoutGrid, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

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

type DashView = "card" | "list";

function Dashboard() {
  const [view, setView] = useState<DashView>("list");
  const [expandedGroup, setExpandedGroup] = useState<IconGroupId | null>(null);
  const [expandedEvents, setExpandedEvents] = useState(false);

  const groupedStacks = useMemo(() => {
    const buckets: Record<IconGroupId, StackCard[]> = {
      alert: [],
      opportunity: [],
      macro: [],
      other: [],
    };

    for (const e of marketEvents) {
      const card = buildEventCardProps({
        kind: e.kind,
        category: e.category,
        categoryClassName: categoryStyles[e.category] ?? categoryStyles.Macro,
        title: e.title,
        affectedCount: e.affected.length,
        date: e.date,
        eventId: e.id,
      });
      buckets[card.iconGroup].push(card);
    }

    for (const rec of recommendations) {
      const c = getClient(rec.clientId);
      const card = buildRecommendationCardProps({
        recId: rec.id,
        clientName: c.name,
        segment: c.segment,
        aumLabel: fmtCHF(c.aum),
        title: rec.title,
        category: rec.category,
        priority: rec.priority,
        categoryClassName: categoryStyles[rec.category] ?? categoryStyles.Macro,
      });
      buckets[card.iconGroup].push(card);
    }

    return ICON_GROUP_ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
      id,
      ...ICON_GROUP_META[id],
      items: buckets[id],
    }));
  }, []);

  const bookClients = useMemo(
    () =>
      recommendations.slice(0, 4).map((rec) => ({
        rec,
        client: getClient(rec.clientId),
      })),
    [],
  );

  // All events for list view
  const allEvents = useMemo(() => marketEvents.map(e => ({
    ...e,
    categoryClass: categoryStyles[e.category] ?? categoryStyles.Macro,
  })), []);

  const visibleEvents = expandedEvents ? allEvents : allEvents.slice(0, 3);

  return (
    <AppShell>
      {/* View switcher */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-display text-5xl tracking-tight">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, Michael.
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {groupedStacks.reduce((s, g) => s + g.items.length, 0)} items on your desk &nbsp;·&nbsp;{" "}
            <span className="text-destructive font-medium">
              {groupedStacks.find(g => g.id === "alert")?.items.length ?? 0} high priority
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-secondary/30">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setView("card")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "card" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
        </div>
      </div>

      {view === "card" ? (
        <>
          <section className="mb-16">
            <h2 className="font-display text-3xl tracking-tight mb-2">Next best actions</h2>
            <div className="mt-2 flex flex-wrap items-start gap-y-6" style={{ columnGap: 56 }}>
              {groupedStacks.map((group) => (
                <div key={group.id} className="flex shrink-0 flex-col" style={{ width: STACK_CARD_W }}>
                  <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-border/80 bg-secondary/40">{group.icon}</span>
                    {group.label}
                    <span className="tabular-nums text-muted-foreground/60">({group.items.length})</span>
                  </div>
                  <ActionTodoStack items={group.items} compact expanded={expandedGroup === group.id} onExpandedChange={(open) => setExpandedGroup(open ? group.id : null)} />
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-display text-3xl tracking-tight">Your book</h3>
              <span className="text-[11px] text-muted-foreground">Tap a card to flip</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {bookClients.map(({ client, rec }) => (
                <ClientFlipCard key={rec.id} client={client} rec={rec} aumLabel={fmtCHF(client.aum)} categoryClassName={categoryStyles[rec.category] ?? categoryStyles.Macro} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          {/* LIST VIEW — matches the screenshot */}
          <section className="mb-10">
            <h2 className="font-display text-3xl tracking-tight mb-4">Next best actions</h2>
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {visibleEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-4 px-5 py-4 bg-surface hover:bg-secondary/30 transition-colors group">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${e.kind === "Risk" ? "bg-destructive/10" : "bg-positive/10"}`}>
                    {e.kind === "Risk"
                      ? <span className="text-destructive text-xs">⚠</span>
                      : <span className="text-positive text-xs">✦</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-[10px] uppercase tracking-wider">
                    <span className="text-muted-foreground">Event · {e.kind}</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${e.categoryClass}`}>{e.category}</span>
                    <span className="text-muted-foreground">⊗ {e.affected.length} clients affected</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{e.date} CET</span>
                  <Link to="/events/$id" params={{ id: e.id }}
                    className="ml-4 flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 transition flex items-center gap-1.5">
                    Brief <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
              {/* Expanded rows show summary */}
              {visibleEvents.map((e) => (
                <div key={e.id + "-body"} className="px-5 py-3 bg-secondary/20 border-t-0">
                  <div className="font-semibold text-sm mb-0.5">{e.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{e.summary}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setExpandedEvents(v => !v)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition py-2"
            >
              {expandedEvents ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {allEvents.length} events</>}
            </button>
          </section>

          {/* Client recommendation table */}
          <section className="mb-10">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Client</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Strategy</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Recommendation</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Category</th>
                    <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookClients.map(({ client, rec }) => (
                    <tr key={rec.id} className="bg-surface hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold">{client.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{client.segment} · {fmtCHF(client.aum)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm">{rec.outreach.style}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{client.mandate}</div>
                      </td>
                      <td className="px-5 py-4 max-w-sm">
                        <div className="font-medium text-sm">{rec.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.advised}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded border uppercase tracking-wide ${categoryStyles[rec.category] ?? categoryStyles.Macro}`}>
                          {rec.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link to="/recommendations/$id" params={{ id: rec.id }}
                          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 justify-end">
                          Review <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-border bg-secondary/20 text-center">
                <button className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1 mx-auto">
                  <ChevronDown className="w-3.5 h-3.5" /> Show all {recommendations.length} actions
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-3xl tracking-tight">Book at a glance</h2>
          <span className="text-[11px] text-muted-foreground">
            As of {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <KpiCard label="Clients" value={String(kpis.clients)} sub="active relationships" icon={<Users className="h-4 w-4" />} />
          <KpiCard label="Assets under Management" value={fmtCHF(kpis.aum)} sub="+2.1% MTD" icon={<Wallet className="h-4 w-4" />} positive />
          <KpiCard label="Net New Money" value={`${fmtCHF(kpis.netNewMoney)}`} sub="YTD" icon={<TrendingUp className="h-4 w-4" />} positive />
          <KpiCard label="Profitability" value={`${kpis.profitability.toFixed(2)}%`} sub="of AUM, TTM" icon={<Sparkles className="h-4 w-4" />} />
        </div>
      </section>
    </AppShell>
  );
}

function KpiCard({ label, value, sub, icon, positive }: { label: string; value: string; sub: string; icon: React.ReactNode; positive?: boolean }) {
  return (
    <div className="bg-surface p-6">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-[0.14em]">{label}</span>
        {icon}
      </div>
      <div className="mt-4 font-display text-4xl tracking-tight tabular">{value}</div>
      <div className={`mt-1 text-xs tabular ${positive ? "text-positive" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}
