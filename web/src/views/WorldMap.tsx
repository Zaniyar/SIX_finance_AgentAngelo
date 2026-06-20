import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TopBar from "../components/TopBar";
import { api, ClientSummary } from "../api";

// Switzerland bounding box for projecting client coordinates into the map.
const BOX = { latN: 47.9, latS: 45.7, lngW: 5.8, lngE: 10.6 };

export default function WorldMap() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => { api.clients().then(setClients).catch(() => setClients([])); }, []);

  const W = 920, H = 520, pad = 70;
  const project = (lat: number, lng: number) => ({
    x: pad + ((lng - BOX.lngW) / (BOX.lngE - BOX.lngW)) * (W - 2 * pad),
    y: pad + ((BOX.latN - lat) / (BOX.latN - BOX.latS)) * (H - 2 * pad),
  });
  const hub = { x: W / 2, y: H / 2 };

  const conflicts = clients.filter((c) => c.direction === "conflict").length;

  return (
    <div className="col" style={{ minHeight: "100%" }}>
      <TopBar />
      <div className="shell" style={{ paddingTop: 48, paddingBottom: 64 }}>
        {/* --- Editorial hero --------------------------------------------- */}
        <div className="between" style={{ alignItems: "flex-end", marginBottom: 28 }}>
          <div style={{ maxWidth: 720 }}>
            <div className="label" style={{ marginBottom: 16 }}>SwissHacks 2026 · Private Wealth Advisory</div>
            <motion.h1 className="display" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              Every client,<br />read in full.
            </motion.h1>
            <p className="body" style={{ marginTop: 18, maxWidth: 540, fontSize: 16 }}>
              Agent Angelo turns three years of CRM notes, portfolios and live markets into personalised,
              explainable proposals — within mandate, with the relationship manager always in the loop.
            </p>
          </div>
          <div className="col" style={{ gap: 14, textAlign: "right" }}>
            <Stat n={String(clients.length)} l="Clients" />
            <Stat n={String(conflicts)} l="Open conflicts" tone="bad" />
          </div>
        </div>

        {/* --- Command map ----------------------------------------------- */}
        <div className="card" style={{ position: "relative", overflow: "hidden", background: "var(--void)" }}>
          <div className="label" style={{ position: "absolute", top: 18, left: 22, color: "var(--void-ink-2)", zIndex: 2 }}>
            Client Network — Switzerland
          </div>
          <div className="mono" style={{ position: "absolute", top: 18, right: 22, color: "var(--void-ink-2)", fontSize: 11, zIndex: 2 }}>
            46.80°N / 8.22°E · LIVE
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
            <Graticule W={W} H={H} pad={pad} />
            {/* connections hub -> clients */}
            {clients.map((c) => {
              const p = project(c.location.lat, c.location.lng);
              return <motion.line key={`l-${c.id}`} x1={hub.x} y1={hub.y} x2={p.x} y2={p.y}
                stroke="var(--void-line)" strokeWidth={1}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.2 }} />;
            })}
            {/* central desk hub */}
            <circle cx={hub.x} cy={hub.y} r={5} fill="var(--void-ink)" />
            <circle cx={hub.x} cy={hub.y} r={13} fill="none" stroke="var(--void-line)" />
            <text x={hub.x} y={hub.y + 30} textAnchor="middle" fill="var(--void-ink-2)" fontSize={10} fontFamily="var(--mono)" letterSpacing="2">RM DESK</text>

            {/* client nodes */}
            {clients.map((c, i) => {
              const p = project(c.location.lat, c.location.lng);
              const col = c.direction === "conflict" ? "var(--signal)" : "var(--grow)";
              const active = hover === c.id;
              return (
                <g key={c.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)}
                  onClick={() => nav(`/client/${c.id}`)}>
                  <motion.circle fill={col} initial={{ r: 22, opacity: 0.18 }}
                    animate={{ r: [22, 30, 22], opacity: [0.18, 0.05, 0.18] }}
                    transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4 }} />
                  <circle r={active ? 9 : 6} fill={col} stroke="var(--void)" strokeWidth={2} />
                  <text x={0} y={-18} textAnchor="middle" fill="var(--void-ink)" fontSize={13} fontWeight={700}>{c.name}</text>
                  <text x={0} y={26} textAnchor="middle" fill="var(--void-ink-2)" fontSize={10} fontFamily="var(--mono)">{c.location.city.toUpperCase()}</text>
                </g>
              );
            })}
          </svg>

          {/* hover detail */}
          {hover && (() => {
            const c = clients.find((x) => x.id === hover)!;
            return (
              <motion.div className="card-pad" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ position: "absolute", left: 22, bottom: 18, width: 360, background: "var(--void-2)", border: "1px solid var(--void-line)", borderRadius: 2, color: "var(--void-ink)" }}>
                <div className="between"><span className="h3">{c.displayName}</span>
                  <span className="chip" style={{ borderColor: c.direction === "conflict" ? "var(--signal)" : "var(--grow)", color: c.direction === "conflict" ? "var(--signal)" : "var(--grow)" }}>{c.direction}</span></div>
                <div className="mono" style={{ fontSize: 11, color: "var(--void-ink-2)", margin: "6px 0 10px" }}>{c.mandate.toUpperCase()} MANDATE</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--void-ink-2)" }}>{c.event}</div>
              </motion.div>
            );
          })()}
        </div>

        {/* --- Client roster --------------------------------------------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 16 }}>
          {clients.map((c, i) => (
            <motion.div key={c.id} className="card card-pad" onClick={() => nav(`/client/${c.id}`)}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              whileHover={{ y: -3 }} style={{ cursor: "pointer" }}>
              <div className="between">
                <span className="label">{c.mandate}</span>
                <span className={`dot ${c.direction === "conflict" ? "bad" : "ok"}`} />
              </div>
              <div className="h2" style={{ marginTop: 14 }}>{c.name}</div>
              <div className="small" style={{ marginTop: 6, minHeight: 40 }}>{c.tagline}</div>
              <div className="label" style={{ marginTop: 14, color: c.direction === "conflict" ? "var(--signal-ink)" : "var(--grow-ink)" }}>
                {c.direction === "conflict" ? "● Action needed" : "● Opportunity"}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, tone }: { n: string; l: string; tone?: "bad" }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <span className="mono" style={{ fontSize: 34, fontWeight: 700, color: tone === "bad" ? "var(--signal-ink)" : "var(--ink)" }}>{n}</span>
      <span className="label">{l}</span>
    </div>
  );
}

function Graticule({ W, H, pad }: { W: number; H: number; pad: number }) {
  const cols = 9, rows = 5;
  const lines = [];
  for (let i = 0; i <= cols; i++) {
    const x = pad + (i / cols) * (W - 2 * pad);
    lines.push(<line key={`v${i}`} x1={x} y1={pad} x2={x} y2={H - pad} stroke="var(--void-line)" strokeWidth={0.5} opacity={0.5} />);
  }
  for (let j = 0; j <= rows; j++) {
    const y = pad + (j / rows) * (H - 2 * pad);
    lines.push(<line key={`h${j}`} x1={pad} y1={y} x2={W - pad} y2={y} stroke="var(--void-line)" strokeWidth={0.5} opacity={0.5} />);
  }
  return <g>{lines}</g>;
}
