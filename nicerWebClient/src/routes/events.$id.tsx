import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { getEvent, getClient } from "@/lib/mock-data";
import { ArrowLeft, AlertTriangle, Send, Sparkles, Check, Mail, Phone, Smartphone, UserCheck, GitBranch } from "lucide-react";
import type { Channel } from "@/lib/mock-data";

export const Route = createFileRoute("/events/$id")({
  head: ({ params }) => ({ meta: [{ title: `Brief - ${params.id}, AURA` }] }),
  notFoundComponent: () => (<AppShell><div className="py-20 text-center text-muted-foreground">Event not found.</div></AppShell>),
  loader: ({ params }) => {
    const e = getEvent(params.id);
    if (!e) throw notFound();
    return { eventId: params.id };
  },
  component: EventBrief,
});

const channelIcon: Record<Channel, React.ReactNode> = {
  Email: <Mail className="w-3.5 h-3.5" />,
  Phone: <Phone className="w-3.5 h-3.5" />,
  WhatsApp: <Smartphone className="w-3.5 h-3.5" />,
  "In-Person": <UserCheck className="w-3.5 h-3.5" />,
  Assistant: <UserCheck className="w-3.5 h-3.5" />,
};

function tailoredRisk(firstName: string, style: string, ticker: string, exposurePct: number, eventTitle: string) {
  const opener = style === "Numbers-first"
    ? `${firstName}, urgent: ${ticker} now ${exposurePct.toFixed(1)}% of portfolio.`
    : style === "Concise"
    ? `Dear ${firstName}, a brief but important note on your ${ticker} position.`
    : style === "Values-driven"
    ? `Dear ${firstName},\n\nGiven your preference for clean governance, an important update on a name in your portfolio.`
    : `${firstName}, quick context on a position we hold for you.`;
  const body = `${eventTitle}. Your exposure is ${exposurePct.toFixed(1)}% (${ticker}). CIO has moved coverage to Sell across mandates. I recommend a full exit at the next open and will follow with a redeployment proposal aligned to your strategy.`;
  const close = style === "Values-driven"
    ? `Happy to walk you through it when convenient.\n\nWarm regards,\nSarah`
    : style === "Numbers-first"
    ? `Approve to exit at open?\n- Sarah`
    : `Call me at your convenience.\n- Sarah`;
  return `${opener}\n\n${body}\n\n${close}`;
}

function tailoredOpp(firstName: string, style: string, fitReason: string, eventTitle: string, suggested: string) {
  const opener = style === "Numbers-first"
    ? `${firstName}, new idea worth a look.`
    : style === "Values-driven"
    ? `Dear ${firstName},\n\nA new fund just landed that I think genuinely lines up with what matters to you.`
    : `Dear ${firstName}, a quick idea I'd like to put in front of you.`;
  const body = `${eventTitle}. The reason I'm bringing it to you specifically: ${fitReason} A starting allocation of ${suggested} would fit your current shape without disturbing the strategy.`;
  const close = style === "Numbers-first"
    ? `Worth a 5-min call?\n- Sarah`
    : `Happy to walk you through it when convenient.\n\nSarah`;
  return `${opener}\n\n${body}\n\n${close}`;
}

// ── Decision Tree ─────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  label: string;
  value?: string;
  type: "input" | "logic" | "output" | "action";
  children?: TreeNode[];
}

function buildDecisionTree(
  c: ReturnType<typeof getClient>,
  a: { ticker: string; exposurePct?: number; exposureChf?: number; fitScore?: number; fitReason?: string; suggestedAllocChf?: number },
  e: ReturnType<typeof getEvent>,
  isOpp: boolean
): TreeNode {
  const firstName = c.name.split(" ")[0];
  const topValues = c.dna.values.slice(0, 2).map(v => v.label);

  if (isOpp) {
    return {
      id: "root", label: "Market signal", value: e.title, type: "input",
      children: [{
        id: "fit", label: "Client fit check", value: `Fit score ${a.fitScore ?? 0}/100`, type: "logic",
        children: [{
          id: "dna", label: "DNA alignment", value: topValues[0] ?? "Core values", type: "input",
          children: [{
            id: "why", label: "Why this client", value: a.fitReason?.slice(0, 80) + "…" ?? "Strong alignment", type: "logic",
            children: [{
              id: "channel", label: `Via ${c.preferredChannel}`, value: c.communicationStyle, type: "logic",
              children: [{
                id: "msg", label: `Draft to ${firstName}`, value: `CHF ${a.suggestedAllocChf?.toFixed(2) ?? "–"}M suggested`, type: "output",
                children: [{ id: "send", label: "RM approval", value: "Required before send", type: "action" }],
              }],
            }],
          }],
        }],
      }],
    };
  } else {
    return {
      id: "root", label: "Market alert", value: e.title, type: "input",
      children: [{
        id: "exposure", label: "Exposure check", value: `${(a.exposurePct ?? 0).toFixed(1)}% in ${a.ticker}`, type: "logic",
        children: [{
          id: "severity", label: `Severity: ${e.severity}`, value: `CHF ${(a.exposureChf ?? 0).toFixed(2)}M at risk`, type: "logic",
          children: [{
            id: "dna", label: "DNA conflict", value: topValues[0]?.slice(0, 60) ?? "Values breach", type: "input",
            children: [{
              id: "channel", label: `Via ${c.preferredChannel}`, value: c.communicationStyle, type: "logic",
              children: [{
                id: "msg", label: `Alert to ${firstName}`, value: `Recommend exit + redeploy`, type: "output",
                children: [{ id: "send", label: "RM approval", value: "Required before send", type: "action" }],
              }],
            }],
          }],
        }],
      }],
    };
  }
}

