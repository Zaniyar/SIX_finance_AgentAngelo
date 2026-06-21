import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TwinScene, { xrStore } from "@/three/TwinScene";
import { WebSpeechDriver, AudioFileDriver } from "@/three/lipsync";
import { api, ClientSummary, ClientDetail } from "@/lib/api";

export const Route = createFileRoute("/twin/$id")({
  // WebGL / Three.js cannot run during SSR without losing the GPU context on hydrate.
  ssr: false,
  head: () => ({
    meta: [{ title: "Digital Twin · AgentAngelo" }],
  }),
  component: TwinChat,
});

const CLIENT_AVATAR_GLB: Record<string, string> = {
  schneider: "/avatars/twin.glb",
  huber: "/avatars/twin_male02.glb",
  raeber: "/avatars/twin_male03.glb",
  ammann: "/avatars/twin_female_casual.glb",
};

const TEST_AUDIO_URL = "/ElevenLabs_Text_to_Speech_audio.mp3";

interface Msg { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "I have something on your portfolio I'd like to discuss.",
  "How are you feeling about the markets right now?",
  "There's been some news affecting one of your holdings.",
];

const TONE_LABELS: Record<string, string> = {
  "analytical": "Analytical",
  "values-led": "Values-Led",
  "relationship-led": "Relationship-Led",
};

