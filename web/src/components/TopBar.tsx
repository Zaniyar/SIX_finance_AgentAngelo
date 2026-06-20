import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, IntegrationProbe } from "../api";

export default function TopBar({ crumb, dark }: { crumb?: React.ReactNode; dark?: boolean }) {
  const bg = dark ? "rgba(11,12,15,0.95)" : "var(--paper)";
  const border = dark ? "rgba(255,255,255,0.07)" : "var(--hairline)";
  const textColor = dark ? "white" : "var(--ink)";
  const subColor = dark ? "rgba(255,255,255,0.4)" : "var(--ink-3)";
  return (
    <header style={{ borderBottom: `1px solid ${border}`, background: bg, position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(12px)" }}>
      <div className="shell between" style={{ height: 52 }}>
        <div className="row" style={{ alignItems: "center", gap: 18 }}>
          <Link to="/" className="row" style={{ alignItems: "center", gap: 11 }}>
            <Mark dark={dark} />
            <div className="col" style={{ gap: 1 }}>
              <span style={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: 15, color: textColor }}>Agent&nbsp;Angelo</span>
              <span className="label" style={{ fontSize: 9.5, color: subColor }}>Relationship Intelligence</span>
            </div>
          </Link>
          {crumb && <div className="row" style={{ alignItems: "center", gap: 12, color: subColor }}>
            <span style={{ color: border }}>/</span>{crumb}
          </div>}
        </div>
        <Integrations dark={dark} />
      </div>
    </header>
  );
}

function Mark({ dark }: { dark?: boolean }) {
  return (
    <div style={{ width: 28, height: 28, background: dark ? "rgba(255,255,255,0.1)" : "var(--ink)", borderRadius: 3, display: "grid", placeItems: "center" }}>
      <div style={{ width: 11, height: 11, border: `2.5px solid ${dark ? "white" : "var(--paper)"}`, borderRadius: "100px 100px 100px 2px", transform: "rotate(45deg)" }} />
    </div>
  );
}

function Integrations({ dark }: { dark?: boolean }) {
  const [probes, setProbes] = useState<IntegrationProbe[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { api.integrations().then((d) => setProbes(d.probes)).catch(() => setProbes([])); }, []);

  const status = (p: IntegrationProbe) => (p.ok ? "ok" : p.configured ? "bad" : "warn");
  const allOk = probes && probes.every((p) => p.ok);

  return (
    <div style={{ position: "relative" }}>
      <button className="chip" onClick={() => setOpen((o) => !o)} style={{ background: dark ? "rgba(255,255,255,0.08)" : "var(--card)", color: dark ? "white" : "inherit", borderColor: dark ? "rgba(255,255,255,0.15)" : undefined, cursor: "pointer" }}>
        <span className={`dot ${allOk ? "ok" : "warn"}`} />
        Integrations
      </button>
      {open && probes && (
        <div className="card card-pad" style={{ position: "absolute", right: 0, top: 38, width: 320, boxShadow: "0 18px 50px rgba(0,0,0,0.13)", zIndex: 40 }}>
          <div className="label" style={{ marginBottom: 12 }}>Live data sources</div>
          {probes.map((p) => (
            <div key={p.name} className="between" style={{ padding: "9px 0" }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                <span className="small" style={{ fontSize: 11 }}>{p.ok ? `${p.durationMs}ms` : p.configured ? p.error?.slice(0, 40) : "key not set"}</span>
              </div>
              <span className={`dot ${status(p)}`} />
            </div>
          ))}
          <div className="small" style={{ marginTop: 12, fontSize: 11 }}>
            Add keys to <span className="mono">SIX-Noumena-NTT-Data/demo/.env</span> to go fully live.
          </div>
        </div>
      )}
    </div>
  );
}
