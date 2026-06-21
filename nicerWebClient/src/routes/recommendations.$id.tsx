import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback, useContext, createContext, useLayoutEffect, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { AppShell } from "@/components/app-shell";
import {
  getRecommendation,
  getClient,
  findRecByTicker,
  findEventByTicker,
  getRecsForClient,
  recommendations,
  clients,
  type Channel,
  type Confidence,
  type MessageVariant,
} from "@/lib/mock-data";
import {
  Check, X, ArrowLeft, MessageSquare, Phone, Mail, Smartphone, UserCheck, Clock, AlertTriangle,
  FileText, Shield, Sparkles, ExternalLink, ChevronRight, ChevronLeft, ChevronDown, Layers, Star, Users, Briefcase, Scale,
  Compass, ShieldAlert, ThumbsUp, ThumbsDown, Trash2, Heart, Cake, Quote, Gift, Newspaper, PhoneCall, ArrowDownLeft, ArrowUpRight,
  LayoutGrid, LayoutList, Infinity, Settings2, Eye, EyeOff,
} from "lucide-react";
import { AngeloCallButton } from "@/components/AngeloCallButton";
import { ClientDnaBoard } from "@/components/client-dna-board";
import { ClientContextChat } from "@/components/client-context-chat";
import { ClientPageChatProvider, type ClientPageTab } from "@/components/client-page-chat-context";
import { AskAiSelectionMenu } from "@/components/ask-ai-selection-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Client, Recommendation } from "@/lib/mock-data";

export const Route = createFileRoute("/recommendations/$id")({
  head: () => ({ meta: [{ title: `Recommendation, AURA` }] }),
  validateSearch: (s: Record<string, unknown>): { draft?: string; source?: string } => ({
    draft: typeof s.draft === "string" ? s.draft : undefined,
    source: typeof s.source === "string" ? s.source : undefined,
  }),
  notFoundComponent: () => (<AppShell><div className="py-20 text-center text-muted-foreground">Not found.</div></AppShell>),
  loader: ({ params }) => {
    // Accept either a recommendation id or a client id (for DNA-only view).
    const rec = recommendations.find((r) => r.id === params.id);
    if (rec) return { id: params.id, mode: "rec" as const };
    const c = clients.find((cl) => cl.id === params.id);
    if (c) return { id: params.id, mode: "client" as const };
    throw notFound();
  },
  component: RecommendationDetail,
});

const channels: Channel[] = ["Email", "Phone", "WhatsApp", "In-Person", "Assistant"];
const channelIcon: Record<Channel, React.ReactNode> = {
  Email: <Mail className="w-4 h-4" />,
  Phone: <Phone className="w-4 h-4" />,
  WhatsApp: <Smartphone className="w-4 h-4" />,
  "In-Person": <UserCheck className="w-4 h-4" />,
  Assistant: <UserCheck className="w-4 h-4" />,
};

// Per-channel timing & tone hint
const channelHints: Record<Channel, { timing: string; tone: string }> = {
  Email: { timing: "Best within reading windows (early morning, late afternoon)", tone: "Full sentences, polite frame, sign off with name" },
  Phone: { timing: "Inside the client's working hours, avoid lunch", tone: "Spoken cadence, short, one ask per call" },
  WhatsApp: { timing: "Anytime in their day, expect a 2h reply window", tone: "Terse, no salutation, numbers welcome" },
  "In-Person": { timing: "Next scheduled review or coffee", tone: "Conversational, lead with relationship context" },
  Assistant: { timing: "Send to assistant during their hours, ask for routing", tone: "Brief for the assistant, then full content for client" },
};

