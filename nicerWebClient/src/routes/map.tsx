import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Menu, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { api, ClientSummary, HighlightGroup } from "@/lib/api";
import { AngeloCallButton } from "@/components/AngeloCallButton";
import { clients as mockClients } from "@/lib/mock-data";
import schneiderAvatar from "@/assets/client-schneider.jpg";
import huberAvatar from "@/assets/client-huber.jpg";
import raeberAvatar from "@/assets/client-raeber.jpg";
import ammannAvatar from "@/assets/client-ammann.jpg";

// Maps backend client ID → local avatar image
const CLIENT_AVATARS: Record<string, string> = {
  schneider: schneiderAvatar,
  huber: huberAvatar,
  raeber: raeberAvatar,
  ammann: ammannAvatar,
};

// Maps backend client ID → nicerWebClient recommendation ID
const CLIENT_REC_ID: Record<string, string> = {
  schneider: "r-1",
  huber: "r-2",
  raeber: "r-3",
  ammann: "r-4",
};

// Coordinates for all 14 clients (backend IDs + mock client IDs)
// Slightly jittered where multiple clients share a city so markers don't overlap
const CLIENT_COORDS: Record<string, [number, number]> = {
  // Backend clients (4)
  schneider:    [6.1432,  46.2044],  // Genève area
  huber:        [8.5617,  47.3669],  // Zürich
  raeber:       [8.5217,  47.3869],  // Zürich (offset)
  ammann:       [9.3767,  47.4245],  // St. Gallen area
  // Mock clients (10)
  "c-schneider": [6.1432, 46.2044],  // same as backend schneider — won't both appear
  "c-blattmann": [8.5417,  47.3769], // Zürich
  "c-merian":    [7.5886,  47.5596], // Basel
  "c-rossi":     [8.9521,  46.0037], // Lugano
  "c-favre":     [6.1432,  46.2100], // Genève (offset)
  "c-stadler":   [7.4474,  46.9480], // Bern
  "c-bachmann":  [8.3093,  47.0502], // Luzern
  "c-petrov":    [8.5817,  47.3569], // Zürich (offset)
  "c-zumstein":  [9.3767,  47.4345], // St. Gallen (offset)
  "c-meyer":     [8.7236,  47.4990], // Winterthur
  "c-aldrin":    [8.5150,  47.1660], // Zug
  "c-huber":     [7.4474,  46.948],  // same as backend huber
  "c-raeber":    [8.5417,  47.3769], // same as backend raeber
  "c-ammann":    [9.3767,  47.4245], // same as backend ammann
};

// A unified map entry — either a real backend client or a mock-only one
interface MapClient {
  id: string;
  name: string;
  displayName: string;
  initials: string;
  mandate: string;
  city: string;
  direction: "conflict" | "opportunity" | "none";
  avatarUrl?: string;
  recId?: string;
  isReal: boolean;
  segment: string;
  // Card content — filled at build time so card never needs to re-fetch
  event: string;
  dnaHook: string;
}

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map · AgentAngelo" },
      { name: "description", content: "Client map view with live alerts and opportunities." },
    ],
  }),
  component: WorldMap,
});

// ── Design tokens ─────────────────────────────────────────────────────────────
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
};

const LIGHT_MAP_STYLE = {
  version: 8 as const,
  sources: {
    carto: {
      type: "raster" as const,
      tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
    },
  },
  layers: [{ id: "carto-layer", type: "raster" as const, source: "carto" }],
};

const CARD_W = 340;
const CARD_OFFSET_Y = 16;
const SIDEBAR_W = 380;