function TwinChat() {
  const { id } = Route.useParams();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [arSupported, setArSupported] = useState(false);
  const driver = useRef(new WebSpeechDriver());
  const audioDriver = useRef(new AudioFileDriver());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (navigator as any).xr?.isSessionSupported("immersive-ar")
        .then((s: boolean) => setArSupported(s))
        .catch(() => setArSupported(false));
    }
  }, []);

  useEffect(() => { api.clients().then((cs) => setClient(cs.find(c => c.id === id) ?? null)); }, [id]);
  useEffect(() => { api.client(id).then(setDetail).catch(() => {}); }, [id]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => () => { driver.current.stop(); audioDriver.current.stop(); }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setErr(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const { reply } = await api.twinChat(id, next);
      setMessages(m => [...m, { role: "assistant", content: reply }]);
      setBusy(false);
      setSpeaking(true);
      await driver.current.speak(reply);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    } finally {
      setSpeaking(false);
    }
  }

  const status = busy ? "Thinking…" : speaking ? "Speaking" : "Listening";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 48, borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--background, #fff)", flexShrink: 0, zIndex: 10 }}>
        <Link to="/map" style={{ fontSize: 12, color: "var(--muted-foreground, #666)", textDecoration: "none" }}>← Map</Link>
        <span style={{ color: "var(--border, #e5e7eb)" }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{client?.name ?? id} · Digital Twin</span>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.4fr 1fr", minHeight: 0 }}>
        {/* 3D stage */}
        <div style={{ position: "relative", background: "radial-gradient(120% 90% at 50% 10%, #1b1f2a 0%, #0b0c0f 60%)" }}>
          <TwinScene
            driver={testPlaying ? audioDriver.current : driver.current}
            speaking={speaking || testPlaying}
            avatarUrl={client?.avatarUrl ?? CLIENT_AVATAR_GLB[id]}
          />

          <div style={{ position: "absolute", top: 22, left: 24, color: "rgba(255,255,255,0.9)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Digital twin · rehearsal</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{client?.displayName ?? id}</div>
          </div>

          <div style={{ position: "absolute", top: 24, right: 24, display: "flex", gap: 8, alignItems: "center" }}>
            {arSupported && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                onClick={() => xrStore.enterAR()}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.45)", color: "#38bdf8", cursor: "pointer", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}
              >
                <span style={{ fontSize: 13 }}>◎</span> AR
              </motion.button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>
              <motion.div
                animate={{ opacity: speaking ? [1, 0.2, 1] : busy ? [1, 0.5, 1] : 1 }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: speaking ? "#22c55e" : busy ? "#f59e0b" : "rgba(255,255,255,0.3)" }}
              />
              {status}
            </div>
          </div>

          <button
            onClick={async () => {
              if (testPlaying) { audioDriver.current.stop(); setTestPlaying(false); return; }
              setTestPlaying(true);
              await audioDriver.current.playFile(TEST_AUDIO_URL);
              setTestPlaying(false);
            }}
            style={{ position: "absolute", bottom: 18, left: 24, fontSize: 10, color: testPlaying ? "#22c55e" : "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em" }}
          >
            {testPlaying ? "◼ stop lipsync test" : "▶ test lipsync (ElevenLabs)"}
          </button>
          <div style={{ position: "absolute", bottom: 18, right: 24, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>drag to orbit</div>

          <AnimatePresence>
            {detail?.dnaAvailable && <DnaBubbles detail={detail} />}
          </AnimatePresence>
        </div>

        {/* Chat panel */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--background, #fff)", minHeight: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--secondary, #f9fafb)" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Rehearse the conversation</div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground, #666)", marginTop: 4 }}>
              Practise with an LLM twin grounded in {client?.name ?? "the client"}'s DNA before the real meeting. Nothing here reaches the client.
            </p>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 11, color: "var(--muted-foreground, #666)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Try opening with</span>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{ textAlign: "left", fontSize: 13.5, cursor: "pointer", padding: 14, background: "var(--secondary, #f9fafb)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 4, fontFamily: "inherit" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {busy && <Bubble m={{ role: "assistant", content: "…" }} />}
            {err && <div style={{ fontSize: 12, color: "#dc2626", padding: 12, border: "1px dashed #dc2626", borderRadius: 4 }}>{err}</div>}
          </div>

          <form style={{ display: "flex", gap: 10, padding: 16, background: "var(--secondary, #f9fafb)", borderTop: "1px solid var(--border, #e5e7eb)" }}
            onSubmit={e => { e.preventDefault(); send(input); }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder="Say something to the twin…"
              style={{ flex: 1, padding: "12px 14px", border: "1px solid var(--border, #e5e7eb)", borderRadius: 4, fontSize: 14, fontFamily: "inherit", background: "var(--background, #fff)" }} />
            <button type="submit" disabled={busy || !input.trim()}
              style={{ padding: "12px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: busy || !input.trim() ? "not-allowed" : "pointer", opacity: busy || !input.trim() ? 0.5 : 1 }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── DNA Bubbles ───────────────────────────────────────────────────────────────

function DnaBubbles({ detail }: { detail: ClientDetail }) {
  const { dna } = detail;
  const [hovered, setHovered] = useState<number | null>(null);

  const items = [
    { icon: "◎", label: TONE_LABELS[dna.toneProfile] ?? dna.toneProfile, sub: dna.commsStyle, color: "#1f1bff" },
    ...dna.values.slice(0, 2).map(v => ({ icon: "◆", label: v.length > 38 ? v.slice(0, 36) + "…" : v, sub: "Core value", color: "#0e7c66" })),
    ...dna.context.slice(0, 2).map(c => ({ icon: "●", label: c.length > 38 ? c.slice(0, 36) + "…" : c, sub: "Context", color: "#6b67ff" })),
    ...dna.preferences.slice(0, 1).map(p => ({ icon: "▲", label: p.length > 38 ? p.slice(0, 36) + "…" : p, sub: "Preference", color: "#d4860f" })),
  ];

  const positions = [
    { top: "12%", left: "4%" },
    { top: "32%", left: "2%" },
    { top: "54%", left: "4%" },
    { top: "12%", right: "4%" },
    { top: "32%", right: "2%" },
    { top: "54%", right: "4%" },
  ];

  return (
    <>
      {items.slice(0, positions.length).map((item, i) => {
        const pos = positions[i];
        const isLeft = "left" in pos;
        return (
          <motion.div key={i}
            initial={{ opacity: 0, scale: 0.7, x: isLeft ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.4, delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
            onHoverStart={() => setHovered(i)}
            onHoverEnd={() => setHovered(null)}
            style={{ position: "absolute", ...pos, zIndex: 5, cursor: "default", maxWidth: hovered === i ? 220 : 44, transition: "max-width 0.3s cubic-bezier(0.16,1,0.3,1)" }}
          >
            <svg style={{ position: "absolute", top: "50%", [isLeft ? "right" : "left"]: "100%", transform: "translateY(-50%)", pointerEvents: "none", overflow: "visible" }} width="40" height="2">
              <line x1="0" y1="1" x2="40" y2="1" stroke={item.color} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            </svg>
            <motion.div whileHover={{ scale: 1.05 }} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(11,12,15,0.82)", border: `1px solid ${item.color}55`, backdropFilter: "blur(12px)", padding: hovered === i ? "8px 12px" : "0", borderRadius: 99, overflow: "hidden", whiteSpace: "nowrap", transition: "padding 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${item.color}22`, border: `1px solid ${item.color}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: item.color, flexShrink: 0, fontWeight: 700 }}>
                {item.icon}
              </div>
              <AnimatePresence>
                {hovered === i && (
                  <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden", paddingRight: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "white", lineHeight: 1.3 }}>{item.label}</div>
                    <div style={{ fontSize: 9, color: item.color, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>{item.sub}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        );
      })}
    </>
  );
}

function Bubble({ m }: { m: Msg }) {
  const me = m.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "85%" }}>
      <div style={{ fontSize: 10, color: "var(--muted-foreground, #999)", marginBottom: 4, textAlign: me ? "right" : "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {me ? "You · RM" : "Twin"}
      </div>
      <div style={{ padding: "11px 14px", borderRadius: 4, fontSize: 14, lineHeight: 1.5, background: me ? "#111" : "var(--secondary, #f3f4f6)", color: me ? "#fff" : "var(--foreground, #111)" }}>
        {m.content}
      </div>
    </motion.div>
  );
}
