import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { clients, recommendations } from "@/lib/mock-data";
import { Search, ArrowUpRight, ChevronDown, ChevronUp, X } from "lucide-react";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients, AURA" }, { name: "description", content: "Your book of relationships." }] }),
  component: ClientsPage,
});

function fmtCHF(m: number) {
  return m >= 1000 ? `CHF ${(m / 1000).toFixed(2)}B` : `CHF ${m.toFixed(1)}M`;
}

function ClientsPage() {
  const [q, setQ] = useState("");
  const [expand, setExpand] = useState(true);
  const [segment, setSegment] = useState<string>("All");
  const [domicile, setDomicile] = useState<string>("All");
  const [actionsOnly, setActionsOnly] = useState(false);

  const recsByClient = useMemo(() => {
    const m: Record<string, number> = {};
    recommendations.forEach((r) => { m[r.clientId] = (m[r.clientId] ?? 0) + 1; });
    return m;
  }, []);

  const domiciles = useMemo(() => {
    const set = new Set(clients.map((c) => c.domicile));
    return ["All", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => clients.filter((c) => {
    if (q && !(c.name + c.domicile + c.strategy + c.archetype).toLowerCase().includes(q.toLowerCase())) return false;
    if (segment !== "All" && c.segment !== segment) return false;
    if (domicile !== "All" && c.domicile !== domicile) return false;
    if (actionsOnly && !(recsByClient[c.id] > 0)) return false;
    return true;
  }), [q, segment, domicile, actionsOnly, recsByClient]);

  const visible = expand ? filtered : filtered.slice(0, 3);
  const filtersActive = segment !== "All" || domicile !== "All" || actionsOnly || q !== "";

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Clients" }]}>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">{clients.length} relationships</p>
          <h1 className="font-display text-5xl tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">Your book, at a glance. Tap any client to open their open actions, or their DNA when nothing is pending.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, city, strategy…"
            className="w-72 pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Filter</span>

        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Segment</span>
          <select value={segment} onChange={(e) => setSegment(e.target.value)}
            className="bg-surface border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
            {["All", "UHNWI", "HNWI"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Domicile</span>
          <select value={domicile} onChange={(e) => setDomicile(e.target.value)}
            className="bg-surface border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
            {domiciles.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <button
          onClick={() => setActionsOnly((v) => !v)}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${actionsOnly ? "bg-accent/15 text-accent border-accent/30" : "bg-surface text-muted-foreground border-border hover:text-foreground"}`}
        >
          Open actions only
        </button>

        {filtersActive && (
          <button
            onClick={() => { setQ(""); setSegment("All"); setDomicile("All"); setActionsOnly(false); }}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground tabular">{filtered.length} of {clients.length}</span>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.2fr_1fr_120px_120px_80px] gap-6 px-6 py-3 border-b border-border bg-secondary/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <div>Client</div><div>Strategy</div><div>Archetype</div>
          <div className="text-right">AUM</div><div className="text-right">Risk</div><div className="text-right">Actions</div>
        </div>
        {visible.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">No clients match these filters.</div>
        )}
        {visible.map((c) => {
          const open = recsByClient[c.id] ?? 0;
          const firstRec = recommendations.find((r) => r.clientId === c.id);
          // With rec → open the action. Without rec → open client DNA via the same route.
          const target = { to: "/recommendations/$id" as const, params: { id: firstRec ? firstRec.id : c.id } };
          return (
            <Link
              key={c.id} {...target}
              className="grid grid-cols-[1.4fr_1.2fr_1fr_120px_120px_80px] gap-6 px-6 py-5 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors items-center group"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground tabular">{c.segment} · {c.domicile} · {c.timezone}</div>
              </div>
              <div>
                <div className="text-sm">{c.strategy}</div>
                <div className="text-xs text-muted-foreground">{c.mandate}</div>
              </div>
              <div className="text-sm text-foreground/80 italic font-display">{c.archetype}</div>
              <div className="text-right tabular text-sm">{fmtCHF(c.aum)}</div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5">
                  <div className="w-16 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${c.riskScore * 10}%` }} />
                  </div>
                  <span className="text-xs tabular text-muted-foreground">{c.riskScore}</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground group-hover:text-foreground flex items-center justify-end gap-1">
                {open > 0 ? <span className="text-accent font-medium">{open} open</span> : <span>DNA</span>}
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
        {filtered.length > 3 && (
          <button
            onClick={() => setExpand((v) => !v)}
            className="w-full px-6 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5 border-t border-border"
          >
            {expand ? (
              <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Show all {filtered.length} clients <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>
    </AppShell>
  );
}
