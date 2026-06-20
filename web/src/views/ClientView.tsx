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
      style={{ borderTop: `3px solid ${col}` }}>
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
  return (
    <motion.div className="card card-pad" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <div className="between" style={{ marginBottom: 18 }}>
        <span className="h2">Proposed action</span>
        <span className="label">CIO-constrained</span>
      </div>

      <div className="row" style={{ alignItems: "stretch", gap: 14 }}>
        {s.fromHolding && <SwapSide tag="Reduce / exit" name={s.fromHolding.issuer}
          sub={`${s.fromHolding.industry} · drift ${s.fromHolding.driftPp > 0 ? "+" : ""}${s.fromHolding.driftPp}pp`}
          amount={`CHF ${chf(s.fromHolding.currentChf)}`} tone="bad" />}
        <div style={{ display: "grid", placeItems: "center", flex: "none", padding: "0 4px", fontSize: 22, color: "var(--ink-3)" }}>→</div>
        <SwapSide tag="Reinvest" name={s.toCandidate.issuer}
          sub={`${s.toCandidate.industry} · CIO ${s.toCandidate.rating}`}
          amount={s.toCandidate.livePrice ? `${s.toCandidate.livePrice.currency} ${s.toCandidate.livePrice.currentPrice} live` : `CHF ${chf(s.amountChf)}`}
          tone="ok" />
      </div>

      <p className="small" style={{ marginTop: 16 }}>{s.rationale}</p>

      <div style={{ marginTop: 18 }}>
        <span className="label">Why this is safe — audit trail</span>
        <div style={{ marginTop: 8 }}>
          {s.reasonChain.map((r, i) => <Check key={i} r={r} />)}
        </div>
      </div>
    </motion.div>
  );
}

function SwapSide({ tag, name, sub, amount, tone }: { tag: string; name: string; sub: string; amount: string; tone: "ok" | "bad" }) {
  return (
    <div className="grow" style={{ border: "1px solid var(--hairline)", borderRadius: 2, padding: 16 }}>
      <span className="label" style={{ color: tone === "bad" ? "var(--signal-ink)" : "var(--grow-ink)" }}>{tag}</span>
      <div className="h3" style={{ marginTop: 10, fontSize: 16 }}>{name}</div>
      <div className="small" style={{ marginTop: 4 }}>{sub}</div>
      <div className="mono" style={{ marginTop: 12, fontSize: 13, fontWeight: 600 }}>{amount}</div>
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
  return (
    <motion.div className="card card-pad" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <span className="h2">Client DNA</span>
        <span className="chip">{dna.toneProfile}</span>
      </div>
      <p className="body" style={{ fontSize: 14, marginBottom: 18 }}>{dna.summary}</p>
      <DnaList title="Values" items={dna.values} accent />
      <DnaList title="Preferences & aversions" items={dna.preferences} />
      <DnaList title="Context" items={dna.context} />
      {dna.commsStyle && <>
        <div className="label" style={{ marginTop: 16 }}>Comms style</div>
        <p className="small" style={{ marginTop: 6 }}>{dna.commsStyle}</p>
      </>}
    </motion.div>
  );
}

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
            <div key={h.isin} className="between" style={{ padding: "10px 0", borderTop: "1px solid var(--hairline-2)" }}>
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
          <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="col" style={{ gap: 3, borderTop: "1px solid var(--hairline-2)", paddingTop: 10 }}>
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