function initials(name: string) {
  return name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function WorldMap() {
  const [realClients, setRealClients] = useState<ClientSummary[]>([]);
  const [allClients, setAllClients] = useState<MapClient[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [markerPx, setMarkerPx] = useState<{ x: number; y: number } | null>(null);
  const nav = useNavigate();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const didFlyRef = useRef(false);

  const updateMarkerPx = (clientId: string | null) => {
    const map = mapRef.current;
    const container = mapEl.current;
    if (!map || !container || !clientId) { setMarkerPx(null); return; }
    const coords = CLIENT_COORDS[clientId];
    if (!coords) { setMarkerPx(null); return; }
    const pt = map.project(coords);
    const containerW = container.clientWidth;
    const BUBBLE_R = 20;
    const left = Math.max(8, Math.min(containerW - CARD_W - 8, pt.x - CARD_W / 2));
    const top = pt.y + BUBBLE_R + CARD_OFFSET_Y;
    setMarkerPx({ x: left, y: top });
  };

  useEffect(() => {
    api.clients().then((cs) => {
      setRealClients(cs);

      const realMap: MapClient[] = cs.map(c => ({
        id: c.id,
        name: c.name,
        displayName: c.displayName,
        initials: initials(c.name),
        mandate: c.mandate,
        city: c.location.city,
        direction: c.direction,
        avatarUrl: CLIENT_AVATARS[c.id],
        recId: CLIENT_REC_ID[c.id],
        isReal: true,
        segment: "UHNWI",
        event: c.event,
        dnaHook: c.dnaHook,
      }));

      const realBackendIds = new Set(cs.map(c => c.id));
      const mockOnly = mockClients.filter(
        (m) => !realBackendIds.has(m.id) && !realBackendIds.has(m.id.replace(/^c-/, "")),
      );
      const mockMap: MapClient[] = mockOnly.map(m => ({
        id: m.id,
        name: m.name,
        displayName: m.name.split(/[,&]/)[0].trim(),
        initials: initials(m.name),
        mandate: m.mandate,
        city: m.domicile.split(",")[0].trim(),
        direction: "none" as const,
        recId: undefined,
        isReal: false,
        segment: m.segment,
        event: m.strategy,
        dnaHook: m.dna.values.slice(0, 2).map(v => v.label).join(" · "),
      }));

      // Sort: conflicts first, then opportunities, then mock
      const merged = [
        ...realMap.filter(c => c.direction === "conflict"),
        ...realMap.filter(c => c.direction === "opportunity"),
        ...mockMap,
      ];
      setAllClients(merged);
      setActive(merged[0]?.id ?? null);
    }).catch(() => {
      const mockMap: MapClient[] = mockClients.map(m => ({
        id: m.id,
        name: m.name,
        displayName: m.name.split(/[,&]/)[0].trim(),
        initials: initials(m.name),
        mandate: m.mandate,
        city: m.domicile.split(",")[0].trim(),
        direction: "none" as const,
        isReal: false,
        segment: m.segment,
        event: m.strategy,
        dnaHook: m.dna.values.slice(0, 2).map(v => v.label).join(" · "),
      }));
      setAllClients(mockMap);
      setActive(mockMap[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: LIGHT_MAP_STYLE,
      center: [8.2, 46.9],
      zoom: 7.2,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !allClients.length) return;

    const addMarkers = () => {
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};

      allClients.forEach((c) => {
        const coords = CLIENT_COORDS[c.id];
        if (!coords) return;

        const accent = c.direction === "conflict" ? T.red : c.direction === "opportunity" ? T.green : "#888888";
        const hasPhoto = !!c.avatarUrl;

        const el = document.createElement("div");
        el.dataset.clientId = c.id;

        // IMPORTANT: MapLibre sets transform:translate(-50%,-50%) on the element we
        // hand to Marker(). We must NEVER touch `transform` on that element — it would
        // overwrite the translate and snap the bubble to (0,0).
        // Solution: outer `root` is a zero-size anchor that MapLibre owns (no transform
        // from us). Inside it, `inner` is where we do scale + border + pulse.
        const size = hasPhoto ? 40 : 34;

        const root = document.createElement("div");
        // Zero-footprint anchor — MapLibre translates this, we never touch it
        root.style.cssText = `position:relative;width:0;height:0;cursor:pointer;`;

        // Inner element centered on the anchor via negative margin
        el.style.cssText = `
          width:${size}px;height:${size}px;
          border-radius:50%;overflow:hidden;
          border:2px solid ${c.direction === "none" ? "#cccccc" : T.black};
          background:${hasPhoto ? T.black : "#f0f0f0"};
          display:flex;align-items:center;justify-content:center;
          position:absolute;
          top:${-size / 2}px;left:${-size / 2}px;
          transform-origin:center center;
          transition:transform 0.15s ${T.ease}, border-color 0.2s;
          ${c.direction !== "none" ? `animation:avatarPulse_${c.direction === "conflict" ? "red" : "green"} 2.6s ease-out infinite;` : ""}
        `;

        if (hasPhoto) {
          const img = document.createElement("img");
          img.src = c.avatarUrl!;
          img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;`;
          el.appendChild(img);
        } else {
          el.style.fontSize = "11px";
          el.style.fontWeight = "700";
          el.style.fontFamily = "'Helvetica Neue',sans-serif";
          el.style.color = "#555";
          el.style.letterSpacing = "-0.02em";
          el.textContent = c.initials;
        }

        // Name label — absolutely positioned above the circle, transforms with `el`
        const label = document.createElement("div");
        label.textContent = c.displayName;
        label.style.cssText = `
          position:absolute;
          bottom:${size / 2 + 8}px;
          left:50%;transform:translateX(-50%);
          background:${T.white};border:1px solid ${T.black};
          padding:2px 7px;white-space:nowrap;
          font-family:'Helvetica Neue',sans-serif;font-size:11px;font-weight:700;
          color:${T.black};letter-spacing:0.01em;pointer-events:none;
          opacity:0;transition:opacity 0.12s;
        `;

        root.appendChild(el);
        root.appendChild(label);

        const applyActive = (on: boolean) => {
          el.style.transform = on ? "scale(1.2)" : "scale(1)";
          el.style.borderColor = on ? accent : (c.direction === "none" ? "#cccccc" : T.black);
        };

        root.addEventListener("mouseenter", () => {
          applyActive(true);
          label.style.opacity = "1";
        });
        root.addEventListener("mouseleave", () => {
          // Keep active style if this is the selected marker
          if (active !== c.id) applyActive(false);
          label.style.opacity = "0";
        });
        root.addEventListener("click", () => { setActive(c.id); updateMarkerPx(c.id); });

        const marker = new maplibregl.Marker({ element: root, anchor: "center" })
          .setLngLat(coords).addTo(map);

        markersRef.current[c.id] = marker;
      });
    };

    const onReady = () => {
      addMarkers();
      requestAnimationFrame(() => updateMarkerPx(active));
    };

    if (map.loaded()) onReady();
    else map.on("load", onReady);
  }, [allClients]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const coords = CLIENT_COORDS[active];
    if (!coords) return;

    Object.entries(markersRef.current).forEach(([id, m]) => {
      const root = m.getElement();
      const circle = root.firstElementChild as HTMLElement | null;
      const isAct = id === active;
      const c = allClients.find(x => x.id === id);
      const accent = c?.direction === "conflict" ? T.red : c?.direction === "opportunity" ? T.green : "#888888";
      // Scale on the inner circle ONLY — never touch root.style.transform
      if (circle) {
        circle.style.transform = isAct ? "scale(1.2)" : "scale(1)";
        circle.style.borderColor = isAct ? accent : (c?.direction === "none" ? "#cccccc" : T.black);
      }
      root.style.zIndex = isAct ? "10" : "1";
    });

    const onMove = () => updateMarkerPx(active);
    map.on("move", onMove);
    requestAnimationFrame(() => updateMarkerPx(active));

    if (didFlyRef.current) {
      map.flyTo({ center: coords, zoom: 9, duration: 900, essential: true });
    } else {
      didFlyRef.current = true;
    }

    return () => { map.off("move", onMove); };
  }, [active, allClients]);

  const conflicts = allClients.filter(c => c.direction === "conflict").length;
  const opps = allClients.filter(c => c.direction === "opportunity").length;
  const activeClient = allClients.find(c => c.id === active);

  return (
    <AppShell fullBleed>
      <div
        className="relative flex h-full flex-col overflow-hidden"
        style={{ fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", background: T.white, color: T.black }}
      >
      {/* Main area — map full width, sidebar slides in from right */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "Client queue schließen" : "Client queue öffnen"}
          aria-expanded={sidebarOpen}
          className={cn(
            "absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition hover:bg-secondary",
            sidebarOpen && "border-foreground bg-foreground text-background",
          )}
        >
          {sidebarOpen ? <X size={16} strokeWidth={2.2} /> : <Menu size={16} strokeWidth={2.2} />}
        </button>

        <div style={{ position: "absolute", inset: 0 }}>
          <div ref={mapEl} style={{ width: "100%", height: "100%" }} />

          <AnimatePresence>
            {activeClient && markerPx && (
              <motion.div key={activeClient.id}
                initial={{ opacity: 0, scaleY: 0.6, scaleX: 0.92, y: -8 }}
                animate={{ opacity: 1, scaleY: 1, scaleX: 1, y: 0 }}
                exit={{ opacity: 0, scaleY: 0.5, scaleX: 0.92, y: -6 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute", top: markerPx.y, left: markerPx.x, width: CARD_W,
                  transformOrigin: "top center", background: T.white,
                  border: `1px solid ${T.black}`, zIndex: 10, pointerEvents: "auto",
                }}
              >
                <ClientMapCard
                  client={activeClient}
                  onOpen={activeClient.recId
                    ? () => nav({ to: "/recommendations/$id", params: { id: activeClient.recId! } })
                    : () => nav({ to: "/clients" })}
                  onTwin={activeClient.isReal
                    ? () => nav({ to: "/twin/$id", params: { id: activeClient.id } })
                    : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, color: T.grayLight, zIndex: 10 }}>© CartoDB</div>
        </div>

        <motion.aside
          initial={false}
          animate={{ x: sidebarOpen ? 0 : SIDEBAR_W + 1 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: SIDEBAR_W,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: T.white,
            borderLeft: `1px solid ${T.black}`,
            zIndex: 15,
            boxShadow: sidebarOpen ? "-10px 0 28px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <div style={{ display: "flex", borderBottom: `1px solid ${T.black}`, flexShrink: 0 }}>
            <KPICell value={conflicts} label="Action Required" accent={T.red} />
            <div style={{ width: 1, background: T.black }} />
            <KPICell value={opps} label="Opportunities" accent={T.green} />
            <div style={{ width: 1, background: T.black }} />
            <KPICell value={allClients.length} label="Total" />
          </div>

          <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${T.grayBorder}`, flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: T.grayLight }}>Priority Queue</span>
              <span style={{ fontSize: 10, color: T.grayLight }}>Ranked by impact</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, background: T.black }}>
              {allClients.map((c, i) => (
                <ClientRow key={c.id} client={c} rank={i + 1}
                  isActive={active === c.id}
                  onSelect={() => setActive(c.id)}
                  onOpen={c.recId
                    ? () => nav({ to: "/recommendations/$id", params: { id: c.recId! } })
                    : () => nav({ to: "/clients" })}
                />
              ))}
            </div>
          </div>

          <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.black}`, flexShrink: 0, display: "flex", gap: 20 }}>
            <IntegDot label="SIX MCP" ok />
            <IntegDot label="Phoeniqs" ok={false} />
            <IntegDot label="News" ok={false} />
          </div>
        </motion.aside>
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
        .maplibregl-popup { display: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f7f7f7; }
        ::-webkit-scrollbar-thumb { background: #111111; }
      `}</style>
      </div>
    </AppShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HighlightedText({ text, groups, baseColor }: { text: string; groups: HighlightGroup[]; baseColor: string }) {
  const allTerms = groups.flatMap(g => g.terms).sort((a, b) => b.length - a.length);
  if (!allTerms.length) return <span style={{ color: baseColor }}>{text}</span>;
  const escaped = allTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <span style={{ color: baseColor }}>
      {parts.map((part, i) => {
        const group = groups.find(g => g.terms.some(t => t.toLowerCase() === part.toLowerCase()));
        if (!group) return part;
        return <strong key={i} style={{ color: group.color, fontWeight: 700 }}>{part}</strong>;
      })}
    </span>
  );
}

function ClientMapCard({ client: c, onOpen, onTwin }: { client: MapClient; onOpen: () => void; onTwin?: () => void }) {
  const [whyNowOpen, setWhyNowOpen] = useState(false);
  const [whyClientOpen, setWhyClientOpen] = useState(false);
  const [highlights, setHighlights] = useState<HighlightGroup[]>([]);
  const accent = c.direction === "conflict" ? T.red : c.direction === "opportunity" ? T.green : T.grayLight;

  useEffect(() => {
    if (!c.isReal) return;
    api.highlights(c.id).then(({ groups }) => setHighlights(groups)).catch(() => {});
  }, [c.id, c.isReal]);

  return (
    <>
      <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: `7px solid ${T.black}` }} />
      <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: `6px solid ${T.white}` }} />

      <div style={{ padding: "10px 12px 9px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.grayBorder}` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, border: `1px solid ${T.black}`, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#555" }}>
            {c.avatarUrl
              ? <img src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : c.initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{c.displayName}</div>
            <div style={{ fontSize: 9.5, color: T.grayLight, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
              {c.segment} · {c.mandate} · {c.city}
            </div>
          </div>
        </div>
        {c.direction !== "none" && <DirectionTag direction={c.direction} />}
      </div>

      <div style={{ borderBottom: `1px solid ${T.grayBorder}` }}>
        <button onClick={() => setWhyNowOpen(o => !o)}
          style={{ width: "100%", padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: T.grayLight }}>Why now</span>
          <motion.span animate={{ rotate: whyNowOpen ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display: "block", fontSize: 10, color: T.grayLight, lineHeight: 1 }}>▾</motion.span>
        </button>
        <AnimatePresence initial={false}>
          {whyNowOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
              <div style={{ padding: "0 12px 9px", fontSize: 11.5, lineHeight: 1.55 }}>
                <HighlightedText text={c.event} groups={highlights} baseColor={T.gray} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ borderBottom: `1px solid ${T.grayBorder}` }}>
        <button onClick={() => setWhyClientOpen(o => !o)}
          style={{ width: "100%", padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: accent }}>Why this client</span>
          <motion.span animate={{ rotate: whyClientOpen ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display: "block", fontSize: 10, color: accent, lineHeight: 1 }}>▾</motion.span>
        </button>
        <AnimatePresence initial={false}>
          {whyClientOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
              <div style={{ padding: "0 12px 9px", fontSize: 11.5, lineHeight: 1.5 }}>
                <HighlightedText text={c.dnaHook} groups={highlights} baseColor={T.black} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "8px 10px" }}>
        <motion.button
          whileHover={{ backgroundColor: "#222" }} whileTap={{ scale: 0.96 }} onClick={onOpen}
          transition={{ duration: 0.12 }}
          style={{ flex: 1, padding: "7px 10px", background: T.black, color: T.white, border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          {c.direction === "conflict" ? <>⚠ Alert</> : c.direction === "opportunity" ? <>★ Opp</> : <>→ View</>}
        </motion.button>
        {onTwin && (
          <motion.button
            whileHover={{ backgroundColor: T.muted }} whileTap={{ scale: 0.96 }} onClick={onTwin}
            transition={{ duration: 0.12 }}
            style={{ width: 34, height: 34, flexShrink: 0, background: T.white, color: T.black, border: `1px solid ${T.black}`, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
            title="Open digital twin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </motion.button>
        )}
      </div>

      {c.isReal && c.direction !== "none" && (
        <div style={{ padding: "0 10px 10px" }}>
          <AngeloCallButton
            clientId={c.id}
            clientName={c.displayName}
            className="w-full"
          />
        </div>
      )}
    </>
  );
}

function ClientRow({ client: c, rank, isActive, onSelect, onOpen }: {
  client: MapClient; rank: number; isActive: boolean; onSelect: () => void; onOpen: () => void;
}) {
  const accent = c.direction === "conflict" ? T.red : c.direction === "opportunity" ? T.green : T.grayLight;
  return (
    <motion.div layout onClick={onSelect} whileHover={{ backgroundColor: T.muted } as any}
      style={{ background: isActive ? T.muted : T.white, cursor: "pointer", transition: "background 0.15s" }}
    >
      <div style={{ padding: "11px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: T.grayLight, fontFamily: "monospace", flexShrink: 0, width: 14, textAlign: "right" }}>{rank}</span>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, border: `1.5px solid ${isActive ? accent : c.direction === "none" ? "#ddd" : T.black}`, borderRadius: "50%", overflow: "hidden", transition: "border-color 0.2s", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#666" }}>
                {c.avatarUrl
                  ? <img src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : c.initials}
              </div>
              {c.direction !== "none" && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 7, height: 7, background: accent, borderRadius: "50%", border: `1px solid ${T.white}` }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.displayName}</div>
              <div style={{ fontSize: 9, color: T.grayLight, letterSpacing: "0.05em", marginTop: 1 }}>{c.segment} · {c.city}</div>
            </div>
          </div>
          {c.direction !== "none"
            ? <DirectionTag direction={c.direction} small />
            : <span style={{ fontSize: 8, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>Monitor</span>}
        </div>

        <AnimatePresence>
          {isActive && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.grayBorder}` }}>
                <div style={{ fontSize: 11, color: T.gray, lineHeight: 1.5, marginBottom: 10 }}>{c.mandate}</div>
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{ width: "100%", padding: "8px 0", background: T.black, color: T.white, border: "none", cursor: "pointer", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "inherit" }}
                >
                  {c.direction === "conflict" ? "Review Alert →" : c.direction === "opportunity" ? "See Opportunity →" : "View Client →"}
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: small ? "3px 8px" : "5px 10px", border: `1px solid ${conflict ? T.red : T.green}`, color: conflict ? T.red : T.green, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
      <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ width: 4, height: 4, background: conflict ? T.red : T.green }} />
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
function IntegDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ width: 5, height: 5, background: ok ? T.green : T.grayBorder }} />
      <span style={{ fontSize: 9, color: T.grayLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}