const NODE_COLORS: Record<TreeNode["type"], { bg: string; border: string; text: string; dot: string }> = {
  input:  { bg: "#f0f4ff", border: "#c7d4f0", text: "#1e3a8a", dot: "#3b82f6" },
  logic:  { bg: "#f5f5f5", border: "#d4d4d4", text: "#333",    dot: "#888" },
  output: { bg: "#f0fdf4", border: "#bbf7d0", text: "#14532d", dot: "#22c55e" },
  action: { bg: "#fffbeb", border: "#fde68a", text: "#78350f", dot: "#f59e0b" },
};

const NODE_W = 155;
const NODE_H = 90;
const H_GAP = 40;
const V_GAP = 16;

interface LayoutNode extends TreeNode { x: number; y: number; depth: number; }

function layoutTree(root: TreeNode): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  let depthY: number[] = [];

  function visit(n: TreeNode, depth: number): number {
    const y = depthY[depth] ?? 0;
    depthY[depth] = y + NODE_H + V_GAP;
    const laid: LayoutNode = { ...n, x: depth * (NODE_W + H_GAP), y, depth };
    nodes.push(laid);
    if (n.children?.length) {
      n.children.forEach(child => visit(child, depth + 1));
      // centre parent vertically over children
      const childNodes = nodes.filter(nd => n.children!.some(c => c.id === nd.id));
      if (childNodes.length) {
        const minY = Math.min(...childNodes.map(nd => nd.y));
        const maxY = Math.max(...childNodes.map(nd => nd.y));
        laid.y = (minY + maxY) / 2;
      }
    }
    return laid.y;
  }

  visit(root, 0);
  return nodes;
}

