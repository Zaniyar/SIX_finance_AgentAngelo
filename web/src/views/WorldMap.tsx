import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { api, ClientSummary } from "../api";

// ── Design tokens (BikeTausch style) ─────────────────────────────────────────
const T = {
  black: "#111111",
  white: "#ffffff",
  muted: "#f7f7f7",
  gray: "#666666",
  grayLight: "#999999",
  grayBorder: "#eeeeee",
  red: "#d4180f",
  green: "#1a6b4a",
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

const CLIENT_COORDS: Record<string, [number, number]> = {
  schneider: [6.1432, 46.2044],
  huber:     [7.4474, 46.948],
  raeber:    [8.5417, 47.3769],
  ammann:    [9.3767, 47.4245],
};

const LIGHT_MAP_STYLE = {
  version: 8 as const,
  sources: {
    "carto": {
      type: "raster" as const,
      tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
    },
  },
  layers: [{ id: "carto-layer", type: "raster" as const, source: "carto" }],
};

export default function Dashboard() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const nav = useNavigate();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const didFlyRef = useRef(false);

  useEffect(() => {
    api.clients().then((cs) => {
      const sorted = [...cs].sort((a, b) =>
        a.direction === b.direction ? 0 : a.direction === "conflict" ? -1 : 1
      );
      setClients(sorted);
      setActive(sorted[0]?.id ?? null);
    }).catch(() => setClients([]));
  }, []);

  // Init map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: LIGHT_MAP_STYLE,
      center: [7.6, 46.75],
      zoom: 6.9,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Add markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !clients.length) return;

    const addMarkers = () => {
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};

      clients.forEach((c) => {
        const coords = CLIENT_COORDS[c.id];
        if (!coords) return;
        const conflict = c.direction === "conflict";
        const accent = conflict ? T.red : T.green;

        // Single element: avatar IS the marker, pulse via box-shadow animation
        // No wrapper with absolute children → fixes drift on zoom
        const el = document.createElement("div");
        el.dataset.clientId = c.id;
        el.style.cssText = `
          width:40px;height:40px;
          border-radius:50%;
          overflow:hidden;
          border:2px solid ${T.black};
          cursor:pointer;
          animation:avatarPulse_${conflict ? "red" : "green"} 2.6s ease-out infinite;
          transition:border-color 0.2s;
        `;
        const img = document.createElement("img");
        img.src = `/profiles/${c.id}.png`;
        img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;transition:transform 0.2s ${T.ease};`;
        el.appendChild(img);

        el.addEventListener("mouseenter", () => {
          img.style.transform = "scale(1.15)";
          el.style.borderColor = accent;
        });
        el.addEventListener("mouseleave", () => {
          img.style.transform = "scale(1)";
          el.style.borderColor = T.black;
        });
        el.addEventListener("click", () => setActive(c.id));

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(coords).addTo(map);

        // Name label as separate popup-style tooltip (Maplibre handles positioning)
        new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, -28],
          className: "marker-label-popup",
        })
          .setLngLat(coords)
          .setHTML(`<span>${c.name}</span>`)
          .addTo(map);

        markersRef.current[c.id] = marker;
      });
    };

    if (map.loaded()) addMarkers();
    else map.on("load", addMarkers);
  }, [clients]);

  // Active marker + fly
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const coords = CLIENT_COORDS[active];
    if (!coords) return;

    Object.entries(markersRef.current).forEach(([id, m]) => {
      const el = m.getElement();
      const isAct = id === active;
      const c = clients.find(x => x.id === id);
      const accent = c?.direction === "conflict" ? T.red : T.green;
      el.style.borderColor = isAct ? accent : T.black;
      el.style.zIndex = isAct ? "10" : "1";
      const innerImg = el.querySelector("img") as HTMLElement;
      if (innerImg) innerImg.style.transform = isAct ? "scale(1.12)" : "scale(1)";
    });

    if (didFlyRef.current) {
      map.flyTo({ center: coords, zoom: 8.5, duration: 1200, essential: true });
    } else {
      didFlyRef.current = true;
    }
  }, [active, clients]);

  const conflicts = clients.filter(c => c.direction === "conflict").length;
  const opps = clients.filter(c => c.direction === "opportunity").length;
  const activeClient = clients.find(c => c.id === active);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", background: T.white, color: T.black }}>

      {/* ── Topbar (BikeTausch nav style) ───────────────────────────────── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 52, borderBottom: `1px solid ${T.black}`, flexShrink: 0, background: T.white, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>
            Agent<span style={{ fontWeight: 300 }}>Angelo</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {["Dashboard", "Clients", "Portfolios", "Alerts"].map((item, i) => (
              <span key={item} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 ? T.black : T.grayLight, cursor: "pointer" }}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <LiveBadge />
          <IntegBtn />
        </div>
      </header>

      {/* ── Ticker (BikeTausch ticker style) ────────────────────────────── */}
      <div style={{ overflow: "hidden", borderBottom: `1px solid ${T.black}`, flexShrink: 0, background: T.black }}>
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", whiteSpace: "nowrap" }}
        >
          {[...Array(2)].map((_, rep) => (
            <div key={rep} style={{ display: "flex" }}>
              {[
                { label: "Action Required", val: String(conflicts) },
                { label: "Opportunities", val: String(opps) },
                { label: "Clients Monitored", val: String(clients.length) },
                { label: "SIX MCP", val: "LIVE" },
                { label: "Mandate Types", val: "Defensive · Balanced · Growth" },
                { label: "Audit Trail", val: "Deterministic · No Hallucinations" },
              ].map(({ label, val }) => (
                <span key={label} style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", padding: "9px 40px", color: "#888", flexShrink: 0 }}>
                  {label} · <span style={{ color: "white" }}>{val}</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Main bento grid ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1px 380px", minHeight: 0 }}>

        {/* MAP */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div ref={mapEl} style={{ width: "100%", height: "100%" }} />

          {/* Active client card — BikeTausch sharp card style */}
          <AnimatePresence>
            {activeClient && (
              <motion.div key={activeClient.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute", bottom: 24, left: 24, width: 340,
                  background: T.white,
                  border: `1px solid ${T.black}`,
                  zIndex: 10,
                }}
              >
                {/* Card header */}
                <div style={{ padding: "16px 18px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${T.grayBorder}` }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, border: `1px solid ${T.black}`, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                      <img src={`/profiles/${activeClient.id}.png`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{activeClient.displayName}</div>
                      <div style={{ fontSize: 10, color: T.grayLight, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>
                        {activeClient.mandate} · {activeClient.location.city}
                      </div>
                    </div>
                  </div>
                  <DirectionTag direction={activeClient.direction} />
                </div>

                {/* Why now */}
                <div style={{ padding: "12px 18px 16px" }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: T.grayLight, marginBottom: 6 }}>Why now</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: T.gray }}>{activeClient.event}</div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => nav(`/client/${activeClient.id}`)}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      style={{
                        flex: 1, padding: "10px 0",
                        background: T.black, color: T.white,
                        border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                        fontFamily: "inherit",
                      }}
                    >
                      {activeClient.direction === "conflict" ? "Review Alert →" : "See Opportunity →"}
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => nav(`/client/${activeClient.id}/twin`)}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      style={{
                        padding: "10px 16px",
                        background: T.white, color: T.black,
                        border: `1px solid ${T.black}`, cursor: "pointer",
                        fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                        fontFamily: "inherit",
                      }}
                    >
                      ◢ Twin
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map attribution */}
          <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, color: T.grayLight, zIndex: 10 }}>© CartoDB</div>
        </div>

        {/* Vertical divider */}
        <div style={{ background: T.black }} />

        {/* ── RIGHT PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: T.white }}>

          {/* KPI row */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.black}`, flexShrink: 0 }}>
            <KPICell value={conflicts} label="Action Required" accent={T.red} />
            <div style={{ width: 1, background: T.black }} />
            <KPICell value={opps} label="Opportunities" accent={T.green} />
            <div style={{ width: 1, background: T.black }} />
            <KPICell value={clients.length} label="Total" />
          </div>

          {/* Queue header */}
          <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${T.grayBorder}`, flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: T.grayLight }}>Priority Queue</span>
              <span style={{ fontSize: 10, color: T.grayLight }}>Ranked by impact</span>
            </div>
          </div>

          {/* Client cards */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Bento: gap:1px, bg:black = black lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, background: T.black }}>
              {clients.map((c, i) => (
                <ClientRow key={c.id} client={c} rank={i + 1}
                  isActive={active === c.id}
                  onSelect={() => setActive(c.id)}
                  onOpen={() => nav(`/client/${c.id}`)}
                />
              ))}
            </div>
          </div>

          {/* Footer status */}
          <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.black}`, flexShrink: 0, display: "flex", gap: 20 }}>
            <IntegDot label="SIX MCP" ok />
            <IntegDot label="Phoeniqs" ok={false} />
            <IntegDot label="News" ok={false} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes avatarPulse_red {
          0%   { box-shadow: 0 0 0 0px rgba(212,24,15,0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(212,24,15,0); }
          100% { box-shadow: 0 0 0 12px rgba(212,24,15,0); }
        }
        @keyframes avatarPulse_green {
          0%   { box-shadow: 0 0 0 0px rgba(26,107,74,0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(26,107,74,0); }
          100% { box-shadow: 0 0 0 12px rgba(26,107,74,0); }
        }
        .maplibregl-canvas-container { cursor: grab; }
        .maplibregl-canvas-container:active { cursor: grabbing; }
        .maplibregl-marker { outline: none !important; }
        .maplibregl-popup { pointer-events: none; }
        .marker-label-popup .maplibregl-popup-content {
          background: ${T.white};
          border: 1px solid ${T.black};
          padding: 3px 8px;
          font-family: 'Helvetica Neue', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: ${T.black};
          letter-spacing: 0.02em;
          box-shadow: none;
        }
        .marker-label-popup .maplibregl-popup-tip { display: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.muted}; }
        ::-webkit-scrollbar-thumb { background: ${T.black}; }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ClientRow({ client: c, rank, isActive, onSelect, onOpen }: {
  client: ClientSummary; rank: number; isActive: boolean;
  onSelect: () => void; onOpen: () => void;
}) {
  const conflict = c.direction === "conflict";
  const accent = conflict ? T.red : T.green;

  return (
    <motion.div
      layout
      onClick={onSelect}
      whileHover={{ backgroundColor: T.muted } as any}
      style={{
        background: isActive ? T.muted : T.white,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <div style={{ padding: "13px 18px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: T.grayLight, fontFamily: "monospace", flexShrink: 0, width: 12 }}>{rank}</span>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, border: `1px solid ${isActive ? accent : T.black}`, borderRadius: "50%", overflow: "hidden", transition: "border-color 0.2s" }}>
                <img src={`/profiles/${c.id}.png`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, background: accent }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div style={{ fontSize: 9.5, color: T.grayLight, letterSpacing: "0.06em", marginTop: 1 }}>
                {c.mandate} · {c.location.city}
              </div>
            </div>
          </div>
          <DirectionTag direction={c.direction} small />
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.grayBorder}` }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: T.grayLight, marginBottom: 5 }}>Why now</div>
                <div style={{ fontSize: 12, color: T.gray, lineHeight: 1.55, marginBottom: 12 }}>{c.event}</div>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{
                    width: "100%", padding: "9px 0",
                    background: T.black, color: T.white,
                    border: "none", cursor: "pointer",
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "inherit",
                  }}
                >
                  {conflict ? "Review Alert →" : "See Opportunity →"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DirectionTag({ direction, small }: { direction: string; small?: boolean }) {
  const conflict = direction === "conflict";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: small ? "3px 8px" : "5px 10px",
      border: `1px solid ${conflict ? T.red : T.green}`,
      color: conflict ? T.red : T.green,
      fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
      flexShrink: 0,
    }}>
      <motion.div
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ width: 4, height: 4, background: conflict ? T.red : T.green }}
      />
      {conflict ? "Action" : "Opp."}
    </div>
  );
}

function KPICell({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div style={{ flex: 1, padding: "12px 16px" }}>
      <motion.div key={value} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1, color: accent ?? T.black }}>
        {value}
      </motion.div>
      <div style={{ fontSize: 9, color: T.grayLight, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function LiveBadge() {
  const [time, setTime] = useState(new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })), 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ width: 6, height: 6, background: T.green }} />
      <span style={{ fontSize: 10, color: T.grayLight, letterSpacing: "0.1em", fontFamily: "monospace" }}>{time} · LIVE</span>
    </div>
  );
}

function IntegBtn() {
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
      style={{
        padding: "8px 16px", background: T.black, color: T.white,
        border: "none", cursor: "pointer",
        fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
        fontFamily: "inherit",
      }}
    >
      Integrations
    </motion.button>
  );
}

function IntegDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ width: 5, height: 5, background: ok ? T.green : T.grayBorder }} />
      <span style={{ fontSize: 9, color: T.grayLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}
