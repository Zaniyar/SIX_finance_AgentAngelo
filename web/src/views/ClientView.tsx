import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import TopBar from "../components/TopBar";
import { api, chf, ClientDetail, DraftMessage, Alert, ReasonStep } from "../api";

export default function ClientView() {
  const { id = "" } = useParams();
  const [d, setD] = useState<ClientDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setD(null); setErr(null);
    api.client(id).then(setD).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <Shell id={id}><ErrorState msg={err} /></Shell>;
  if (!d) return <Shell id={id}><div className="shell" style={{ padding: 80 }}><span className="label">Loading client intelligence…</span></div></Shell>;

  const alert = d.alerts[0];
  return (
    <Shell id={id} crumb={<span style={{ fontWeight: 600, color: "var(--ink)" }}>{d.client.name}</span>}>
      <div className="shell" style={{ paddingTop: 36, paddingBottom: 72 }}>
        {/* hero */}
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 30 }}>
          <div>
            <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 12 }}>
              <span className="chip">{d.client.mandate} mandate</span>
              <span className="label">RM · {d.client.rm}</span>
            </div>
            <h1 className="display" style={{ fontSize: "clamp(34px,4.5vw,58px)" }}>{d.client.displayName}</h1>
            <p className="body" style={{ marginTop: 12, maxWidth: 560 }}>{d.client.tagline}</p>
          </div>
          <div className="col" style={{ alignItems: "flex-end", gap: 16 }}>
            <div className="col" style={{ alignItems: "flex-end" }}>
              <span className="mono" style={{ fontSize: 30, fontWeight: 700 }}>CHF {chf(d.portfolioValueChf)}</span>
              <span className="label">Portfolio value</span>
            </div>
            <Link to={`/client/${id}/twin`} className="btn">◢ Rehearse with digital twin</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 22, alignItems: "start" }}>
          {/* LEFT: the decision flow */}
          <div className="col" style={{ gap: 22 }}>
            {alert ? <AlertCard alert={alert} /> : <div className="card card-pad small">No active alerts.</div>}
            {alert?.swap && <SwapCard alert={alert} />}
            {alert && <DraftCard id={id} alertId={alert.id} />}
          </div>

          {/* RIGHT: who they are + book */}
          <div className="col" style={{ gap: 22 }}>
            <DnaCard d={d} />
            <PortfolioCard d={d} />
            {alert && alert.news.length > 0 && <NewsCard alert={alert} />}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ id, crumb, children }: { id: string; crumb?: React.ReactNode; children: React.ReactNode }) {
  return <div className="col" style={{ minHeight: "100%" }}><TopBar crumb={crumb} />{children}</div>;
}