function DecisionTreeOverlay({ tree, onClose }: { tree: TreeNode; onClose: () => void }) {
  const nodes = useMemo(() => layoutTree(tree), [tree]);
  const maxX = Math.max(...nodes.map(n => n.x)) + NODE_W + 32;
  const maxY = Math.max(...nodes.map(n => n.y)) + NODE_H + 32;

  // Build edges
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  function buildEdges(n: TreeNode) {
    const parent = nodes.find(nd => nd.id === n.id)!;
    n.children?.forEach(child => {
      const childNode = nodes.find(nd => nd.id === child.id)!;
      if (parent && childNode) {
        edges.push({
          x1: parent.x + NODE_W,
          y1: parent.y + NODE_H / 2,
          x2: childNode.x,
          y2: childNode.y + NODE_H / 2,
        });
      }
      buildEdges(child);
    });
  }
  buildEdges(tree);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", maxWidth: "90vw", maxHeight: "80vh", overflow: "auto", padding: 28 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#555" }}>
            Decision rationale
          </div>
          <button onClick={onClose} style={{ fontSize: 18, color: "#aaa", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <svg width={maxX} height={maxY} style={{ display: "block" }}>
            {/* Edges */}
            {edges.map((e, i) => {
              const mx = (e.x1 + e.x2) / 2;
              return (
                <motion.path
                  key={i}
                  d={`M${e.x1},${e.y1} C${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`}
                  fill="none" stroke="#d4d4d4" strokeWidth={1.5}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((n, i) => {
              const col = NODE_COLORS[n.type];
              return (
                <motion.g key={n.id}
                  initial={{ opacity: 0, x: n.x - 10 }}
                  animate={{ opacity: 1, x: n.x }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.07, type: "spring", stiffness: 280, damping: 22 }}
                >
                  <rect
                    x={0} y={n.y} width={NODE_W} height={NODE_H} rx={8}
                    fill={col.bg} stroke={col.border} strokeWidth={1.5}
                  />
                  <circle cx={12} cy={n.y + 12} r={4} fill={col.dot} />
                  <text x={20} y={n.y + 17} fontSize={8.5} fontWeight={700} fill={col.text}
                    style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {n.label}
                  </text>
                  {n.value && (
                    <foreignObject x={8} y={n.y + 26} width={NODE_W - 16} height={NODE_H - 32}>
                      <div style={{ fontSize: 11, color: "#444", lineHeight: 1.4, wordBreak: "break-word", overflowWrap: "break-word" }}>
                        {n.value}
                      </div>
                    </foreignObject>
                  )}
                </motion.g>
              );
            })}
          </svg>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {(["input", "logic", "output", "action"] as const).map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#666" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: NODE_COLORS[t].dot }} />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

function EventBrief() {
  const { eventId } = Route.useLoaderData();
  const e = getEvent(eventId);
  const isOpp = e.kind === "Opportunity";
  const [mode, setMode] = useState<"tailored" | "standard">("tailored");
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(e.affected.map((a) => [a.clientId, true])),
  );
  const [standardTemplate, setStandardTemplate] = useState<string>(
    isOpp
      ? `Dear {firstName},\n\nA new opportunity worth your eye: {eventTitle}.\n\nThe reason I'm bringing it to you specifically: {fitReason} A starting allocation of CHF {suggestedAllocChf}M would fit your current shape.\n\nHappy to walk you through it.\n\n- Sarah`
      : `Dear {firstName},\n\nA quick but important update: {eventTitle}. Your portfolio holds {exposurePct}% in {ticker} (approx. CHF {exposureChf}M).\n\nOur CIO has moved coverage to Sell. I'd like to exit the position at the next open and propose a same-strategy redeployment.\n\nPlease let me know if this works, happy to take your call.\n\n- Sarah`,
  );
  const [activeTree, setActiveTree] = useState<{ clientId: string } | null>(null);

  const items = useMemo(() => e.affected.map((a) => {
    const c = getClient(a.clientId);
    const firstName = c.name.split(" ")[0];
    const tailored = isOpp
      ? tailoredOpp(firstName, c.communicationStyle, a.fitReason ?? "", e.title, a.suggestedAllocChf ? `CHF ${a.suggestedAllocChf.toFixed(1)}M` : "a small ticket")
      : tailoredRisk(firstName, c.communicationStyle, a.ticker, a.exposurePct ?? 0, e.title);
    return { a, c, tailored };
  }), [e, isOpp]);

  const chosenCount = Object.values(selected).filter(Boolean).length;
  const variables = isOpp
    ? ["{firstName}", "{fullName}", "{eventTitle}", "{ticker}", "{fitReason}", "{suggestedAllocChf}"]
    : ["{firstName}", "{fullName}", "{eventTitle}", "{ticker}", "{exposurePct}", "{exposureChf}"];

  function renderTemplate(tpl: string, c: ReturnType<typeof getClient>, a: typeof e.affected[number]) {
    return tpl
      .replaceAll("{firstName}", c.name.split(" ")[0])
      .replaceAll("{fullName}", c.name)
      .replaceAll("{eventTitle}", e.title)
      .replaceAll("{exposurePct}", (a.exposurePct ?? 0).toFixed(1))
      .replaceAll("{exposureChf}", (a.exposureChf ?? 0).toFixed(2))
      .replaceAll("{fitReason}", a.fitReason ?? "")
      .replaceAll("{suggestedAllocChf}", (a.suggestedAllocChf ?? 0).toFixed(2))
      .replaceAll("{ticker}", a.ticker);
  }

  const chipClass = isOpp
    ? "bg-positive/10 text-positive border-positive/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

  const activeTreeItem = activeTree ? items.find(it => it.c.id === activeTree.clientId) : null;
  const activeTreeData = activeTreeItem
    ? buildDecisionTree(activeTreeItem.c, activeTreeItem.a, e, isOpp)
    : null;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Events" }, { label: "Brief" }]}>
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-3 h-3" /> Back to book
      </Link>

      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${chipClass}`}>{e.kind} · {e.category}</span>
            <span className="text-xs text-muted-foreground tabular">{e.date}</span>
          </div>
          <h1 className="font-display text-4xl tracking-tight">{e.title}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">{e.summary}</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition flex items-center gap-2">
            <Check className="w-4 h-4" /> {isOpp ? `Pitch to ${chosenCount}` : `Approve & send to ${chosenCount}`}
          </button>
          <Link to="/copilot" className="px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary/50 transition flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Discuss with copilot
          </Link>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden mb-6">
        <div className="flex border-b border-border">
          <button onClick={() => setMode("tailored")}
            className={`px-5 py-3 text-sm border-b-2 transition ${mode === "tailored" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            Tailored per client
          </button>
          <button onClick={() => setMode("standard")}
            className={`px-5 py-3 text-sm border-b-2 transition ${mode === "standard" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            Standard template, variables
          </button>
          <div className="ml-auto px-5 py-3 text-xs text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-muted-foreground" /> {chosenCount} of {e.affected.length} selected
          </div>
        </div>

        {mode === "standard" && (
          <div className="p-5 border-b border-border bg-secondary/20">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Template (shared)</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {variables.map((v) => (
                <button key={v} onClick={() => setStandardTemplate((t) => t + " " + v)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-background hover:bg-accent/10 hover:text-accent transition">
                  {v}
                </button>
              ))}
            </div>
            <textarea value={standardTemplate} onChange={(ev) => setStandardTemplate(ev.target.value)} rows={8}
              className="w-full text-sm leading-relaxed p-3 bg-background border border-border rounded resize-none font-sans" />
          </div>
        )}

        {items.map(({ a, c, tailored }) => {
          const isOn = selected[c.id];
          const draft = mode === "tailored" ? tailored : renderTemplate(standardTemplate, c, a);
          return (
            <div key={`${c.id}-${a.ticker}`} className={`px-5 py-4 border-b border-border last:border-b-0 ${isOn ? "" : "opacity-50"}`}>
              <div className="flex items-start gap-4">
                <input type="checkbox" checked={isOn} onChange={() => setSelected((s) => ({ ...s, [c.id]: !s[c.id] }))}
                  className="mt-1 w-4 h-4 accent-accent" />
                <div className="flex-1 grid grid-cols-[1fr_1.6fr] gap-5">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.segment} · {c.domicile} · {c.timezone}</div>
                    <div className="mt-3 space-y-1 text-xs">
                      {isOpp ? (
                        <>
                          <div className="flex justify-between"><span className="text-muted-foreground">Fit score</span><span className="tabular">{a.fitScore ?? 0}/100</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Suggested ticket</span><span className="tabular">CHF {(a.suggestedAllocChf ?? 0).toFixed(2)}M</span></div>
                          {a.fitReason && <div className="text-[11px] text-foreground/70 leading-snug mt-1 pt-1 border-t border-border italic">{a.fitReason}</div>}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between"><span className="text-muted-foreground">Position</span><span className="tabular">{(a.exposurePct ?? 0).toFixed(1)}%</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">CHF exposure</span><span className="tabular">CHF {(a.exposureChf ?? 0).toFixed(2)}M</span></div>
                        </>
                      )}
                      <div className="flex justify-between items-center"><span className="text-muted-foreground">Channel</span>
                        <span className="inline-flex items-center gap-1">{channelIcon[c.preferredChannel]} {c.preferredChannel}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Style</span><span>{c.communicationStyle}</span></div>
                      {c.hasAssistant && <div className="flex justify-between"><span className="text-muted-foreground">Via</span><span>{c.assistantName}</span></div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                      <span>{mode === "tailored" ? "Draft, tailored to client DNA" : "Preview, rendered from shared template"}</span>
                      <button
                        onClick={() => setActiveTree({ clientId: c.id })}
                        title="Show decision rationale"
                        className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent/10 hover:text-accent hover:border-accent/40 transition text-muted-foreground"
                      >
                        <GitBranch className="w-3 h-3" />
                        <span className="text-[9px] uppercase tracking-wider font-semibold">Why</span>
                      </button>
                    </div>
                    <textarea defaultValue={draft} key={draft} rows={8}
                      className="w-full text-sm leading-relaxed p-3 bg-background border border-border rounded resize-none font-sans" />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-[11px] text-muted-foreground">Sends via {c.preferredChannel} at next sensible window for {c.timezone}.</div>
                      <button className="text-xs px-3 py-1 rounded border border-border hover:bg-secondary/50 transition flex items-center gap-1.5">
                        <Send className="w-3 h-3" /> Send to {c.name.split(" ")[0]}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-muted-foreground leading-relaxed">
        Every message requires RM approval before send. No automated trades are placed from this screen.
      </div>

      <AnimatePresence>
        {activeTree && activeTreeData && (
          <DecisionTreeOverlay
            tree={activeTreeData}
            onClose={() => setActiveTree(null)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
