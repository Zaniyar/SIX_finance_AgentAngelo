import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, IntegrationProbe } from "../api";

export default function TopBar({ crumb }: { crumb?: React.ReactNode }) {
  return (
    <header style={{ borderBottom: "1px solid var(--hairline)", background: "var(--paper)", position: "sticky", top: 0, zIndex: 20 }}>
      <div className="shell between" style={{ height: 64 }}>
        <div className="row" style={{ alignItems: "center", gap: 18 }}>
          <Link to="/" className="row" style={{ alignItems: "center", gap: 11 }}>
            <Mark />
            <div className="col" style={{ gap: 1 }}>
              <span style={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: 15 }}>Agent&nbsp;Angelo</span>
              <span className="label" style={{ fontSize: 9.5 }}>Relationship Intelligence</span>
            </div>
          </Link>
          {crumb && <div className="row" style={{ alignItems: "center", gap: 12, color: "var(--ink-3)" }}>
            <span style={{ color: "var(--hairline)" }}>/</span>{crumb}
          </div>}
        </div>
        <Integrations />
      </div>
    </header>
  );
}

function Mark() {
  return (
    <div style={{ width: 30, height: 30, background: "var(--ink)", borderRadius: 3, display: "grid", placeItems: "center" }}>
      <div style={{ width: 12, height: 12, border: "2.5px solid var(--paper)", borderRadius: "100px 100px 100px 2px", transform: "rotate(45deg)" }} />
    </div>
  );
}

function Integrations() {
  const [probes, setProbes] = useState<IntegrationProbe[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { api.integrations().then((d) => setProbes(d.probes)).catch(() => setProbes([])); }, []);

  const status = (p: IntegrationProbe) => (p.ok ? "ok" : p.configured ? "bad" : "warn");
  const allOk = probes && probes.every((p) => p.ok);

  return (
    <div style={{ position: "relative" }}>
      <button className="chip" onClick={() => setOpen((o) => !o)} style={{ background: "var(--card)", cursor: "pointer" }}>
        <span className={`dot ${allOk ? "ok" : "warn"}`} />
        Integrations
      </button>
      {open && probes && (
        <div className="card card-pad" style={{ position: "absolute", right: 0, top: 38, width: 320, boxShadow: "0 18px 50px rgba(0,0,0,0.13)", zIndex: 40 }}>
          <div className="label" style={{ marginBottom: 12 }}>Live data sources</div>
          {probes.map((p) => (
            <div key={p.name} className="between" style={{ padding: "9px 0", borderTop: "1px solid var(--hairline-2)" }}>
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