function RecommendationDetail() {
  const { id, mode } = Route.useLoaderData();
  const { draft: copilotDraft, source: copilotSource } = Route.useSearch();
  const isClientOnly = mode === "client";
  // In client-only mode, pick the first available rec (if any) just so closures that read
  // `rec.*` don't crash. We early-return before rendering rec-specific UI.
  const fallbackRecForClient = isClientOnly ? recommendations.find((r) => r.clientId === id) : undefined;
  const rec = isClientOnly
    ? (fallbackRecForClient ?? recommendations[0])
    : getRecommendation(id);
  const client = getClient(isClientOnly ? id : rec.clientId);
  const navigate = useNavigate();
  const [tab, setTab] = useState<ClientPageTab>(isClientOnly ? "dna" : "reco");
  const [viewMode, setViewMode] = useState<"list" | "tile">("list");

  // Auto-open all CollapsibleCards when tab or viewMode changes
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll<HTMLButtonElement>(".bento-card-trigger").forEach((btn) => {
        if (btn.getAttribute("aria-expanded") === "false") btn.click();
      });
    }, 80);
    return () => clearTimeout(t);
  }, [tab, viewMode]);

  const allRecs = getRecsForClient(client.id);
  const otherRecs = allRecs.filter((r) => r.id !== rec.id);
  const activeIdx = allRecs.findIndex((r) => r.id === rec.id);

  // Pool state, used only for combined briefing in message studio
  const [pooled, setPooled] = useState<Record<string, boolean>>({});
  const pooledRecs = useMemo(
    () => [rec, ...otherRecs.filter((r) => pooled[r.id])],
    [rec, otherRecs, pooled],
  );
  const isPooling = pooledRecs.length > 1;

  const chatRecs = useMemo(
    () => (tab === "reco" ? pooledRecs : allRecs),
    [tab, pooledRecs, allRecs],
  );

  const chatSidebar = (
    <aside className="col-span-12 space-y-4 xl:col-span-4 xl:sticky xl:top-24">
      {tab === "reco" && !isClientOnly && (
        <MessageStudio copilotDraft={copilotDraft} copilotSource={copilotSource} />
      )}
      <div data-ask-ai-ignore>
        <ClientContextChat />
      </div>
    </aside>
  );

  const tabContent = (
    <div className="grid grid-cols-12 items-start gap-4">
      <div className="col-span-12 xl:col-span-8">
        {tab === "reco" && !isClientOnly && <RecoTab />}
        {tab === "portfolio" && <PortfolioTab />}
        {tab === "dna" && <DnaTab />}
      </div>
      {chatSidebar}
    </div>
  );

  // Discard dialog
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [discardCategory, setDiscardCategory] = useState<string>("Not relevant for this client");
  const [avatarOpen, setAvatarOpen] = useState(false);

  function goTo(id: string) {
    navigate({ to: "/recommendations/$id", params: { id } });
  }

  // Client-only mode: no rec selected, show DNA + Portfolio.
  if (isClientOnly) {
    return (
      <ClientPageChatProvider client={client} recs={allRecs} activeTab={tab}>
        <AskAiSelectionMenu />
        <AppShell breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Clients", to: "/clients" }, { label: client.name }]}>
        <div className="flex items-start justify-between mb-6 gap-6">
          <div className="flex items-start gap-4 min-w-0">
            {client.avatar ? (
              <button
                onClick={() => setAvatarOpen(true)}
                className="shrink-0 mt-10 group/avatar relative"
                aria-label={`Enlarge photo of ${client.name}`}
              >
                <img src={client.avatar} alt={client.name}
                  className="w-14 h-14 rounded-full object-cover border border-border transition-transform group-hover/avatar:scale-105" />
                <span className="absolute inset-0 rounded-full ring-1 ring-accent/0 group-hover/avatar:ring-accent/40 transition" />
              </button>
            ) : (
              <div className="w-14 h-14 mt-1 rounded-full bg-secondary flex items-center justify-center font-medium shrink-0">
                {client.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </div>
            )}
            <div className="min-w-0">
              <Link to="/clients" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3">
                <ArrowLeft className="w-3 h-3" /> Back to clients
              </Link>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{client.segment} · {client.mandate}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-secondary text-foreground/70 border-border">
                  No open actions
                </span>
              </div>
              <h1 className="font-display text-4xl tracking-tight">{client.name}</h1>
            </div>
          </div>
        </div>

        {avatarOpen && client.avatar && (
          <div onClick={() => setAvatarOpen(false)}
            className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out">
            <div className="relative max-w-[520px] w-full" onClick={(e) => e.stopPropagation()}>
              <img src={client.avatar} alt={client.name}
                className="w-full aspect-square object-cover rounded-lg border border-border shadow-2xl" />
              <div className="mt-3 text-center">
                <div className="font-display text-2xl tracking-tight">{client.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{client.archetype} · {client.domicile}</div>
              </div>
              <button onClick={() => setAvatarOpen(false)}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="border-b border-border mb-8">
          <div className="flex gap-8">
            {[{ id: "dna", label: "Client DNA" }, { id: "portfolio", label: "Portfolio" }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                className={`pb-3 text-sm relative transition-colors ${tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
                {tab === t.id && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-accent" />}
              </button>
            ))}
          </div>
        </div>

        {tabContent}
        </AppShell>
      </ClientPageChatProvider>
    );
  }



  return (
    <ClientPageChatProvider client={client} recs={chatRecs} activeTab={tab}>
      <AskAiSelectionMenu />
      <AppShell breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: client.name }, { label: "Actions" }]}>
      <div className="flex items-start justify-between mb-6 gap-6">
        <div className="flex items-start gap-4 min-w-0">
          {client.avatar ? (
            <button
              onClick={() => setAvatarOpen(true)}
              className="shrink-0 mt-10 group/avatar relative"
              aria-label={`Enlarge photo of ${client.name}`}
            >
              <img src={client.avatar} alt={client.name}
                className="w-14 h-14 rounded-full object-cover border border-border transition-transform group-hover/avatar:scale-105" />
              <span className="absolute inset-0 rounded-full ring-1 ring-accent/0 group-hover/avatar:ring-accent/40 transition" />
            </button>
          ) : (
            <div className="w-14 h-14 mt-1 rounded-full bg-secondary flex items-center justify-center font-medium shrink-0">
              {client.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
          )}
          <div className="min-w-0">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3">
              <ArrowLeft className="w-3 h-3" /> Back to book
            </Link>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{client.segment} · {client.mandate}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${rec.priority === "High" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-accent/10 text-accent border-accent/20"}`}>
                {rec.priority} priority
              </span>
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-secondary text-foreground/70 border-border">
                {rec.category}
              </span>
            </div>
            <h1 className="font-display text-4xl tracking-tight">{client.name}</h1>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <button onClick={() => setDiscardOpen(true)}
            className="px-3.5 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:bg-destructive/5 hover:border-destructive/40 hover:text-destructive transition flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Discard
          </button>
          <div className="text-[10px] text-muted-foreground max-w-[180px] text-right leading-snug">
            Your reason trains the agent. No silent rejections.
          </div>
        </div>
      </div>

      {avatarOpen && client.avatar && (
        <div
          onClick={() => setAvatarOpen(false)}
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
        >
          <div className="relative max-w-[520px] w-full" onClick={(e) => e.stopPropagation()}>
            <img src={client.avatar} alt={client.name}
              className="w-full aspect-square object-cover rounded-lg border border-border shadow-2xl" />
            <div className="mt-3 text-center">
              <div className="font-display text-2xl tracking-tight">{client.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{client.archetype} · {client.domicile}</div>
            </div>
            <button onClick={() => setAvatarOpen(false)}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recommendation carousel, all open actions for this client */}
      {allRecs.length > 1 && (
        <CollapsibleCard
          className="mb-8"
          defaultOpen={false}
          accent="accent"
          triggerClassName="p-4"
          contentClassName="px-4 pb-4 pt-0"
          icon={<Layers />}
          title={`${allRecs.length} open actions`}
          subtitle={`For ${client.name.split(" ")[0]}`}
          header={
            <>
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm", accentStyles.accent.icon, "[&_svg]:h-7 [&_svg]:w-7")}>
                  <Layers />
                </div>
                <div>
                  <div className="font-display text-lg tracking-tight">{allRecs.length} open actions</div>
                  <div className="text-sm text-muted-foreground">For {client.name.split(" ")[0]}</div>
                </div>
              </div>
              {allRecs.length > 4 && (
                <div className="mr-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => goTo(allRecs[(activeIdx - 1 + allRecs.length) % allRecs.length].id)}
                    className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-secondary/50 transition"
                    aria-label="Previous">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] tabular text-muted-foreground">{activeIdx + 1} / {allRecs.length}</span>
                  <button onClick={() => goTo(allRecs[(activeIdx + 1) % allRecs.length].id)}
                    className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-secondary/50 transition"
                    aria-label="Next">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          }
        >
          <div className={allRecs.length > 4
            ? "flex gap-3 overflow-x-auto -mx-1 px-1 pb-1"
            : "grid gap-3"}
            style={allRecs.length > 4 ? undefined : { gridTemplateColumns: `repeat(${allRecs.length}, minmax(0, 1fr))` }}>
            {allRecs.map((r) => {
              const active = r.id === rec.id;
              const pool = pooled[r.id];
              return (
                <div key={r.id}
                  className={`${allRecs.length > 4 ? "shrink-0 w-[320px]" : ""} rounded border transition flex flex-col ${active ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/40"}`}>
                  <button onClick={() => !active && goTo(r.id)}
                    className="text-left w-full p-3 cursor-pointer flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${r.priority === "High" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>
                        {r.priority}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.category}</span>
                      {active && <span className="ml-auto text-[10px] uppercase tracking-wider text-accent">Viewing</span>}
                    </div>
                    <div className="text-sm font-medium leading-snug">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.advised}</div>
                  </button>
                  {!active && (
                    <label className="flex items-center gap-2 px-3 py-2 border-t border-border text-[11px] text-muted-foreground cursor-pointer hover:bg-secondary/40">
                      <input type="checkbox" checked={!!pool}
                        onChange={() => setPooled((p) => ({ ...p, [r.id]: !p[r.id] }))}
                        className="w-3.5 h-3.5 accent-accent" />
                      Pool with current for one combined message
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          {isPooling && (
            <div className="mt-3 text-[11px] text-accent flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Pooled briefing active. The message studio combines {pooledRecs.length} actions into one outreach.
            </div>
          )}
        </CollapsibleCard>
      )}

      {discardOpen && (
        <DiscardDialog
          recTitle={rec.title}
          clientName={client.name}
          category={discardCategory}
          setCategory={setDiscardCategory}
          reason={discardReason}
          setReason={setDiscardReason}
          onClose={() => setDiscardOpen(false)}
          onConfirm={() => { setDiscardOpen(false); setDiscardReason(""); }}
        />
      )}


      <div className="border-b border-border mb-8 flex items-end justify-between">
        <div className="flex gap-8">
          {[{ id: "reco", label: "Recommendation" }, { id: "portfolio", label: "Portfolio" }, { id: "dna", label: "Client DNA" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`pb-3 text-sm relative transition-colors ${tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
              {tab === t.id && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-accent" />}
            </button>
          ))}
        </div>
        {/* View toggle: List (Lovable) ↔ Tiles */}
        <div className="flex items-center gap-1 mb-2 p-0.5 rounded-lg border border-border bg-secondary/30">
          <button
            onClick={() => setViewMode("list")}
            title="List view"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode("tile")}
            title="Tile view"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "tile" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Tiles
          </button>
        </div>
      </div>

      {tabContent}
    </AppShell>
    </ClientPageChatProvider>
  );

  function RecoTab() {
    type RecoWidgetKey = "proposed" | "why" | "storyline" | "confidence" | "risks" | "alternatives" | "human" | "business" | "compliance";
    const { hiddenWidgets, editingWidgets, setEditingWidgets, widgetTileProps, showWidget } =
      useBentoWidgetVisibility<RecoWidgetKey>("aura-reco-widget-visibility");

    const resolveRecoPanelIds = useCallback(
      (key: string) => pooledRecs.map((r) => `${r.id}-${key}`),
      [pooledRecs],
    );

    // ── LIST VIEW (Lovable default) ────────────────────────────────────────────
    if (viewMode === "list") {
      return (
        <div className="space-y-6">
          {pooledRecs.map((r, idx) => (
            <div key={r.id}>
              {isPooling && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent">#{idx + 1}</span>
                  <h2 className="font-display text-xl tracking-tight">{r.title}</h2>
                </div>
              )}
              <Section title="Proposed action" icon={<Sparkles className="w-4 h-4" />}>
                <p className="text-lg font-display leading-snug">{r.advised}</p>
                <div className="grid grid-cols-4 gap-px bg-border mt-5 rounded overflow-hidden border border-border">
                  <Stat label="Portfolio fit" value={`${r.impact.portfolioFit}/100`} />
                  <Stat label="Risk Δ" value={r.impact.riskDelta} />
                  <Stat label="Expected return" value={r.impact.expectedReturn} />
                  <Stat label="Sector shift" value={r.impact.sectorShift} small />
                </div>
              </Section>
              <div className="mt-6">
                <Section title="Why this matters" icon={<FileText className="w-4 h-4" />}>
                  <div className="grid grid-cols-1 gap-5">
                    <Reason label="Why now?" body={r.trigger} />
                    <Reason label="Why this client?" body={r.whyClient} />
                    <Reason label="Why this action?" body={r.whyAction} />
                  </div>
                </Section>
              </div>
              <div className="mt-6">
                <Section title="Storyline & evidence" icon={<FileText className="w-4 h-4" />} subtitle="All claims cite a source the RM can open">
                  <p className="text-sm leading-relaxed text-foreground/90">{r.reason.storyline}</p>
                  <div className="mt-5 border-t border-border pt-4 space-y-3">
                    {r.reason.sources.map((s, i) => (
                      <a key={i} href={s.url ?? "#"} target="_blank" rel="noreferrer"
                        className="group grid grid-cols-[28px_1fr_auto] gap-3 items-start hover:bg-secondary/30 -mx-2 px-2 py-1.5 rounded transition">
                        <span className="text-[10px] tabular font-mono text-accent mt-0.5">[{i + 1}]</span>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1.5">{s.label}<ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition" /></div>
                          {s.outlet && <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.outlet}</div>}
                          {s.excerpt && <div className="text-xs text-foreground/70 italic mt-1 leading-snug border-l-2 border-border pl-2">"{s.excerpt}"</div>}
                        </div>
                        <div className="text-xs text-muted-foreground tabular whitespace-nowrap">{s.date}</div>
                      </a>
                    ))}
                  </div>
                </Section>
              </div>
              {r.confidence && (
                <div className="mt-6">
                  <Section title="How confident is the AI, and on what?" icon={<ShieldAlert className="w-4 h-4" />} subtitle="Interrogate before you send">
                    <div className="grid grid-cols-[160px_1fr] gap-5 items-start">
                      <div>
                        <div className="relative w-32 h-32">
                          <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2"
                              className={r.confidence.score >= 80 ? "text-positive" : r.confidence.score >= 60 ? "text-accent" : "text-destructive"}
                              strokeDasharray={`${r.confidence.score} 100`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="font-display text-3xl tabular">{r.confidence.score}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">confidence</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Assumptions baked in</div>
                            <ul className="space-y-1 text-sm">{r.confidence.assumptions.map((a, i) => <li key={i} className="flex gap-2"><span className="text-accent">·</span>{a}</li>)}</ul>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">What the AI does not know</div>
                            <ul className="space-y-1 text-sm">{r.confidence.unknowns.map((a, i) => <li key={i} className="flex gap-2"><span className="text-destructive">?</span>{a}</li>)}</ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Section>
                </div>
              )}
              {(r.counterArguments?.length || r.alternatives?.length) && (
                <div className="mt-6 grid grid-cols-2 gap-6">
                  {r.counterArguments?.length ? (
                    <Section title="What could go wrong" icon={<ShieldAlert className="w-4 h-4" />}>
                      <ul className="space-y-2.5 text-sm">{r.counterArguments.map((c, i) => <li key={i} className="flex gap-2 pb-2.5 border-b border-border last:border-b-0 last:pb-0"><span className="text-destructive font-mono text-xs mt-0.5">{String(i+1).padStart(2,"0")}</span><span>{c}</span></li>)}</ul>
                    </Section>
                  ) : null}
                  {r.alternatives?.length ? (
                    <Section title="Alternatives considered" icon={<Layers className="w-4 h-4" />}>
                      <ul className="space-y-3 text-sm">{r.alternatives.map((a, i) => <li key={i} className="pb-3 border-b border-border last:border-b-0 last:pb-0"><div className="font-medium">{a.option}</div><div className="text-xs text-muted-foreground">{a.whyNot}</div></li>)}</ul>
                    </Section>
                  ) : null}
                </div>
              )}
              {(r.revenueImpact || r.personalImpact) && (
                <div className="mt-6 grid grid-cols-2 gap-6">
                  {r.personalImpact && (
                    <Section title="The human spark" icon={<Heart className="w-4 h-4" />} subtitle={`Angle: ${r.personalImpact.angle}`}>
                      <div className="relative bg-gradient-to-br from-accent/10 via-surface to-surface border border-accent/20 rounded p-4">
                        <Quote className="w-4 h-4 text-accent/50 mb-2" />
                        <p className="text-sm leading-relaxed italic">{r.personalImpact.story}</p>
                      </div>
                    </Section>
                  )}
                  {r.revenueImpact && (
                    <Section title="Business value for the bank" icon={<Briefcase className="w-4 h-4" />}>
                      <div className="space-y-3 text-sm">
                        <Kv label="Incremental fees" value={r.revenueImpact.feesChf} />
                        {r.revenueImpact.crossSell && <Kv label="Adjacent opportunity" value={r.revenueImpact.crossSell} />}
                      </div>
                    </Section>
                  )}
                </div>
              )}
              {idx === pooledRecs.length - 1 && (
                <div className="mt-6">
                  <Section title="Policy Engine · Regulatory & Compliance" icon={<Shield className="w-4 h-4" />}>
                    <div className="grid grid-cols-3 gap-4">
                      <CheckRow ok={r.compliance.mandateOk} label="Mandate fit" />
                      <CheckRow ok={r.compliance.suitabilityOk} label="Suitability" />
                      <CheckRow ok={r.compliance.cioApproved} label="CIO universe" />
                    </div>
                  </Section>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // ── TILE VIEW (Bento, existing) ────────────────────────────────────────────
    return (
      <BentoBoard>
        <HiddenWidgetPanelCloser
          editingWidgets={editingWidgets}
          hiddenWidgets={hiddenWidgets}
          resolvePanelIds={resolveRecoPanelIds}
        />
        <div className="space-y-3">
            <WidgetCustomizeHeader
              editingWidgets={editingWidgets}
              onToggleEdit={() => setEditingWidgets((on) => !on)}
            />

            {pooledRecs.map((r, idx) => (
              <div key={r.id}>
                {isPooling && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">#{idx + 1}</span>
                    <h2 className="font-display text-xl tracking-tight">{r.title}</h2>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {showWidget("proposed") && (
                  <Section
                    id={`${r.id}-proposed`}
                    title="Proposed action"
                    icon={<Sparkles />}
                    accent="accent"
                    bento="square"
                    {...widgetTileProps("proposed")}
                  >
                <p className="font-display text-lg leading-snug">{r.advised}</p>
                <div className="mt-5 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border">
                  <Stat label="Portfolio fit" value={`${r.impact.portfolioFit}/100`} />
                  <Stat label="Risk Δ" value={r.impact.riskDelta} />
                  <Stat label="Expected return" value={r.impact.expectedReturn} />
                  <Stat label="Sector shift" value={r.impact.sectorShift} small />
                </div>
              </Section>
                  )}

              {showWidget("why") && (
              <Section id={`${r.id}-why`} title="Why this matters" icon={<FileText />} accent="insight" bento="square" {...widgetTileProps("why")}>
                <div className="grid grid-cols-1 gap-5">
                  <Reason label="Why now?" body={r.trigger} />
                  <Reason label="Why this client?" body={r.whyClient} />
                  <Reason label="Why this action?" body={r.whyAction} />
                </div>
              </Section>
              )}

              {showWidget("storyline") && (
              <Section
                id={`${r.id}-storyline`}
                title="Storyline & evidence"
                icon={<Newspaper />}
                subtitle="All claims cite a source the RM can open"
                accent="evidence"
                bento="square"
                {...widgetTileProps("storyline")}
              >
                <p className="text-sm leading-relaxed text-foreground/90">
                  {renderStoryline(r.reason.storyline, r.reason.sources.length)}
                </p>
                <div className="mt-5 space-y-3 border-t border-border pt-4">
                  {r.reason.sources.map((s, i) => (
                    <a key={i} href={s.url ?? "#"} target="_blank" rel="noreferrer"
                      className="group -mx-2 grid grid-cols-[28px_1fr_auto] items-start gap-3 rounded-lg px-2 py-1.5 transition hover:bg-secondary/30">
                      <span className="mt-0.5 font-mono text-[10px] tabular text-accent">[{i + 1}]</span>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {s.label}
                          <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
                        </div>
                        {s.outlet && <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.outlet}</div>}
                        {s.excerpt && <div className="mt-1 border-l-2 border-border pl-2 text-xs italic leading-snug text-foreground/70">"{s.excerpt}"</div>}
                      </div>
                      <div className="whitespace-nowrap text-xs tabular text-muted-foreground">{s.date}</div>
                    </a>
                  ))}
                </div>
              </Section>
              )}

              {r.confidence && showWidget("confidence") && (
                <Section
                  id={`${r.id}-confidence`}
                  title="How confident is the AI, and on what?"
                  icon={<ShieldAlert />}
                  subtitle="Interrogate before you send"
                  accent="trust"
                  bento="square"
                  {...widgetTileProps("confidence")}
                >
                  <div className="grid grid-cols-[160px_1fr] items-start gap-5">
                    <div>
                      <div className="relative h-32 w-32">
                        <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2"
                            className={r.confidence.score >= 80 ? "text-positive" : r.confidence.score >= 60 ? "text-accent" : "text-destructive"}
                            strokeDasharray={`${r.confidence.score} 100`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="font-display text-3xl tabular">{r.confidence.score}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">confidence</div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] leading-snug text-muted-foreground">{r.confidence.dataFreshness}</div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">What the model actually did</div>
                        <p className="text-sm leading-relaxed text-foreground/90">{r.confidence.modelNote}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Assumptions baked in</div>
                          <ul className="space-y-1 text-sm">
                            {r.confidence.assumptions.map((a, i) => (
                              <li key={i} className="flex gap-2 leading-snug"><span className="text-accent">·</span>{a}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">What the AI does not know</div>
                          <ul className="space-y-1 text-sm">
                            {r.confidence.unknowns.map((a, i) => (
                              <li key={i} className="flex gap-2 leading-snug"><span className="text-destructive">?</span>{a}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>
              )}

              {!!r.counterArguments?.length && showWidget("risks") && (
                <Section
                  id={`${r.id}-risks`}
                  title="What could go wrong"
                  icon={<ShieldAlert />}
                  subtitle="The case against, written by the model"
                  accent="risk"
                  bento="square"
                  {...widgetTileProps("risks")}
                >
                  <ul className="space-y-2.5 text-sm">
                    {r.counterArguments.map((c, i) => (
                      <li key={i} className="flex gap-2 border-b border-border pb-2.5 leading-snug last:border-b-0 last:pb-0">
                        <span className="mt-0.5 font-mono text-xs text-destructive">{String(i + 1).padStart(2, "0")}</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {!!r.alternatives?.length && showWidget("alternatives") && (
                <Section id={`${r.id}-alternatives`} title="Alternatives considered" icon={<Layers />} subtitle="And why they lost" accent="insight" bento="square" {...widgetTileProps("alternatives")}>
                  <ul className="space-y-3 text-sm">
                    {r.alternatives.map((a, i) => (
                      <li key={i} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                        <div className="font-medium leading-snug">{a.option}</div>
                        <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{a.whyNot}</div>
                      </li>
                    ))}
                  </ul>
                  {r.pastTrack && (
                    <div className="mt-3 border-t border-border pt-3 text-[11px] leading-snug text-muted-foreground">
                      <span className="font-medium text-foreground/80">Track record:</span> {r.pastTrack.similarCases} similar cases · {r.pastTrack.hitRate}. Last: {r.pastTrack.lastExample}
                    </div>
                  )}
                </Section>
              )}

              {r.personalImpact && showWidget("human") && (
                <Section
                  id={`${r.id}-human`}
                  title="The human spark"
                  icon={<Heart />}
                  subtitle={`Angle: ${r.personalImpact.angle}`}
                  accent="human"
                  bento="square"
                  {...widgetTileProps("human")}
                >
                  <div className="relative rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface p-4">
                    <Quote className="mb-2 h-4 w-4 text-accent/50" />
                    <p className="text-sm italic leading-relaxed text-foreground/90">{r.personalImpact.story}</p>
                  </div>
                  <div className="mt-3 text-[11px] leading-snug text-muted-foreground">
                    Use sparingly. Only when it is honestly true for this client, never as a sales overlay.
                  </div>
                </Section>
              )}

              {r.revenueImpact && showWidget("business") && (
                <Section
                  id={`${r.id}-business`}
                  title="Business value for the bank"
                  icon={<Briefcase />}
                  subtitle="Transparent, so the RM owns the trade-off"
                  accent="business"
                  bento="square"
                  {...widgetTileProps("business")}
                >
                  <div className="space-y-3 text-sm">
                    <Kv label="Incremental fees" value={r.revenueImpact.feesChf} />
                    {r.revenueImpact.crossSell && <Kv label="Adjacent opportunity" value={r.revenueImpact.crossSell} />}
                    {r.revenueImpact.retentionLift && (
                      <div className="border-t border-border pt-2">
                        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Retention argument</div>
                        <div className="text-sm leading-snug">{r.revenueImpact.retentionLift}</div>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {idx === pooledRecs.length - 1 && showWidget("compliance") && (
                <Section id={`${r.id}-compliance`} title="Policy Engine · Regulatory & Compliance" icon={<Shield />} accent="trust" bento="square" {...widgetTileProps("compliance")}>
                  <div className="grid grid-cols-3 gap-4">
                    <CheckRow ok={r.compliance.mandateOk} label="Mandate fit" />
                    <CheckRow ok={r.compliance.suitabilityOk} label="Suitability" />
                    <CheckRow ok={r.compliance.cioApproved} label="CIO universe" />
                  </div>
                  {r.compliance.regulatoryFlags.length > 0 ? (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>{r.compliance.regulatoryFlags.join(" · ")}</div>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-muted-foreground">No regulatory flags. FINMA suitability constraints respected.</div>
                  )}
                </Section>
              )}
                </div>
                <BentoDetailPanel />
              </div>
            ))}
          </div>
      </BentoBoard>
    );
  }

  function MessageStudio({ copilotDraft, copilotSource }: { copilotDraft?: string; copilotSource?: string }) {
    const [channel, setChannel] = useState<Channel>(rec.outreach.channel);
    const variants: MessageVariant[] = rec.outreach.variants ?? [
      { style: rec.outreach.style, label: rec.outreach.style, subject: rec.outreach.subject, message: rec.outreach.message, bestFor: [rec.outreach.channel] },
    ];
    const [variantIdx, setVariantIdx] = useState(0);
    const isPreferredChannel = channel === client.preferredChannel;
    const overridden = channel !== rec.outreach.channel;

    const combinedSubject = isPooling
      ? `Two actions in your portfolio for ${client.name.split(" ")[0]}`
      : variants[variantIdx].subject;
    const baseMessage = isPooling
      ? `Dear ${client.name.split(" ")[0]},\n\nA short note covering ${pooledRecs.length} actions I'd like your nod on:\n\n` +
        pooledRecs.map((r, i) => `${i + 1}. ${r.title}\n   ${r.advised}`).join("\n\n") +
        `\n\nNeither changes your overall strategy or risk profile. Happy to walk you through both on a short call.\n\n- Michael`
      : variants[variantIdx].message;

    // If arriving from Copilot, prepend the AI context as a note
    const initialMessage = copilotDraft
      ? `${baseMessage}\n\n---\nCopilot context: ${copilotDraft}${copilotSource ? `\nSource: ${copilotSource}` : ""}`
      : baseMessage;

    const hint = channelHints[channel];

    // Tiptap editor
    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: "Draft your message…" }),
      ],
      content: initialMessage.split("\n").map(l => `<p>${l || "<br>"}</p>`).join(""),
      editorProps: {
        attributes: {
          class: "outline-none min-h-[220px] text-sm leading-relaxed font-sans",
        },
      },
    });

    // Sync content when variant / pooling changes
    useEffect(() => {
      if (!editor) return;
      const html = initialMessage.split("\n").map(l => `<p>${l || "<br>"}</p>`).join("");
      editor.commands.setContent(html);
    }, [variantIdx, isPooling, copilotDraft]);

    return (
      <CollapsibleCard
        defaultOpen={false}
        accent="studio"
        contentClassName="p-0 pt-0"
        header={
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div
              className={cn(
                "bento-card-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                accentStyles.studio.icon,
                "[&_svg]:h-8 [&_svg]:w-8",
              )}
            >
              <MessageSquare />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">How to reach out</div>
              <div className="font-display flex flex-wrap items-center gap-2 text-xl tracking-tight">
                Message studio
                {isPooling && <span className="text-xs text-accent">· pooled ({pooledRecs.length})</span>}
                {copilotDraft && (
                  <span className="rounded border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                    From Copilot
                  </span>
                )}
              </div>
            </div>
          </div>
        }
      >
        {copilotSource && (
          <div className="px-5 py-2.5 bg-accent/5 border-b border-accent/20 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-accent leading-snug">
              <span className="font-medium">News source:</span> {copilotSource}
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Channel picker */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Channel</div>
            <div className="grid grid-cols-5 gap-1.5">
              {channels.map((ch) => {
                const preferred = ch === client.preferredChannel;
                const active = channel === ch;
                return (
                  <button key={ch} onClick={() => setChannel(ch)}
                    className={`relative flex flex-col items-center gap-1 py-2 rounded border text-[10px] uppercase tracking-wider transition ${
                      active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-secondary/40"
                    }`}>
                    {preferred && (
                      <span className="absolute -top-1.5 -right-1.5 text-[8px] font-mono uppercase tracking-wider px-1 py-px rounded bg-primary text-primary-foreground leading-tight">Pref</span>
                    )}
                    {channelIcon[ch]}
                    <span>{ch}</span>
                  </button>
                );
              })}
            </div>
            {!isPreferredChannel && (
              <div className="mt-2 text-[11px] text-accent flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Not the client's preferred channel ({client.preferredChannel}). Tone adapted.
              </div>
            )}
            <div className="mt-2 text-[11px] text-muted-foreground leading-snug border-l-2 border-border pl-2">
              <span className="font-medium text-foreground/80">{channel} tone:</span> {hint.tone}.<br />
              <span className="font-medium text-foreground/80">Timing:</span> {hint.timing}.
            </div>
          </div>

          {/* Style variants */}
          {!isPooling && variants.length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                <span>Style draft</span>
                <span className="text-muted-foreground/70 normal-case">{variants.length} options</span>
              </div>
              <div className="grid gap-1.5">
                {variants.map((v, i) => {
                  const fitsChannel = v.bestFor.includes(channel);
                  const active = i === variantIdx;
                  return (
                    <button key={i} onClick={() => setVariantIdx(i)}
                      className={`flex items-center gap-2 px-3 py-2 rounded border text-left text-xs transition ${
                        active ? "border-accent bg-accent/10" : "border-border hover:bg-secondary/40"
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-accent" : "bg-muted-foreground/40"}`} />
                      <span className="flex-1"><span className="font-medium">{v.label}</span><span className="text-muted-foreground"> · {v.style}</span></span>
                      {fitsChannel && <span className="text-[9px] uppercase tracking-wider text-positive">Good fit</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timing */}
          <div className="rounded border border-border p-3 bg-secondary/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" /> Suggested timing
            </div>
            <div className="text-sm font-medium">{rec.outreach.timing}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">{rec.outreach.timingReason}</div>
            {client.hasAssistant && (
              <div className="mt-2 pt-2 border-t border-border text-xs flex items-center gap-1.5 text-foreground/80">
                <UserCheck className="w-3 h-3" /> Assistant on file: <span className="font-medium">{client.assistantName}</span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Subject</div>
            <input key={combinedSubject} defaultValue={combinedSubject}
              className="w-full text-sm font-medium px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          {/* WYSIWYG editor */}
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>Draft message</span>
              <div className="flex items-center gap-2">
                {/* Toolbar */}
                <button onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition ${editor?.isActive("bold") ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>B</button>
                <button onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`px-1.5 py-0.5 text-[10px] italic rounded border transition ${editor?.isActive("italic") ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>I</button>
                <button onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition ${editor?.isActive("bulletList") ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>• List</button>
                <span className="w-px h-3 bg-border" />
                <button className="text-[10px] text-accent hover:underline" onClick={() => {
                  if (editor) {
                    const html = initialMessage.split("\n").map(l => `<p>${l || "<br>"}</p>`).join("");
                    editor.commands.setContent(html);
                  }
                }}>Reset</button>
              </div>
            </div>
            <div className="border border-border rounded bg-background focus-within:ring-1 focus-within:ring-ring transition">
              <EditorContent
                editor={editor}
                className="px-3 py-2.5 [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p:last-child]:mb-0 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4 [&_.ProseMirror_ul]:mb-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4 [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_em]:italic [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none"
              />
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground text-right">
              {editor?.storage.characterCount?.characters?.() ?? 0} chars · {editor?.storage.characterCount?.words?.() ?? 0} words
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
            The RM reviews, edits, and owns every client interaction. Approval required before send.
            {overridden && <span className="block text-accent mt-1">Overriding AI suggestion ({rec.outreach.channel}).</span>}
          </div>

          <AngeloCallButton
            clientId={client.id}
            clientName={client.name}
            className="w-full"
          />

          <button className="w-full px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Approve via {channel}
          </button>
        </div>
      </CollapsibleCard>
    );
  }

  function PortfolioTab() {
    const total = client.portfolio.allocation;
    const alerts = client.portfolio.holdings.filter((h) => h.alert);

    function alertLinkFor(ticker: string) {
      const linkedRec = findRecByTicker(client.id, ticker);
      if (linkedRec) return { to: "/recommendations/$id" as const, params: { id: linkedRec.id } };
      const linkedEvent = findEventByTicker(ticker);
      if (linkedEvent) return { to: "/events/$id" as const, params: { id: linkedEvent.id } };
      return null;
    }

    // 12-month performance, plausible per-mandate values (mocked, would come from SIX feed)
    const perfByClient: Record<string, { vsBench: number; series12: number[]; benchLabel: string }> = {
      "c-schneider": { vsBench: 0.4, benchLabel: "Balanced CHF bench",  series12: [9.71, 9.82, 9.90, 9.85, 9.94, 10.00, 10.05, 9.92, 10.11, 10.18, 10.27, 10.33, 10.38] },
      "c-huber":     { vsBench: -0.2, benchLabel: "Defensive CHF bench", series12: [9.85, 9.88, 9.92, 9.90, 9.95, 10.00, 10.02, 9.95, 10.07, 10.10, 10.18, 10.22, 10.26] },
      "c-raeber":    { vsBench: 0.6, benchLabel: "Defensive CHF bench", series12: [9.88, 9.92, 9.95, 9.94, 9.97, 10.00, 9.98, 9.92, 10.01, 10.08, 10.12, 10.16, 10.19] },
      "c-ammann":    { vsBench: 1.1, benchLabel: "Growth CHF bench",    series12: [9.55, 9.68, 9.80, 9.74, 9.88, 10.00, 10.10, 9.96, 10.18, 10.31, 10.40, 10.44, 10.47] },
    };
    const perfBase = perfByClient[client.id] ?? perfByClient["c-schneider"];

    const timeframes = [
      { key: "1M",  months: 1 },
      { key: "3M",  months: 3 },
      { key: "6M",  months: 6 },
      { key: "1Y",  months: 12 },
    ] as const;
    const [tf, setTf] = useState<(typeof timeframes)[number]["key"]>("6M");
    const tfMonths = timeframes.find((t) => t.key === tf)!.months;

    const series = perfBase.series12.slice(-(tfMonths + 1));
    const startVal = series[0];
    const endVal = series[series.length - 1];
    const pct = ((endVal / startVal) - 1) * 100;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = Math.max(max - min, 0.01);
    const w = 280, h = 56;
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const allMonths = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul"];
    const monthLabels = allMonths.slice(-series.length);
    const labelStride = Math.max(1, Math.ceil(series.length / 7));
    const positive = pct >= 0;
    const tfLabel = tf === "1Y" ? "Last 12 months" : `Last ${tfMonths} months`;

    type PortfolioWidgetKey = "portfolio-value" | "portfolio-alerts" | "portfolio-allocation" | "portfolio-holdings";
    const { hiddenWidgets, editingWidgets, setEditingWidgets, widgetTileProps, showWidget } =
      useBentoWidgetVisibility<PortfolioWidgetKey>("aura-portfolio-widget-visibility");

    // ── LIST VIEW (Lovable default) ────────────────────────────────────────────
    if (viewMode === "list") {
      return (
        <div className="space-y-8">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-8 items-center">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Portfolio value, today</div>
                <div className="font-display text-4xl tracking-tight tabular">CHF {endVal.toFixed(2)}M</div>
                <div className="text-xs text-muted-foreground mt-1">Mandate target {client.aum.toFixed(1)}M · {client.mandate}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{tfLabel}</div>
                  <div className="flex items-center gap-0.5 ml-1">
                    {timeframes.map((t) => (
                      <button key={t.key} onClick={() => setTf(t.key)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition ${tf === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{t.key}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-baseline gap-3">
                  <div className={`font-display text-3xl tracking-tight tabular ${positive ? "text-positive" : "text-destructive"}`}>{positive ? "+" : ""}{pct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">from CHF {startVal.toFixed(2)}M
                    <span className={`ml-2 ${perfBase.vsBench >= 0 ? "text-positive" : "text-destructive"}`}>{perfBase.vsBench >= 0 ? "+" : ""}{perfBase.vsBench.toFixed(1)}% vs {perfBase.benchLabel}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <svg width={w} height={h + 14} viewBox={`0 0 ${w} ${h + 14}`} className="block">
                  <defs><linearGradient id="perfFill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.25" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
                  <g className={positive ? "text-positive" : "text-destructive"}>
                    <polyline fill="none" stroke="currentColor" strokeWidth="1.8" points={pts} />
                    <polygon fill="url(#perfFill2)" points={`0,${h} ${pts} ${w},${h}`} />
                  </g>
                  <g className="text-muted-foreground" fontSize="9" fontFamily="ui-monospace, monospace">
                    {monthLabels.map((m, i) => { if (i % labelStride !== 0 && i !== series.length - 1) return null; return <text key={i} x={(i / (series.length - 1)) * w} y={h + 12} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fill="currentColor">{m}</text>; })}
                  </g>
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-border/60 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span>Data by</span>
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/9e/SIX_Group_logo.svg" alt="SIX" className="h-3 w-auto opacity-60" />
            </div>
          </div>
          {alerts.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-destructive" /><h3 className="text-sm font-medium">Holdings flagged for review</h3></div>
              <div className="space-y-2">{alerts.map((h) => { const link = alertLinkFor(h.ticker); const row = (<div className="flex items-center justify-between text-sm"><div className="flex items-baseline gap-3"><span className="font-mono text-xs">{h.ticker}</span><span>{h.name}</span></div><div className="flex items-center gap-2 text-xs text-destructive">{h.alert}{link && <ChevronRight className="w-3 h-3" />}</div></div>); return link ? <Link key={h.ticker} {...link} className="block border-t border-destructive/15 pt-2 first:border-t-0 first:pt-0 hover:bg-destructive/5 -mx-2 px-2 py-1 rounded transition">{row}</Link> : <div key={h.ticker} className="border-t border-destructive/15 pt-2 first:border-t-0 first:pt-0">{row}</div>; })}</div>
            </div>
          )}
          <div className="grid grid-cols-[1fr_1.4fr] gap-8">
            <Section title="Actual vs Target allocation" subtitle="Bars show actual, line marks target">
              <div className="space-y-4 mt-2">
                {total.map((a) => { const dev = a.value - a.target; const maxV = Math.max(...total.map((x) => Math.max(x.value, x.target))) * 1.1; const actualPct = (a.value / maxV) * 100; const targetPct = (a.target / maxV) * 100; return (
                  <div key={a.name}>
                    <div className="flex items-baseline justify-between mb-1.5"><span className="text-sm">{a.name}</span><span className="text-xs tabular text-muted-foreground"><span className="font-medium text-foreground">{a.value}%</span> · target {a.target}%<span className={`ml-2 ${Math.abs(dev) > 3 ? "text-destructive" : dev > 0 ? "text-accent" : "text-muted-foreground"}`}>{dev > 0 ? "+" : ""}{dev}%</span></span></div>
                    <div className="relative h-3 bg-secondary/60 rounded"><div className={`absolute inset-y-0 left-0 rounded ${Math.abs(dev) > 3 ? "bg-destructive/60" : "bg-primary/70"}`} style={{ width: `${actualPct}%` }} /><div className="absolute inset-y-[-4px] w-0.5 bg-accent" style={{ left: `calc(${targetPct}% - 1px)` }} /></div>
                  </div>
                ); })}
              </div>
            </Section>
            <Section title="Holdings" subtitle="Reference & market data via SIX MCP">
              <div className="border border-border rounded overflow-hidden overflow-x-auto">
                <div className="grid grid-cols-[1fr_150px_90px_110px_70px_30px] gap-3 px-4 py-2 bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground"><div>Instrument</div><div>ISIN / Valor</div><div>Venue</div><div className="text-right">Last px</div><div className="text-right">Weight</div><div /></div>
                {client.portfolio.holdings.map((h) => { const link = h.alert ? alertLinkFor(h.ticker) : null; const dayColor = h.lastPrice?.pctDay == null ? "text-muted-foreground" : h.lastPrice.pctDay > 0 ? "text-positive" : h.lastPrice.pctDay < 0 ? "text-destructive" : "text-muted-foreground"; return (
                  <div key={h.ticker} className="grid grid-cols-[1fr_150px_90px_110px_70px_30px] gap-3 px-4 py-3 border-t border-border text-sm items-center">
                    <div><div className="flex items-center gap-2"><span className="font-mono text-[11px] text-muted-foreground">{h.ticker}</span><span className="truncate">{h.name}</span></div><div className="text-[11px] text-muted-foreground mt-0.5">{h.sector}{h.instrumentType ? ` · ${h.instrumentType}` : ""}</div>{h.alert && <div className="text-[11px] text-destructive mt-0.5">{h.alert}</div>}</div>
                    <div className="font-mono text-[11px] leading-tight"><div>{h.isin ?? "-"}</div><div className="text-muted-foreground">Valor {h.valor ?? "-"}</div></div>
                    <div className="font-mono text-[11px]"><div>{h.primaryMic ?? "-"}</div><div className="text-muted-foreground">{h.venueCcy ?? ""}</div></div>
                    <div className="text-right tabular text-xs">{h.lastPrice ? (<><div>{h.lastPrice.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-muted-foreground">{h.lastPrice.ccy}</span></div><div className={`text-[10px] ${dayColor}`}>{h.lastPrice.pctDay != null ? `${h.lastPrice.pctDay > 0 ? "+" : ""}${h.lastPrice.pctDay.toFixed(1)}%` : ""}<span className="text-muted-foreground"> · {h.lastPrice.asOf}</span></div></>) : <span className="text-muted-foreground">-</span>}</div>
                    <div className="text-right tabular">{h.weight.toFixed(1)}%</div>
                    <div>{h.alert && (link ? <Link {...link} title={`Open action for ${h.ticker}`} className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-destructive/10 transition"><AlertTriangle className="w-3.5 h-3.5 text-destructive" /></Link> : <span title={h.alert} className="inline-flex"><AlertTriangle className="w-3.5 h-3.5 text-destructive/50" /></span>)}</div>
                  </div>
                ); })}
              </div>
            </Section>
          </div>
        </div>
      );
    }

    // ── TILE VIEW (Bento, existing) ────────────────────────────────────────────
    return (
      <BentoBoard>
        <HiddenWidgetPanelCloser editingWidgets={editingWidgets} hiddenWidgets={hiddenWidgets} />
        <div className="space-y-3">
          <WidgetCustomizeHeader
            editingWidgets={editingWidgets}
            onToggleEdit={() => setEditingWidgets((on) => !on)}
          />

          <div className="flex flex-wrap gap-3">
        {showWidget("portfolio-value") && (
        <Section id="portfolio-value" title="Portfolio value, today" icon={<Scale />} accent="business" bento="square" {...widgetTileProps("portfolio-value")}>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-8 items-center">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Portfolio value, today</div>
              <div className="font-display text-4xl tracking-tight tabular">CHF {endVal.toFixed(2)}M</div>
              <div className="text-xs text-muted-foreground mt-1">Mandate target {client.aum.toFixed(1)}M · {client.mandate}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{tfLabel}</div>
                <div className="flex items-center gap-0.5 ml-1">
                  {timeframes.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTf(t.key)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition ${
                        tf === t.key
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <div className={`font-display text-3xl tracking-tight tabular ${positive ? "text-positive" : "text-destructive"}`}>
                  {positive ? "+" : ""}{pct.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  from CHF {startVal.toFixed(2)}M
                  <span className={`ml-2 ${perfBase.vsBench >= 0 ? "text-positive" : "text-destructive"}`}>
                    {perfBase.vsBench >= 0 ? "+" : ""}{perfBase.vsBench.toFixed(1)}% vs {perfBase.benchLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <svg width={w} height={h + 14} viewBox={`0 0 ${w} ${h + 14}`} className="block">
                <defs>
                  <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g className={positive ? "text-positive" : "text-destructive"}>
                  <polyline fill="none" stroke="currentColor" strokeWidth="1.8" points={pts} />
                  <polygon fill="url(#perfFill)" points={`0,${h} ${pts} ${w},${h}`} />
                </g>
                <g className="text-muted-foreground" fontSize="9" fontFamily="ui-monospace, monospace">
                  {monthLabels.map((m, i) => {
                    if (i % labelStride !== 0 && i !== series.length - 1) return null;
                    return (
                      <text key={i} x={(i / (series.length - 1)) * w} y={h + 12} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fill="currentColor">{m}</text>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-border/60 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Data by</span>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/9e/SIX_Group_logo.svg"
              alt="SIX"
              className="h-3 w-auto opacity-70"
            />
          </div>
        </Section>
        )}

        {alerts.length > 0 && showWidget("portfolio-alerts") && (
          <Section
            id="portfolio-alerts"
            title="Holdings flagged"
            subtitle={`${alerts.length} need review`}
            icon={<AlertTriangle />}
            accent="risk"
            bento="square"
            {...widgetTileProps("portfolio-alerts")}
          >
            <div className="space-y-2">
              {alerts.map((h) => {
                const link = alertLinkFor(h.ticker);
                const row = (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs">{h.ticker}</span>
                      <span>{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      {h.alert}
                      {link && <ChevronRight className="w-3 h-3" />}
                    </div>
                  </div>
                );
                return link ? (
                  <Link key={h.ticker} {...link}
                    className="block border-t border-destructive/15 pt-2 first:border-t-0 first:pt-0 hover:bg-destructive/5 -mx-2 px-2 py-1 rounded transition">
                    {row}
                  </Link>
                ) : (
                  <div key={h.ticker} className="border-t border-destructive/15 pt-2 first:border-t-0 first:pt-0">{row}</div>
                );
              })}
            </div>
          </Section>
        )}

        {showWidget("portfolio-allocation") && (
        <Section id="portfolio-allocation" title="Actual vs Target allocation" subtitle="Bars show actual, line marks target" icon={<Layers />} accent="insight" bento="square" {...widgetTileProps("portfolio-allocation")}>
          <div className="mt-2 space-y-4">
              {total.map((a) => {
                const dev = a.value - a.target;
                const max = Math.max(...total.map((x) => Math.max(x.value, x.target))) * 1.1;
                const actualPct = (a.value / max) * 100;
                const targetPct = (a.target / max) * 100;
                return (
                  <div key={a.name}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm">{a.name}</span>
                      <span className="text-xs tabular text-muted-foreground">
                        <span className="font-medium text-foreground">{a.value}%</span> · target {a.target}%
                        <span className={`ml-2 ${Math.abs(dev) > 3 ? "text-destructive" : dev > 0 ? "text-accent" : "text-muted-foreground"}`}>
                          {dev > 0 ? "+" : ""}{dev}%
                        </span>
                      </span>
                    </div>
                    <div className="relative h-3 bg-secondary/60 rounded">
                      <div
                        className={`absolute inset-y-0 left-0 rounded ${Math.abs(dev) > 3 ? "bg-destructive/60" : "bg-primary/70"}`}
                        style={{ width: `${actualPct}%` }}
                      />
                      <div className="absolute inset-y-[-4px] w-0.5 bg-accent"
                        style={{ left: `calc(${targetPct}% - 1px)` }}
                        title={`Target ${a.target}%`}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 mt-2 border-t border-border text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-primary/70 rounded-sm" /> Actual</span>
                <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-accent" /> Target</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-destructive/60 rounded-sm" /> Off-target &gt;3%</span>
              </div>
            </div>
          </Section>
        )}

        {showWidget("portfolio-holdings") && (
        <Section id="portfolio-holdings" title="Holdings" subtitle="Live via SIX MCP" icon={<Briefcase />} accent="evidence" bento="square" {...widgetTileProps("portfolio-holdings")}>
            <div className="border border-border rounded overflow-hidden overflow-x-auto">
              <div className="grid grid-cols-[1fr_150px_90px_110px_70px_30px] gap-3 px-4 py-2 bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <div>Instrument</div>
                <div>ISIN / Valor</div>
                <div>Venue</div>
                <div className="text-right">Last px</div>
                <div className="text-right">Weight</div>
                <div />
              </div>
              {client.portfolio.holdings.map((h) => {
                const link = h.alert ? alertLinkFor(h.ticker) : null;
                const dayColor = h.lastPrice?.pctDay == null ? "text-muted-foreground" : h.lastPrice.pctDay > 0 ? "text-positive" : h.lastPrice.pctDay < 0 ? "text-destructive" : "text-muted-foreground";
                return (
                  <div key={h.ticker} className="grid grid-cols-[1fr_150px_90px_110px_70px_30px] gap-3 px-4 py-3 border-t border-border text-sm items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">{h.ticker}</span>
                        <span className="truncate">{h.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {h.sector}{h.instrumentType ? ` · ${h.instrumentType}` : ""}
                      </div>
                      {h.alert && <div className="text-[11px] text-destructive mt-0.5">{h.alert}</div>}
                    </div>
                    <div className="font-mono text-[11px] leading-tight">
                      <div>{h.isin ?? "-"}</div>
                      <div className="text-muted-foreground">Valor {h.valor ?? "-"}</div>
                    </div>
                    <div className="font-mono text-[11px]">
                      <div>{h.primaryMic ?? "-"}</div>
                      <div className="text-muted-foreground">{h.venueCcy ?? ""}</div>
                    </div>
                    <div className="text-right tabular text-xs">
                      {h.lastPrice ? (
                        <>
                          <div>{h.lastPrice.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-muted-foreground">{h.lastPrice.ccy}</span></div>
                          <div className={`text-[10px] ${dayColor}`}>
                            {h.lastPrice.pctDay != null ? `${h.lastPrice.pctDay > 0 ? "+" : ""}${h.lastPrice.pctDay.toFixed(1)}%` : ""}
                            <span className="text-muted-foreground"> · {h.lastPrice.asOf}</span>
                          </div>
                        </>
                      ) : <span className="text-muted-foreground">-</span>}
                    </div>
                    <div className="text-right tabular">{h.weight.toFixed(1)}%</div>
                    <div>
                      {h.alert && (
                        link ? (
                          <Link {...link}
                            title={`Open action for ${h.ticker}`}
                            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-destructive/10 transition">
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          </Link>
                        ) : (
                          <span title={h.alert} className="inline-flex"><AlertTriangle className="w-3.5 h-3.5 text-destructive/50" /></span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="px-4 py-2 border-t border-border bg-secondary/20 text-[10px] text-muted-foreground flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Sparkles className="w-3 h-3" />Identifiers and prices resolved live via SIX MCP.</span>
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/9e/SIX_Group_logo.svg" alt="SIX" className="h-3 w-auto opacity-60" />
              </div>
            </div>
          </Section>
        )}
          </div>
          <BentoDetailPanel />
        </div>
      </BentoBoard>
    );
  }

  function DnaTab() {
    const d = client.dna;
    type DnaView = "tiles" | "board";
    type DnaWidgetKey =
      | "dna-memory"
      | "dna-cheatsheet"
      | "dna-news"
      | "dna-media"
      | "dna-crm"
      | "personal-hero"
      | "personal-family"
      | "personal-dates"
      | "personal-rituals"
      | "personal-starters"
      | "personal-gifts"
      | "personal-never"
      | "dna-wealth"
      | "dna-tax"
      | "dna-behaviour"
      | "dna-interests"
      | "dna-values"
      | "dna-gaps";

    const { hiddenWidgets, editingWidgets, setEditingWidgets, widgetTileProps, showWidget } =
      useBentoWidgetVisibility<DnaWidgetKey>("aura-dna-widget-visibility");
    const [dnaView, setDnaView] = useState<DnaView>("tiles");

    // ── LIST VIEW (Lovable default) ────────────────────────────────────────────
    if (viewMode === "list") {
      type Density = "Essentials" | "Standard" | "Full";
      const [density, setDensity] = useState<Density>("Standard");
      const show = (level: Density) =>
        density === "Full" || (density === "Standard" && level !== "Full") || (density === "Essentials" && level === "Essentials");
      return (
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-2.5">
            <div className="text-xs text-muted-foreground"><span className="uppercase tracking-[0.18em]">View density</span><span className="ml-3 text-foreground/70">Choose how much of the DNA to surface.</span></div>
            <div className="flex items-center gap-1 bg-secondary/40 border border-border rounded-md p-0.5">
              {(["Essentials", "Standard", "Full"] as Density[]).map((opt) => (
                <button key={opt} onClick={() => setDensity(opt)} className={`px-3 py-1 text-xs rounded transition-colors ${density === opt ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Memory card */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[360px_1fr] gap-0">
              <div className="relative bg-gradient-to-br from-accent/15 via-secondary/40 to-surface p-6 border-r border-border flex flex-col">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Client memory card</div>
                {client.avatar && <img src={client.avatar} alt={client.name} className="w-full aspect-[4/5] rounded-md object-cover border border-border mb-4" />}
                <div className="font-display text-xl tracking-tight">{client.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{client.archetype}</div>
                <div className="text-[11px] text-muted-foreground mt-2">{client.domicile} · {client.timezone}</div>
                {d.personal?.voice && <div className="mt-4 pt-4 border-t border-border"><Quote className="w-3.5 h-3.5 text-accent/60 mb-1" /><p className="text-xs italic">"{d.personal.voice}"</p></div>}
              </div>
              <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-6">
                <MemoryPillar title="Values" icon={<Heart className="w-3.5 h-3.5" />} items={d.values.map((v) => ({ text: v.label, c: v.confidence }))} />
                <MemoryPillar title="Business & wealth" icon={<Briefcase className="w-3.5 h-3.5" />} items={[...(d.wealthSource ? [{ text: d.wealthSource, c: "Explicit" as const }] : []), ...(d.interests ?? []).map((i) => ({ text: i, c: "Pattern" as const }))]} />
                <MemoryPillar title="Family context" icon={<Users className="w-3.5 h-3.5" />} items={(d.personal?.family ?? []).map((f) => ({ text: `${f.name}${f.relation ? " · " + f.relation : ""}`, c: "Explicit" as const }))} />
                <MemoryPillar title="Preferences" icon={<Compass className="w-3.5 h-3.5" />} items={(d.preferences ?? []).map((p) => ({ text: p, c: "Pattern" as const }))} />
              </div>
            </div>
          </div>

          {/* Do/Don't cheat-sheet */}
          <Section title="RM cheat-sheet" subtitle="Dos and Don'ts, sourced from CRM notes and DNA extraction">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><ThumbsUp className="w-3 h-3 text-positive" /> Do</div>
                <ul className="space-y-2">{(d.dos ?? []).map((item, i) => <li key={i} className="flex gap-2 text-sm"><Check className="w-3.5 h-3.5 text-positive mt-0.5 shrink-0" />{item}</li>)}</ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><ThumbsDown className="w-3 h-3 text-destructive" /> Don't</div>
                <ul className="space-y-2">{(d.donts ?? []).map((item, i) => <li key={i} className="flex gap-2 text-sm"><X className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />{item}</li>)}</ul>
              </div>
            </div>
          </Section>

          {/* Timeline */}
          <Section title="News about the client" subtitle="Life events, meetings, trades — reconstructed from CRM notes">
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {(d.timeline ?? []).map((t, i) => (
                  <div key={i} className="grid grid-cols-[90px_60px_1fr_90px] gap-4 items-start">
                    <div className="text-[11px] text-muted-foreground tabular">{t.date}</div>
                    <div className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border inline-block ${t.type === "Life" ? "bg-accent/10 text-accent border-accent/20" : t.type === "Trade" ? "bg-positive/10 text-positive border-positive/20" : "bg-secondary text-muted-foreground border-border"}`}>{t.type}</div>
                    <div className="text-sm leading-snug">{t.text}</div>
                    <div />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {show("Standard") && d.media && d.media.length > 0 && (
            <Section title="Media & news mentions">
              <div className="divide-y divide-border -mx-6">
                {d.media.map((m, i) => (
                  <a key={i} href={m.url ?? "#"} target="_blank" rel="noreferrer" className="grid grid-cols-[90px_1fr_90px_90px] gap-4 px-6 py-3 hover:bg-secondary/30 transition items-start">
                    <div className="text-[11px] text-muted-foreground tabular">{m.date}</div>
                    <div><div className="text-sm font-medium">{m.title}</div><div className="text-xs text-muted-foreground">{m.outlet}</div></div>
                    <div className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${m.sentiment === "Positive" ? "bg-positive/10 text-positive border-positive/20" : m.sentiment === "Negative" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-secondary text-muted-foreground border-border"}`}>{m.sentiment}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{m.confidence}</div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {show("Standard") && d.crmTouchpoints && d.crmTouchpoints.length > 0 && (
            <Section title="CRM touchpoints">
              <div className="divide-y divide-border -mx-6">
                {d.crmTouchpoints.map((t, i) => (
                  <div key={i} className="grid grid-cols-[90px_28px_110px_1fr_120px] gap-4 px-6 py-3 items-start">
                    <div className="text-[11px] text-muted-foreground tabular">{t.date}</div>
                    <div>{t.direction === "In" ? <ArrowDownLeft className="w-3.5 h-3.5 text-positive" /> : <ArrowUpRight className="w-3.5 h-3.5 text-accent" />}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.channel}</div>
                    <div className="text-sm">{t.subject}</div>
                    <div className="text-[11px] text-muted-foreground tabular text-right">{t.durationMin ? `${t.durationMin}min` : ""}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {show("Full") && d.behavioralPatterns && d.behavioralPatterns.length > 0 && (
            <div className="grid grid-cols-2 gap-6">
              <Section title="Behavioural patterns">
                <ul className="space-y-2 text-sm">{d.behavioralPatterns.map((b, i) => <li key={i} className="flex gap-2"><span className="text-accent">·</span>{b}</li>)}</ul>
              </Section>
              <Section title="Sensitivities & interests">
                <ul className="space-y-2 text-sm">{(d.sensitivities ?? []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-destructive">!</span>{s}</li>)}</ul>
              </Section>
            </div>
          )}

          {show("Full") && (
            <Section title="Values & convictions">
              <div className="grid grid-cols-2 gap-2">
                {d.values.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-secondary/30 transition">
                    <div className="flex-1 text-sm">{v.label}</div>
                    <ConfidenceChip c={v.confidence} />
                    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-accent/70 rounded-full" style={{ width: `${(v.weight / 10) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      );
    }

    // ── TILE VIEW (Bento, existing) ────────────────────────────────────────────
    if (dnaView === "board") {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Client DNA</div>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                Same profile data on an infinite canvas — pan, zoom, draw connections, add sticky notes. Layout saves per client.
              </p>
            </div>
            <DnaViewSwitcher view={dnaView} onChange={setDnaView} />
          </div>
          <ClientDnaBoard client={client} />
        </div>
      );
    }

    return (
      <BentoBoard>
        <HiddenWidgetPanelCloser editingWidgets={editingWidgets} hiddenWidgets={hiddenWidgets} />
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <WidgetCustomizeHeader
                editingWidgets={editingWidgets}
                onToggleEdit={() => setEditingWidgets((on) => !on)}
              />
            </div>
            <DnaViewSwitcher view={dnaView} onChange={setDnaView} />
          </div>

          <div className="flex flex-wrap gap-3">
        {showWidget("dna-memory") && (
        <Section id="dna-memory" title="Client memory card" subtitle="Family portrait & key facts" icon={<Users />} accent="human" bento="square" {...widgetTileProps("dna-memory")}>
          <div className="grid grid-cols-[360px_1fr] gap-0 overflow-hidden rounded-xl border border-border">
            {/* Photo + identity, large family-style portrait */}
            <div className="relative bg-gradient-to-br from-accent/15 via-secondary/40 to-surface p-6 border-r border-border flex flex-col">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Client memory card · family portrait</div>
              <button
                onClick={() => setAvatarOpen(true)}
                className="relative w-full aspect-[4/5] rounded-md overflow-hidden border border-border bg-secondary mb-4 group/photo"
                aria-label="Enlarge family portrait"
              >
                {client.avatar ? (
                  <img src={client.avatar} alt={client.name} loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-[1.03]" width={720} height={900} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-6xl text-muted-foreground">
                    {client.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                )}
                <span className="absolute bottom-2 right-2 text-[10px] uppercase tracking-wider bg-background/80 backdrop-blur px-2 py-0.5 rounded border border-border opacity-0 group-hover/photo:opacity-100 transition">Click to enlarge</span>
              </button>
              <div className="font-display text-xl tracking-tight leading-tight">{client.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{client.archetype}</div>
              <div className="text-[11px] text-muted-foreground mt-2">{client.domicile} · {client.timezone}</div>
              {d.personal?.voice && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Quote className="w-3.5 h-3.5 text-accent/60 mb-1" />
                  <p className="text-xs italic leading-snug">"{d.personal.voice}"</p>
                </div>
              )}
            </div>

            {/* Four pillars: values · business interests · family context · individual preferences */}
            <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-6">
              <MemoryPillar
                title="Values"
                icon={<Heart className="w-3.5 h-3.5" />}
                items={d.values.map((v) => ({ text: v.label, c: v.confidence }))}
              />
              <MemoryPillar
                title="Business interests & wealth"
                icon={<Briefcase className="w-3.5 h-3.5" />}
                items={[
                  ...(d.wealthSource ? [{ text: d.wealthSource, c: "Explicit" as Confidence }] : []),
                  ...(d.philanthropy ?? []).map((p) => ({ text: p, c: "Explicit" as Confidence })),
                  ...(d.interests ?? []).map((i) => ({ text: i, c: "Pattern" as Confidence })),
                ]}
              />
              <MemoryPillar
                title="Family context"
                icon={<Users className="w-3.5 h-3.5" />}
                items={[
                  ...(d.personal?.family ?? []).map((f) => ({
                    text: `${f.name} (${f.relation})${f.note ? ", " + f.note : ""}`,
                    c: "Explicit" as Confidence,
                  })),
                  ...(d.successionStatus ? [{ text: `Succession, ${d.successionStatus}`, c: "Explicit" as Confidence }] : []),
                ]}
              />
              <MemoryPillar
                title="Individual preferences"
                icon={<Compass className="w-3.5 h-3.5" />}
                items={[
                  { text: `Preferred channel, ${client.preferredChannel}`, c: "Explicit" },
                  { text: `Style, ${client.communicationStyle}`, c: "Pattern" },
                  { text: `Working hours, ${client.workingHours}`, c: "Explicit" },
                  ...(d.preferences ?? []).map((p) => ({ text: p, c: "Explicit" as Confidence })),
                  ...(d.sensitivities ?? []).map((s) => ({ text: `Sensitive to, ${s}`, c: "Pattern" as Confidence })),
                ]}
              />
            </div>
          </div>
          <div className="px-6 py-2 border-t border-border bg-secondary/30 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Use this card to make every interaction hyperpersonalized. Refresh on each contact.</span>
            <span>Confidence: <span className="text-foreground/80">Explicit</span> (said) · <span className="text-foreground/80">Pattern</span> (observed) · <span className="text-foreground/80">Inferred</span> (assumed)</span>
          </div>
        </Section>
        )}

        {showWidget("dna-cheatsheet") && (
        <Section
          id="dna-cheatsheet"
          title="RM cheat-sheet"
          subtitle={d.kycRefresh ? `KYC refresh, ${d.kycRefresh}` : "Before you reach out"}
          icon={<ThumbsUp />}
          accent="insight"
          bento="square"
          {...widgetTileProps("dna-cheatsheet")}
        >
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-positive mb-2"><ThumbsUp className="w-4 h-4" /> Do</div>
              <ul className="space-y-1.5 text-sm">
                {(d.dos ?? []).map((s) => (
                  <li key={s} className="leading-snug flex items-start justify-between gap-3 pb-1.5 border-b border-border last:border-b-0">
                    <span className="flex gap-2"><span className="text-positive">·</span>{s}</span>
                    <ConfidenceChip c="Explicit" />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2"><ThumbsDown className="w-4 h-4" /> Don't</div>
              <ul className="space-y-1.5 text-sm">
                {(d.donts ?? []).map((s) => (
                  <li key={s} className="leading-snug flex items-start justify-between gap-3 pb-1.5 border-b border-border last:border-b-0">
                    <span className="flex gap-2"><span className="text-destructive">·</span>{s}</span>
                    <ConfidenceChip c="Explicit" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {d.discretion && (
            <div className="mt-5 pt-4 border-t border-border text-xs text-muted-foreground flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
              <div><span className="font-medium text-foreground/80">Discretion:</span> {d.discretion}</div>
            </div>
          )}
        </Section>
        )}

        {showWidget("dna-news") && (
        <Section id="dna-news" title="News about the client" subtitle="Life events, meetings, trades and observations, newest first" icon={<Sparkles />} accent="evidence" bento="square" {...widgetTileProps("dna-news")}>
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {d.timeline.map((t, i) => {
                const color =
                  t.type === "Life" ? "bg-accent" :
                  t.type === "Meeting" ? "bg-primary" :
                  t.type === "Trade" ? "bg-positive" : "bg-muted-foreground";
                const conf: Confidence = t.type === "Note" ? "Pattern" : "Explicit";
                return (
                  <div key={i} className="grid grid-cols-[90px_60px_1fr_90px] gap-4 items-baseline">
                    <div className="text-xs text-muted-foreground tabular">{t.date}</div>
                    <div className="flex items-center gap-2">
                      <span className={`-ml-[26px] w-2 h-2 rounded-full ${color}`} />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.type}</span>
                    </div>
                    <div className="text-sm">{t.text}</div>
                    <div className="text-right"><ConfidenceChip c={conf} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          {d.personal?.lastPersonalTouch && (
            <div className="mt-5 pt-4 border-t border-border bg-accent/5 -mx-6 -mb-6 px-6 py-3 rounded-b-lg flex items-baseline gap-3">
              <Heart className="w-3.5 h-3.5 text-accent shrink-0" />
              <div className="text-xs">
                <span className="text-muted-foreground tabular">{d.personal.lastPersonalTouch.date}, last personal touch, </span>
                {d.personal.lastPersonalTouch.text}
              </div>
            </div>
          )}
        </Section>
        )}

        {showWidget("dna-media") && (
          <Section id="dna-media" title="Media & news mentions" subtitle="Open-source signal about the client, their family, or their businesses" icon={<Newspaper />} accent="evidence" bento="square" {...widgetTileProps("dna-media")}>
            {(d.media ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracked mentions in the last 90 days.</p>
            ) : (
              <div className="divide-y divide-border -mx-6">
                {(d.media ?? []).map((m, i) => {
                  const tone =
                    m.sentiment === "Positive" ? "text-positive border-positive/30 bg-positive/5" :
                    m.sentiment === "Negative" ? "text-destructive border-destructive/30 bg-destructive/5" :
                    "text-muted-foreground border-border bg-secondary/40";
                  return (
                    <a key={i} href={m.url ?? "#"} className="grid grid-cols-[90px_1fr_90px_90px] gap-4 items-baseline px-6 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="text-xs text-muted-foreground tabular">{m.date}</div>
                      <div>
                        <div className="text-sm font-medium leading-snug">{m.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{m.outlet}{m.summary ? `, ${m.summary}` : ""}</div>
                      </div>
                      <div><span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${tone}`}>{m.sentiment}</span></div>
                      <div className="text-right"><ConfidenceChip c={m.confidence} /></div>
                    </a>
                  );
                })}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Sources: Reuters, Bloomberg, regional press, foundation bulletins. Refreshed daily.
            </div>
          </Section>
        )}

        {showWidget("dna-crm") && (
          <Section id="dna-crm" title="CRM touchpoints" subtitle="Every logged interaction, newest first, so you walk in remembering the last call" icon={<PhoneCall />} accent="insight" bento="square" {...widgetTileProps("dna-crm")}>
            {(d.crmTouchpoints ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No touchpoints logged yet.</p>
            ) : (
              <div className="divide-y divide-border -mx-6">
                {(d.crmTouchpoints ?? []).map((t, i) => (
                  <div key={i} className="grid grid-cols-[90px_28px_110px_1fr_120px] gap-4 items-baseline px-6 py-3">
                    <div className="text-xs text-muted-foreground tabular">{t.date}</div>
                    <div className="flex justify-center" title={t.direction === "In" ? "Inbound" : "Outbound"}>
                      {t.direction === "In"
                        ? <ArrowDownLeft className="w-3.5 h-3.5 text-accent" />
                        : <ArrowUpRight className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.channel}{typeof t.durationMin === "number" ? `, ${t.durationMin}m` : ""}</div>
                    <div className="text-sm">
                      <div className="leading-snug">{t.subject}</div>
                      {t.outcome && <div className="text-xs text-muted-foreground mt-0.5">{t.outcome}</div>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">{t.owner ?? ""}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {d.personal && (
          <PersonalLayer
            p={d.personal}
            firstName={client.name.split(" ")[0]}
            showWidget={showWidget}
            widgetTileProps={widgetTileProps}
          />
        )}

        {showWidget("dna-wealth") && (
          <Section id="dna-wealth" title="Where the wealth sits" subtitle="Bank-mandated AUM in context of total estimated wealth" icon={<Compass />} accent="business" bento="square" {...widgetTileProps("dna-wealth")}>
            {(d.netWorthMap ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No wealth map on file.</p>
            ) : (
              <div className="space-y-3 mt-2">
                {(d.netWorthMap ?? []).map((w) => (
                  <div key={w.label}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className={w.label.includes("here") ? "font-medium" : ""}>{w.label}</span>
                      <span className="tabular text-xs text-muted-foreground">{w.pct}%</span>
                    </div>
                    <div className="h-2 bg-secondary/60 rounded overflow-hidden">
                      <div className={`h-full ${w.label.includes("here") ? "bg-primary" : "bg-accent/50"}`} style={{ width: `${w.pct}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground pt-2 border-t border-border mt-3">
                  Share-of-wallet matters: the bigger the bar outside the mandate, the more conversations should explore consolidation, lending, or co-invest.
                </p>
              </div>
            )}
          </Section>
        )}

        {showWidget("dna-tax") && (
          <Section id="dna-tax" title="Wealth origin, tax & succession" icon={<Briefcase />} accent="business" bento="square" {...widgetTileProps("dna-tax")}>
            <div className="space-y-3 text-sm">
              <Block label="Source of wealth" body={d.wealthSource} confidence="Explicit" />
              <Block label="Tax domicile" body={d.taxDomicile} confidence="Explicit" />
              <Block label="Succession status" body={d.successionStatus} confidence="Pattern" />
              <Block label="Liquidity horizon" body={d.liquidityHorizon} confidence="Inferred" />
            </div>
            {(d.structures ?? []).length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Off-bank structures</div>
                <div className="space-y-1.5">
                  {(d.structures ?? []).map((s) => (
                    <div key={s.label} className="flex items-baseline justify-between text-sm">
                      <span>{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.jurisdiction} · {s.purpose}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {showWidget("dna-behaviour") && (
          <Section id="dna-behaviour" title="Behavioural patterns" subtitle="How they actually decide" icon={<Scale />} accent="insight" bento="square" {...widgetTileProps("dna-behaviour")}>
            <ul className="space-y-2 text-sm">
              {(d.behavioralPatterns ?? []).map((b) => (
                <li key={b} className="leading-snug flex items-start justify-between gap-3 pb-2 border-b border-border last:border-b-0">
                  <span className="flex gap-2"><span className="text-accent">·</span>{b}</span>
                  <ConfidenceChip c="Pattern" />
                </li>
              ))}
              {(d.behavioralPatterns ?? []).length === 0 && <li className="text-muted-foreground">Not yet observed.</li>}
            </ul>
          </Section>
        )}

        {showWidget("dna-interests") && (
          <Section id="dna-interests" title="Sensitivities & interests" icon={<Heart />} accent="human" bento="square" {...widgetTileProps("dna-interests")}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sensitivities</div>
            <ul className="space-y-1.5 text-sm mb-4">
              {d.sensitivities.map((s) => (
                <li key={s} className="flex items-start justify-between gap-3">
                  <span className="flex gap-2"><span className="text-destructive">!</span>{s}</span>
                  <ConfidenceChip c="Pattern" />
                </li>
              ))}
            </ul>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-4 mb-2">Interests outside markets</div>
            <div className="flex flex-wrap gap-1.5">
              {d.interests.map((i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">{i}</span>
              ))}
            </div>
          </Section>
        )}

        {showWidget("dna-values") && (
        <Section id="dna-values" title="Values & convictions" subtitle="Confidence labels source: Explicit (said), Pattern (observed), Inferred (assumed)" icon={<Star />} accent="trust" bento="square" {...widgetTileProps("dna-values")}>

          <div className="grid grid-cols-2 gap-2">
            {d.values.map((v) => (
              <div key={v.label} className="flex items-center justify-between border border-border rounded px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${(v.weight / 10) * 100}%` }} />
                  </div>
                  <span className="text-sm">{v.label}</span>
                </div>
                <ConfidenceChip c={v.confidence} />
              </div>
            ))}
          </div>
        </Section>
        )}

        {showWidget("dna-gaps") && (
        <Section id="dna-gaps" title="DNA gaps" subtitle="What we still don't know, ask at the next meeting" icon={<ShieldAlert />} accent="risk" bento="square" {...widgetTileProps("dna-gaps")}>
          <ul className="grid grid-cols-2 gap-2">
            {d.gaps.map((g) => (
              <li key={g} className="text-sm p-3 rounded border border-dashed border-border bg-secondary/30 flex items-start justify-between gap-3">
                <span>{g}</span>
                <ConfidenceChip c="Inferred" />
              </li>
            ))}
          </ul>
        </Section>
        )}

          </div>
          <BentoDetailPanel />
        </div>
      </BentoBoard>
    );
  }
}

function renderStoryline(text: string, count: number) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n <= count) return <sup key={i} className="text-accent font-mono text-[10px] mx-0.5">[{n}]</sup>;
    }
    return <span key={i}>{p}</span>;
  });
}

type BentoSize = "hero" | "wide" | "half" | "third" | "full" | "square";
type AccentVariant = "accent" | "insight" | "evidence" | "trust" | "risk" | "human" | "business" | "studio" | "neutral";

const bentoSpanClasses: Record<BentoSize, string> = {
  hero: "col-span-4 row-span-2",
  wide: "col-span-4 row-span-1",
  half: "col-span-3 row-span-1",
  third: "col-span-2 row-span-1",
  full: "col-span-6 row-span-1",
  square: "size-[112px] shrink-0",
};

type BentoPanelEntry = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accent: AccentVariant;
  content: ReactNode;
};

type BentoBoardContextValue = {
  openId: string | null;
  toggle: (id: string) => void;
  close: () => void;
  register: (id: string, entry: BentoPanelEntry) => void;
  unregister: (id: string) => void;
  getPanel: (id: string) => BentoPanelEntry | undefined;
};

const BentoBoardContext = createContext<BentoBoardContextValue | null>(null);

function useBentoBoard() {
  return useContext(BentoBoardContext);
}

function BentoBoard({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const panelsRef = useMemo(() => new Map<string, BentoPanelEntry>(), []);
  const [, bump] = useState(0);

  const register = useCallback((id: string, entry: BentoPanelEntry) => {
    panelsRef.set(id, entry);
    bump((n) => n + 1);
  }, [panelsRef]);

  const unregister = useCallback((id: string) => {
    panelsRef.delete(id);
    bump((n) => n + 1);
  }, [panelsRef]);

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const close = useCallback(() => setOpenId(null), []);

  const getPanel = useCallback((id: string) => panelsRef.get(id), [panelsRef, bump]);

  const value = useMemo(
    () => ({ openId, toggle, close, register, unregister, getPanel }),
    [openId, toggle, close, register, unregister, getPanel],
  );

  return <BentoBoardContext.Provider value={value}>{children}</BentoBoardContext.Provider>;
}

function useBentoWidgetVisibility<T extends string>(storageKey: string) {
  const readHiddenWidgets = (): Set<T> => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as { hidden?: T[] };
      return new Set(parsed.hidden ?? []);
    } catch {
      return new Set();
    }
  };

  const [hiddenWidgets, setHiddenWidgets] = useState<Set<T>>(readHiddenWidgets);
  const [editingWidgets, setEditingWidgets] = useState(false);

  const isWidgetVisible = (key: T) => !hiddenWidgets.has(key);

  const toggleWidgetVisibility = (key: T) => {
    setHiddenWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(storageKey, JSON.stringify({ hidden: [...next] }));
      return next;
    });
  };

  const widgetTileProps = (key: T) => ({
    editMode: editingWidgets,
    widgetHidden: !isWidgetVisible(key),
    onVisibilityToggle: () => toggleWidgetVisibility(key),
  });

  const showWidget = (key: T) => editingWidgets || isWidgetVisible(key);

  return { hiddenWidgets, editingWidgets, setEditingWidgets, widgetTileProps, showWidget };
}

function WidgetCustomizeHeader({
  editingWidgets,
  onToggleEdit,
}: {
  editingWidgets: boolean;
  onToggleEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {editingWidgets ? "Tap tiles to show or hide" : "Your insight tiles"}
        </div>
        {editingWidgets && (
          <p className="mt-1 text-xs text-muted-foreground">
            Faded tiles are hidden on your dashboard. Saved for your next visit.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleEdit}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
          editingWidgets
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-surface text-muted-foreground hover:border-accent/30 hover:text-foreground",
        )}
      >
        {editingWidgets ? (
          <>
            <Check className="h-3.5 w-3.5" /> Done
          </>
        ) : (
          <>
            <Settings2 className="h-3.5 w-3.5" /> Customize
          </>
        )}
      </button>
    </div>
  );
}

function DnaViewSwitcher({
  view,
  onChange,
}: {
  view: "tiles" | "board";
  onChange: (view: "tiles" | "board") => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary/40 p-1">
      <button
        type="button"
        onClick={() => onChange("tiles")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
          view === "tiles"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Tiles
      </button>
      <button
        type="button"
        onClick={() => onChange("board")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
          view === "board"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Infinity className="h-3.5 w-3.5" />
        Board
      </button>
    </div>
  );
}

function HiddenWidgetPanelCloser({
  editingWidgets,
  hiddenWidgets,
  resolvePanelIds = (key) => [key],
}: {
  editingWidgets: boolean;
  hiddenWidgets: Set<string>;
  resolvePanelIds?: (key: string) => string[];
}) {
  const board = useBentoBoard();

  useEffect(() => {
    if (editingWidgets) board?.close();
  }, [editingWidgets, board]);

  useEffect(() => {
    if (!board?.openId) return;
    for (const key of hiddenWidgets) {
      if (resolvePanelIds(key).includes(board.openId)) {
        board.close();
        return;
      }
    }
  }, [hiddenWidgets, board, resolvePanelIds]);

  return null;
}

function BentoTile({
  title,
  subtitle,
  icon,
  accent,
  bento,
  active,
  onSelect,
  editMode,
  widgetHidden,
  onEditToggle,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accent: AccentVariant;
  bento: BentoSize;
  active: boolean;
  onSelect: () => void;
  editMode?: boolean;
  widgetHidden?: boolean;
  onEditToggle?: () => void;
}) {
  const styles = accentStyles[accent];
  const isSquare = bento === "square";

  const handleClick = () => {
    if (editMode && onEditToggle) {
      onEditToggle();
      return;
    }
    onSelect();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={!editMode && active}
      aria-pressed={editMode ? !widgetHidden : undefined}
      aria-label={subtitle ? `${title}. ${subtitle}` : title}
      className={cn(
        "group/tile relative overflow-hidden border border-border/80 bg-surface/90 text-left backdrop-blur-sm",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-14px_rgba(0,0,0,0.1)]",
        "transition-[box-shadow,border-color,transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        !editMode && "hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.14)]",
        !editMode && active && cn("translate-y-0 ring-2 ring-offset-2 ring-offset-background", styles.ring),
        editMode && widgetHidden && "border-dashed opacity-50 saturate-50",
        editMode && !widgetHidden && "ring-2 ring-accent/30 ring-offset-2 ring-offset-background",
        isSquare
          ? "flex aspect-square size-[112px] shrink-0 flex-col items-center justify-between rounded-2xl p-3"
          : "flex h-full w-full flex-col justify-between rounded-xl p-2.5",
        bentoSpanClasses[bento],
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", styles.glow)} />
      {isSquare ? (
        <>
          <div
            className={cn(
              "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground transition-all duration-300",
              !editMode && "group-hover/tile:border-accent/30 group-hover/tile:text-accent",
              !editMode && active && "border-accent/40 bg-accent/10 text-accent",
              editMode && widgetHidden && "border-destructive/30 bg-destructive/10 text-destructive",
              editMode && !widgetHidden && "border-positive/30 bg-positive/10 text-positive",
            )}
          >
            {editMode ? (
              widgetHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />
            ) : active ? (
              <ChevronDown className="h-3 w-3 rotate-180" />
            ) : (
              <span className="text-sm leading-none">+</span>
            )}
          </div>
          {icon && (
            <div className={cn("relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm [&_svg]:h-5 [&_svg]:w-5", styles.icon)}>
              {icon}
            </div>
          )}
          <h3 className="relative z-10 line-clamp-3 text-center text-[11px] font-semibold leading-snug tracking-tight">{title}</h3>
        </>
      ) : (
        <>
          <div className="relative z-10 flex w-full items-start justify-between gap-2">
            {icon && (
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-sm [&_svg]:h-4 [&_svg]:w-4", styles.icon, bento === "hero" && "h-9 w-9 [&_svg]:h-4.5 [&_svg]:w-4.5")}>
                {icon}
              </div>
            )}
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground transition-all duration-300",
                "group-hover/tile:border-accent/30 group-hover/tile:text-accent",
                active && "border-accent/40 bg-accent/10 text-accent",
              )}
            >
              {active ? <ChevronDown className="h-3 w-3 rotate-180" /> : <span className="text-sm leading-none">+</span>}
            </div>
          </div>
          <div className="relative z-10 mt-auto pt-2">
            <h3 className="text-[13px] font-semibold leading-tight tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>}
          </div>
        </>
      )}
    </button>
  );
}

function BentoDetailPanel() {
  const board = useBentoBoard();
  if (!board?.openId) return null;

  const entry = board.getPanel(board.openId);
  if (!entry) return null;

  const styles = accentStyles[entry.accent];

  return (
    <div className="bento-detail-panel mt-3 overflow-hidden rounded-2xl border border-border/80 bg-surface/95 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.18)] ring-1 ring-border/50" data-ask-ai-section={entry.title}>
      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {entry.icon && (
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border [&_svg]:h-5 [&_svg]:w-5", styles.icon)}>
              {entry.icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-xl tracking-tight">{entry.title}</h3>
            {entry.subtitle && <p className="text-sm text-muted-foreground">{entry.subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => board.toggle(board.openId!)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-5 py-5">{entry.content}</div>
    </div>
  );
}

const accentStyles: Record<AccentVariant, { icon: string; glow: string; ring: string }> = {
  accent: {
    icon: "border-accent/25 bg-gradient-to-br from-accent/25 via-accent/10 to-accent/5 text-accent",
    glow: "from-accent/10 via-transparent to-transparent",
    ring: "ring-accent/20",
  },
  insight: {
    icon: "border-primary/20 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 text-primary",
    glow: "from-primary/8 via-transparent to-transparent",
    ring: "ring-primary/15",
  },
  evidence: {
    icon: "border-chart-4/25 bg-gradient-to-br from-chart-4/20 via-chart-4/10 to-chart-4/5 text-chart-4",
    glow: "from-chart-4/10 via-transparent to-transparent",
    ring: "ring-chart-4/15",
  },
  trust: {
    icon: "border-positive/25 bg-gradient-to-br from-positive/20 via-positive/10 to-positive/5 text-positive",
    glow: "from-positive/10 via-transparent to-transparent",
    ring: "ring-positive/15",
  },
  risk: {
    icon: "border-destructive/25 bg-gradient-to-br from-destructive/15 via-destructive/8 to-destructive/5 text-destructive",
    glow: "from-destructive/8 via-transparent to-transparent",
    ring: "ring-destructive/15",
  },
  human: {
    icon: "border-accent/30 bg-gradient-to-br from-accent/30 via-accent/15 to-accent/5 text-accent",
    glow: "from-accent/12 via-transparent to-transparent",
    ring: "ring-accent/20",
  },
  business: {
    icon: "border-foreground/10 bg-gradient-to-br from-foreground/10 via-foreground/5 to-secondary text-foreground",
    glow: "from-foreground/5 via-transparent to-transparent",
    ring: "ring-foreground/10",
  },
  studio: {
    icon: "border-accent/35 bg-gradient-to-br from-accent/35 via-accent/15 to-accent/5 text-accent",
    glow: "from-accent/15 via-transparent to-transparent",
    ring: "ring-accent/25",
  },
  neutral: {
    icon: "border-border bg-gradient-to-br from-secondary via-secondary/60 to-surface text-muted-foreground",
    glow: "from-secondary/40 via-transparent to-transparent",
    ring: "ring-border",
  },
};

function CollapsibleCard({
  title,
  subtitle,
  icon,
  header,
  children,
  defaultOpen = false,
  className,
  contentClassName,
  triggerClassName,
  bento,
  accent = "neutral",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
  bento?: BentoSize;
  accent?: AccentVariant;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const styles = accentStyles[accent];
  const span = bento ? bentoSpanClasses[bento] : undefined;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "group/card relative overflow-hidden rounded-xl border border-border/80 bg-surface/90 backdrop-blur-sm",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-16px_rgba(0,0,0,0.12)]",
        "transition-[box-shadow,border-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_16px_36px_-14px_rgba(0,0,0,0.14)]",
        open && cn("translate-y-0 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_24px_48px_-20px_rgba(0,0,0,0.16)] ring-1", styles.ring),
        span,
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", styles.glow)} />
      <CollapsibleTrigger
        className={cn(
          "bento-card-trigger relative z-10 flex w-full items-center gap-2.5 text-left transition-colors",
          open ? "px-3 pb-2 pt-3" : "px-3 py-3",
          triggerClassName,
        )}
      >
        {header ?? (
          <>
            {icon && (
              <div
                className={cn(
                  "bento-card-icon flex shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-300",
                  open ? "h-8 w-8 [&_svg]:h-3.5 [&_svg]:w-3.5" : "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
                  styles.icon,
                )}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {typeof title === "string" ? (
                <h3 className="text-[13px] font-semibold leading-tight tracking-tight">{title}</h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </>
        )}
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/90 transition-all duration-300",
            "group-hover/card:border-accent/25 group-hover/card:bg-secondary/40",
            open && "border-accent/30 bg-accent/10",
          )}
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform duration-300",
              open && "rotate-180 text-accent",
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="bento-card-content relative z-10 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className={cn("bento-card-body border-t border-border/50 px-3 pb-4 pt-3", contentClassName)}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Section({
  id,
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  bento,
  accent = "neutral",
  editMode,
  widgetHidden,
  onVisibilityToggle,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  bento?: BentoSize;
  accent?: AccentVariant;
  editMode?: boolean;
  widgetHidden?: boolean;
  onVisibilityToggle?: () => void;
}) {
  const board = useBentoBoard();

  useLayoutEffect(() => {
    if (!id || !board) return;
    board.register(id, { title, subtitle, icon, accent, content: children });
    return () => board.unregister(id);
  }, [id, title, subtitle, icon, accent, children, board]);

  if (id && board && bento) {
    return (
      <BentoTile
        title={title}
        subtitle={subtitle}
        icon={icon}
        accent={accent}
        bento={bento}
        active={!editMode && board.openId === id}
        onSelect={() => board.toggle(id)}
        editMode={editMode}
        widgetHidden={widgetHidden}
        onEditToggle={onVisibilityToggle}
      />
    );
  }

  return (
    <CollapsibleCard title={title} subtitle={subtitle} icon={icon} defaultOpen={defaultOpen} bento={bento} accent={accent}>
      {children}
    </CollapsibleCard>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 tabular ${small ? "text-xs" : "text-base font-medium"}`}>{value}</div>
    </div>
  );
}

function Reason({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-start border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-sm leading-relaxed">{body}</div>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded border ${ok ? "border-positive/30 bg-positive/5" : "border-destructive/30 bg-destructive/5"}`}>
      {ok ? <Check className="w-4 h-4 text-positive" /> : <X className="w-4 h-4 text-destructive" />}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Block({ label, body, confidence }: { label: string; body?: string; confidence?: Confidence }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center justify-between gap-2">
        <span>{label}</span>
        {confidence && <ConfidenceChip c={confidence} />}
      </div>
      <div className="text-sm leading-snug">{body ?? <span className="text-muted-foreground italic">Not captured. Surface at next meeting.</span>}</div>
    </div>
  );
}

function ConfidenceChip({ c }: { c: Confidence }) {
  const cls =
    c === "Explicit" ? "bg-primary text-primary-foreground" :
    c === "Pattern" ? "bg-accent/15 text-accent border border-accent/30" :
    "bg-secondary text-secondary-foreground border border-border";
  return (
    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${cls}`} title={
      c === "Explicit" ? "Explicit, the client said this" :
      c === "Pattern" ? "Pattern, observed from behaviour" :
      "Inferred, assumed by the model"
    }>{c}</span>
  );
}

function MemoryPillar({ title, icon, items }: { title: string; icon: React.ReactNode; items: { text: string; c: Confidence }[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
        <span className="text-accent">{icon}</span>{title}
      </div>
      <ul className="space-y-1.5">
        {items.length === 0 && <li className="text-xs text-muted-foreground italic">Not captured yet.</li>}
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-2 text-sm leading-snug">
            <span className="flex-1">{it.text}</span>
            <ConfidenceChip c={it.c} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiscardDialog({
  recTitle, clientName, category, setCategory, reason, setReason, onClose, onConfirm,
}: {
  recTitle: string; clientName: string;
  category: string; setCategory: (s: string) => void;
  reason: string; setReason: (s: string) => void;
  onClose: () => void; onConfirm: () => void;
}) {
  const categories = [
    "Not relevant for this client",
    "Wrong timing",
    "Conflicts with client values",
    "Compliance or mandate concern",
    "Already discussed offline",
    "Other",
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-6"
      onClick={onClose}>
      <div className="bg-background border border-border rounded-lg w-full max-w-lg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-xl tracking-tight">Discard this recommendation</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              For {clientName}, <span className="italic">{recTitle}</span>. Your reason is fed back to the agent so the next suggestion is sharper.
            </div>
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Why are you discarding?</div>
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(c)}
                className={`text-left text-xs px-3 py-2 rounded border transition ${
                  active ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-secondary/50"
                }`}>{c}</button>
            );
          })}
        </div>

        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">A note for the agent (optional but valued)</div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
          placeholder="e.g. Eugen does not want US mega-cap tech in his sleeve. Hold off on the CIO TAA push."
          className="w-full text-sm leading-relaxed p-3 bg-background border border-border rounded resize-none font-sans" />

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground leading-snug max-w-[260px]">
            The agent learns per client, per category. Future recs respect this.
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary/50 transition">Cancel</button>
            <button onClick={onConfirm}
              className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:opacity-90 transition flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalLayer<T extends string>({
  p,
  firstName,
  showWidget,
  widgetTileProps,
}: {
  p: NonNullable<ReturnType<typeof getClient>["dna"]["personal"]>;
  firstName: string;
  showWidget: (id: T) => boolean;
  widgetTileProps: (id: T) => {
    editMode?: boolean;
    widgetHidden?: boolean;
    onVisibilityToggle?: () => void;
  };
}) {
  const kindIcon: Record<string, React.ReactNode> = {
    Birthday: <Cake className="w-3.5 h-3.5" />,
    Anniversary: <Heart className="w-3.5 h-3.5" />,
    Memorial: <Star className="w-3.5 h-3.5" />,
    Milestone: <Sparkles className="w-3.5 h-3.5" />,
  };
  return (
    <>
      {showWidget("personal-hero") && (
      <Section id="personal-hero" title="The person behind the portfolio" subtitle={`In ${firstName}'s words`} icon={<Heart />} accent="human" bento="square" {...widgetTileProps("personal-hero")}>
        <div className="grid grid-cols-[1.4fr_1fr] items-start gap-8">
          {p.voice && (
            <div>
              <Quote className="mb-2 h-5 w-5 text-accent/60" />
              <p className="font-display text-2xl italic leading-snug tracking-tight">"{p.voice}"</p>
              <div className="mt-2 text-xs text-muted-foreground">In {firstName}'s words, from a recent call.</div>
            </div>
          )}
          {p.lastPersonalTouch && (
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Last personal touch</div>
              <div className="text-xs tabular text-muted-foreground">{p.lastPersonalTouch.date}</div>
              <p className="mt-1 text-sm leading-snug">{p.lastPersonalTouch.text}</p>
            </div>
          )}
        </div>
      </Section>
      )}

      {showWidget("personal-family") && (
      <Section id="personal-family" title="Family & inner life" icon={<Users />} accent="human" bento="square" {...widgetTileProps("personal-family")}>
        <ul className="space-y-3">
          {(p.family ?? []).map((f) => (
            <li key={f.name} className="grid grid-cols-[32px_1fr] items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-[10px] font-medium text-accent">
                {f.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="text-sm"><span className="font-medium">{f.name}</span> <span className="text-muted-foreground">· {f.relation}</span></div>
                {f.note && <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{f.note}</div>}
              </div>
            </li>
          ))}
        </ul>
      </Section>
      )}

      {showWidget("personal-dates") && (
      <Section id="personal-dates" title="Dates that matter" subtitle="Show up on these, never miss them" icon={<Cake />} accent="accent" bento="square" {...widgetTileProps("personal-dates")}>
        <ul className="space-y-2.5">
          {(p.keyDates ?? []).map((k) => (
            <li key={k.date + k.label} className="grid grid-cols-[56px_20px_1fr] items-baseline gap-2">
              <div className="text-xs font-medium tabular">{k.date}</div>
              <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                k.kind === "Memorial" ? "bg-muted-foreground/15 text-muted-foreground" :
                k.kind === "Birthday" ? "bg-accent/15 text-accent" :
                k.kind === "Anniversary" ? "bg-destructive/10 text-destructive" :
                "bg-primary/10 text-primary"
              }`}>{kindIcon[k.kind]}</div>
              <div className="text-sm leading-snug">{k.label}</div>
            </li>
          ))}
        </ul>
      </Section>
      )}

      {showWidget("personal-rituals") && (
      <Section id="personal-rituals" title="Small things they love" subtitle="Rituals worth remembering" icon={<Heart />} accent="human" bento="square" {...widgetTileProps("personal-rituals")}>
        <ul className="space-y-1.5 text-sm">
          {(p.ritualsAndLoves ?? []).map((r) => (
            <li key={r} className="flex gap-2 leading-snug"><span className="text-accent">·</span>{r}</li>
          ))}
        </ul>
      </Section>
      )}

      {showWidget("personal-starters") && (
      <Section id="personal-starters" title="Conversation starters" subtitle="They light up on these" icon={<MessageSquare />} accent="trust" bento="square" {...widgetTileProps("personal-starters")}>
        <ul className="space-y-1.5 text-sm">
          {(p.conversationStarters ?? []).map((c) => (
            <li key={c} className="flex gap-2 leading-snug"><span className="text-positive">·</span>{c}</li>
          ))}
        </ul>
      </Section>
      )}

      {showWidget("personal-gifts") && (
      <Section id="personal-gifts" title="Gifting & gestures" icon={<Gift />} accent="insight" bento="square" {...widgetTileProps("personal-gifts")}>
        <p className="text-sm leading-relaxed">{p.giftNotes ?? <span className="italic text-muted-foreground">Not captured.</span>}</p>
      </Section>
      )}

      {(p.neverForget ?? []).length > 0 && showWidget("personal-never") && (
        <Section id="personal-never" title="Never forget" subtitle="Sensitive context — handle with care" icon={<ShieldAlert />} accent="risk" bento="square" {...widgetTileProps("personal-never")}>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {(p.neverForget ?? []).map((n) => (
              <li key={n} className="flex gap-2 leading-snug"><span className="mt-0.5 text-destructive">!</span>{n}</li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