// ---- Alert -----------------------------------------------------------------
function AlertCard({ alert }: { alert: Alert }) {
  const conflict = alert.direction === "conflict";
  const col = conflict ? "var(--signal)" : "var(--grow)";
  return (
    <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
>
      <div className="card-pad">
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="chip" style={{ borderColor: col, color: conflict ? "var(--signal-ink)" : "var(--grow-ink)" }}>
            {conflict ? "● Values conflict" : "● Opportunity"}
          </span>
          <span className="label">Severity · {alert.severity}</span>
        </div>
        <h2 className="h1" style={{ marginBottom: 12 }}>{alert.title}</h2>
        <p className="body">{alert.body}</p>
        <div style={{ marginTop: 16, padding: 14, background: "var(--paper-2)", borderRadius: 2 }}>
          <span className="label">Matched to client DNA</span>
          <p style={{ fontSize: 14, marginTop: 6, fontWeight: 500 }}>“{alert.dnaValue}”</p>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Swap proposal with the auditable reason chain -------------------------
function SwapCard({ alert }: { alert: Alert }) {
  const s = alert.swap!;
  const from = s.fromHolding;
  const to = s.toCandidate;
  const passCount = s.reasonChain.filter(r => r.pass).length;
  const fitPct = Math.round(passCount / Math.max(s.reasonChain.length, 1) * 100);
  const driftDelta = from ? Math.abs(from.driftPp) : 0;
  const liveAmount = to.livePrice
    ? `${to.livePrice.currency} ${to.livePrice.currentPrice}`
    : `CHF ${chf(s.amountChf)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4 }}
      style={{ background: "#fff", border: "1px solid #e8e6e1", overflow: "hidden" }}
    >
      {/* ── Top strip: eyebrow + headline ─────────────────────────────────── */}
      <div style={{ padding: "28px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#999" }}>Proposed action</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ccc" }} />
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0e7c66" }}>CIO-approved · Same sector</span>
        </div>
        <p style={{ fontSize: 15, color: "#444", lineHeight: 1.6, maxWidth: 560, margin: 0, paddingBottom: 24 }}>
          {s.rationale}
        </p>
      </div>

      {/* ── Swap flow ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 1fr", background: "#f5f4f0" }}>

        {/* FROM */}
        <div style={{ background: "#fff", padding: "24px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4180f" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4180f" }}>Exit</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 4 }}>
            {from?.issuer ?? "—"}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>{from?.industry}</div>
          <div style={{ display: "flex", flex: "column", gap: 0 }}>
            <KV k="Position" v={`CHF ${chf(from?.currentChf ?? 0)}`} big />
            <KV k="Mandate drift" v={`${(from?.driftPp ?? 0) >= 0 ? "+" : ""}${from?.driftPp ?? 0}pp`} />
          </div>
        </div>

        {/* Arrow column */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <div style={{ width: 1, flex: 1, background: "#e0ddd7" }} />
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#111",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>→</span>
          </div>
          <div style={{ width: 1, flex: 1, background: "#e0ddd7" }} />
        </div>

        {/* TO */}
        <div style={{ background: "#fff", padding: "24px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0e7c66" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0e7c66" }}>Reinvest</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 4 }}>
            {to.issuer}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>{to.industry}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <KV k="Amount" v={liveAmount} big accent="green" />
            <KV k="CIO rating" v={to.rating} accent="green" />
          </div>
        </div>
      </div>

      {/* ── Metrics row ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", background: "#f5f4f0", gap: "1px" }}>
        {[
          {
            icon: "✓",
            label: "Guardrail checks",
            value: `${passCount} / ${s.reasonChain.length}`,
            sub: "all critical passed",
            ok: passCount === s.reasonChain.length,
          },
          {
            icon: "⊘",
            label: "Mandate drift after swap",
            value: driftDelta > 0.5 ? `−${(driftDelta * 0.1).toFixed(2)}pp` : "Unchanged",
            sub: "within ±2pp band",
            ok: true,
          },
          {
            icon: "◈",
            label: "Sector exposure",
            value: `${s.sector}`,
            sub: "weight preserved",
            ok: true,
          },
        ].map((m, i) => (
          <motion.div key={i}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.06 }}
            style={{ background: "#fff", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: m.ok ? "#0e7c66" : "#d4180f" }}>{m.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa" }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "#111", marginBottom: 3 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: "#999" }}>{m.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Audit trail ───────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 32px 24px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", marginBottom: 12 }}>
          Audit trail
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {s.reasonChain.map((r, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{
                flexShrink: 0, marginTop: 1,
                width: 18, height: 18, borderRadius: "50%",
                background: r.pass ? "#e8f4f1" : "#fce8e7",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700,
                color: r.pass ? "#0e7c66" : "#d4180f",
              }}>
                {r.pass ? "✓" : "!"}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", lineHeight: 1.3 }}>{r.label}</div>
                <div style={{ fontSize: 11.5, color: "#888", marginTop: 2, lineHeight: 1.4 }}>{r.detail}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function KV({ k, v, big, accent }: { k: string; v: string; big?: boolean; accent?: "green" | "red" }) {
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid #f0ede8", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>{k}</span>
      <span style={{
        fontSize: big ? 14 : 12, fontWeight: big ? 700 : 600,
        fontFamily: "var(--mono)",
        color: accent === "green" ? "#0e7c66" : accent === "red" ? "#d4180f" : "#111",
        letterSpacing: "-0.01em",
      }}>{v}</span>
    </div>
  );
}


function Check({ r }: { r: ReasonStep }) {
  return (
    <div className="check">
      <span className={`tick ${r.pass ? "pass" : "fail"}`}>{r.pass ? "✓" : "!"}</span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.label}</div>
        <div className="small" style={{ marginTop: 2 }}>{r.detail}</div>
      </div>
    </div>
  );
}

// ---- RM draft message ------------------------------------------------------
function DraftCard({ id, alertId }: { id: string; alertId: string }) {
  const [draft, setDraft] = useState<DraftMessage | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const generate = async () => {
    setLoading(true); setErr(null); setSent(false);
    try {
      const d = await api.draft(id, alertId);
      setDraft(d); setBody(d.body);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <motion.div className="card card-pad" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <span className="h2">Draft for the client</span>
        {draft && <span className="chip">tone · {draft.tone}</span>}
      </div>

      {!draft && !err && (
        <div className="col" style={{ gap: 14 }}>
          <p className="small">Generate a tone-matched message. The AI drafts the words — you review, edit and decide. The client never hears from the AI directly.</p>
          <button className="btn" onClick={generate} disabled={loading}>{loading ? "Drafting…" : "✎ Draft message"}</button>
        </div>
      )}

      {err && <IntegrationNote msg={err} retry={generate} />}

      {draft && (
        <div className="col" style={{ gap: 12 }}>
          <div className="label">Subject — {draft.subject}</div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9}
            style={{ width: "100%", padding: 14, border: "1px solid var(--hairline)", borderRadius: 2, fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.6, resize: "vertical", color: "var(--ink)" }} />
          <div className="between">
            <button className="btn ghost" onClick={generate} disabled={loading}>↻ Regenerate</button>
            <button className="btn" onClick={() => setSent(true)} disabled={sent}>{sent ? "✓ Queued for client" : "Approve & send"}</button>
          </div>
          {sent && <p className="small" style={{ color: "var(--grow-ink)" }}>Approved by RM. Queued — client will place any orders themselves.</p>}
        </div>
      )}
    </motion.div>
  );
}

// ---- Client DNA ------------------------------------------------------------
// ── DNA category config ────────────────────────────────────────────────────────
const DNA_CATEGORIES = [
  {
    key: "values" as const,
    label: "Core Values",
    icon: "◆",
    color: "#c21d12",        // red — non-negotiable
    bg: "rgba(194,29,18,0.07)",
    tip: "Non-negotiable — drives divestment decisions",
  },
  {
    key: "preferences" as const,
    label: "Preferences & Aversions",
    icon: "▲",
    color: "#0e7c66",        // green — investment constraints
    bg: "rgba(14,124,102,0.07)",
    tip: "Explicit investment preferences and things to avoid",
  },
  {
    key: "context" as const,
    label: "Personal Context",
    icon: "●",
    color: "#1f1bff",        // blue — background facts
    bg: "rgba(31,27,255,0.06)",
    tip: "Life events, business context, family situation",
  },
] as const;

const TONE_META: Record<string, { label: string; icon: string; color: string }> = {
  "analytical":        { label: "Analytical",        icon: "📊", color: "#1f1bff" },
  "values-led":        { label: "Values-Led",         icon: "♦",  color: "#c21d12" },
  "relationship-led":  { label: "Relationship-Led",   icon: "◎",  color: "#0e7c66" },
};

function DnaCard({ d }: { d: ClientDetail }) {
  if (!d.dnaAvailable) {
    return (
      <div className="card card-pad">
        <span className="h2">Client DNA</span>
        <IntegrationNote msg="Phoeniqs LLM not configured — DNA, drafts and the digital twin need PHOENIQS_API_KEY." />
      </div>
    );
  }
  const { dna } = d;
  const tone = TONE_META[dna.toneProfile] ?? { label: dna.toneProfile, icon: "◎", color: "var(--ink-3)" };

  return (
    <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="card-pad" style={{ paddingBottom: 14 }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <span className="h2">Client DNA</span>
          {/* Tone badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px",
            border: `1px solid ${tone.color}44`,
            background: `${tone.color}0e`,
          }}>
            <span style={{ fontSize: 11 }}>{tone.icon}</span>
            <span style={{ fontSize: 10, fontFamily: "var(--mono)", letterSpacing: "0.1em", color: tone.color, fontWeight: 700, textTransform: "uppercase" }}>
              {tone.label}
            </span>
          </div>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{dna.summary}</p>
      </div>

      {/* Category blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--hairline)" }}>
        {DNA_CATEGORIES.map((cat) => {
          const items: string[] = (dna as any)[cat.key] ?? [];
          if (!items.length) return null;
          return (
            <div key={cat.key} style={{ background: "var(--card)", padding: "14px 20px" }}>
              {/* Category header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                  background: cat.bg, fontSize: 10, color: cat.color, fontWeight: 700,
                }}>
                  {cat.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: cat.color }}>
                  {cat.label}
                </span>
                <span style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: "auto" }}>{cat.tip}</span>
              </div>
              {/* Items as pills/chips */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "7px 10px",
                      background: "var(--paper)",
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 16, height: 16, marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: cat.color, fontWeight: 700,
                      border: `1px solid ${cat.color}44`,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comms style footer */}
      {dna.commsStyle && (
        <div style={{ padding: "12px 20px", background: "var(--paper-2)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 5 }}>
            ◎ How to communicate
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)", fontStyle: "italic" }}>"{dna.commsStyle}"</p>
        </div>
      )}
    </motion.div>
  );
}

// Keep for any remaining usages
function DnaList({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="label" style={{ marginBottom: 8 }}>{title}</div>
      <div className="col" style={{ gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: accent ? "var(--signal)" : "var(--ink-3)", lineHeight: 1.4 }}>▪</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Portfolio -------------------------------------------------------------
function PortfolioCard({ d }: { d: ClientDetail }) {
  const flaggedIsin = d.alerts[0]?.holding?.isin;
  const equities = d.holdings.filter((h) => h.assetClass === "Equities").sort((a, b) => b.currentChf - a.currentChf);
  const top = equities.slice(0, 9);
  if (flaggedIsin && !top.find((h) => h.isin === flaggedIsin)) {
    const f = equities.find((h) => h.isin === flaggedIsin);
    if (f) top.push(f);
  }
  return (
    <div className="card card-pad">
      <div className="between" style={{ marginBottom: 14 }}>
        <span className="h2">Portfolio</span>
        <span className="label">{equities.length} equity positions</span>
      </div>
      <div className="col">
        {top.map((h) => {
          const flag = h.isin === flaggedIsin;
          return (
            <div key={h.isin} className="between" style={{ padding: "10px 0" }}>
              <div className="row" style={{ gap: 8, alignItems: "center", minWidth: 0 }}>
                {flag && <span className="dot bad" />}
                <div className="col" style={{ gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: flag ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220, color: flag ? "var(--signal-ink)" : "var(--ink)" }}>{h.issuer}</span>
                  <span className="label" style={{ fontSize: 9.5 }}>{h.industry}</span>
                </div>
              </div>
              <span className="mono" style={{ fontSize: 12.5 }}>{chf(h.currentChf)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Live news -------------------------------------------------------------
function NewsCard({ alert }: { alert: Alert }) {
  return (
    <div className="card card-pad">
      <div className="between" style={{ marginBottom: 12 }}><span className="h2">Live coverage</span><span className="label">Event Registry</span></div>
      <div className="col" style={{ gap: 12 }}>
        {alert.news.slice(0, 4).map((n) => (
          <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="col" style={{ gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{n.title}</span>
            <span className="label" style={{ fontSize: 9.5 }}>{n.source}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ---- shared states ---------------------------------------------------------
function IntegrationNote({ msg, retry }: { msg: string; retry?: () => void }) {
  return (
    <div style={{ marginTop: 12, padding: 14, border: "1px dashed var(--hairline)", borderRadius: 2, background: "var(--paper-2)" }}>
      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <span className="dot warn" style={{ marginTop: 6 }} />
        <span className="small">{msg}</span>
      </div>
      {retry && <button className="btn ghost" style={{ marginTop: 10 }} onClick={retry}>Retry</button>}
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return <div className="shell" style={{ padding: 80 }}>
    <h2 className="h1">Could not load client</h2>
    <IntegrationNote msg={msg} />
  </div>;
}
