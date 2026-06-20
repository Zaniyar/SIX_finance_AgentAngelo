import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "../components/TopBar";
import TwinScene from "../three/TwinScene";
import { WebSpeechDriver, AudioFileDriver } from "../three/lipsync";
import { api, ClientSummary, ClientDetail } from "../api";

const TEST_AUDIO_URL = "/ElevenLabs_Text_to_Speech_audio.mp3";

interface Msg { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "I have something on your portfolio I'd like to discuss.",
  "How are you feeling about the markets right now?",
  "There's been some news affecting one of your holdings.",
];

export default function TwinChat() {
  const { id = "" } = useParams();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const driver = useRef(new WebSpeechDriver());
  const audioDriver = useRef(new AudioFileDriver());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.clients().then((cs) => setClient(cs.find((c) => c.id === id) || null)); }, [id]);
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
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
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
    <div className="col" style={{ height: "100vh", overflow: "hidden" }}>
      <TopBar crumb={<Link to={`/client/${id}`} style={{ color: "var(--ink)", fontWeight: 600 }}>{client?.name || id} · Digital twin</Link>} />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.4fr 1fr", minHeight: 0 }}>
        {/* --- 3D stage ------------------------------------------------- */}
        <div style={{ position: "relative", background: "radial-gradient(120% 90% at 50% 10%, #1b1f2a 0%, var(--void) 60%)" }}>
          <TwinScene
            driver={testPlaying ? audioDriver.current : driver.current}
            speaking={speaking || testPlaying}
            avatarUrl={client?.avatarUrl}
          />

          <div style={{ position: "absolute", top: 22, left: 24, color: "var(--void-ink)" }}>
            <div className="label" style={{ color: "var(--void-ink-2)" }}>Digital twin · rehearsal</div>
            <div className="h1" style={{ marginTop: 6 }}>{client?.displayName || id}</div>
          </div>

          <div style={{ position: "absolute", top: 24, right: 24 }}>
            <span className="chip" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--void-line)", color: "var(--void-ink)" }}>
              <span className={`dot ${speaking ? "ok" : busy ? "warn" : ""}`} /> {status}
            </span>
          </div>

          <button
            onClick={async () => {
              if (testPlaying) { audioDriver.current.stop(); setTestPlaying(false); return; }
              setTestPlaying(true);
              await audioDriver.current.playFile(TEST_AUDIO_URL);
              setTestPlaying(false);
            }}
            className="mono"
            style={{ position: "absolute", bottom: 18, left: 24, fontSize: 10, color: testPlaying ? "var(--grow)" : "var(--void-ink-2)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {testPlaying ? "◼ stop lipsync test" : "▶ test lipsync (ElevenLabs)"}
          </button>
          <div className="mono" style={{ position: "absolute", bottom: 18, right: 24, fontSize: 10, color: "var(--void-ink-2)" }}>drag to orbit</div>

          {/* DNA Bubbles */}
          <AnimatePresence>
            {detail?.dnaAvailable && <DnaBubbles detail={detail} />}
          </AnimatePresence>
        </div>

        {/* --- Chat ----------------------------------------------------- */}
        <div className="col" style={{ background: "var(--card)", minHeight: 0 }}>
          <div className="card-pad" style={{ background: "var(--paper)" }}>
            <span className="h3">Rehearse the conversation</span>
            <p className="small" style={{ marginTop: 4 }}>Practise with an LLM twin grounded in {client?.name || "the client"}'s DNA before the real meeting. Nothing here reaches the client.</p>
          </div>

          <div ref={scrollRef} className="col grow" style={{ overflowY: "auto", padding: 20, gap: 14 }}>
            {messages.length === 0 && (
              <div className="col" style={{ gap: 10 }}>
                <span className="label">Try opening with</span>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="card card-pad" onClick={() => send(s)}
                    style={{ textAlign: "left", fontSize: 13.5, cursor: "pointer", padding: 14 }}>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {busy && <Bubble m={{ role: "assistant", content: "…" }} />}
            {err && <div className="small" style={{ color: "var(--signal-ink)", padding: 12, border: "1px dashed var(--signal)", borderRadius: 2 }}>{err}</div>}
          </div>

          <form className="row" style={{ gap: 10, padding: 16, background: "var(--paper-2)" }}
            onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say something to the twin…"
              style={{ flex: 1, padding: "12px 14px", border: "1px solid var(--hairline)", borderRadius: 2, fontSize: 14, fontFamily: "var(--sans)" }} />
            <button className="btn" type="submit" disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── DNA Bubbles ──────────────────────────────────────────────────────────────

const BUBBLE_ICONS: Record<string, string> = {
  value: "◆",
  context: "●",
  preference: "▲",
  comms: "◎",
};

const TONE_LABELS: Record<string, string> = {
  "analytical": "Analytical",
  "values-led": "Values-Led",
  "relationship-led": "Relationship-Led",
};

function DnaBubbles({ detail }: { detail: ClientDetail }) {
  const { dna } = detail;
  const [hovered, setHovered] = useState<number | null>(null);

  // Build a flat list of the most relevant DNA pills
  const items = [
    // Tone / comms style — always first
    { icon: "◎", label: TONE_LABELS[dna.toneProfile] ?? dna.toneProfile, sub: dna.commsStyle, color: "#1f1bff", type: "comms" },
    // Top 2 values
    ...dna.values.slice(0, 2).map((v) => ({ icon: "◆", label: v.length > 38 ? v.slice(0, 36) + "…" : v, sub: "Core value", color: "#0e7c66", type: "value" })),
    // Top 2 context facts
    ...dna.context.slice(0, 2).map((c) => ({ icon: "●", label: c.length > 38 ? c.slice(0, 36) + "…" : c, sub: "Context", color: "#6b67ff", type: "context" })),
    // Top 1 preference
    ...dna.preferences.slice(0, 1).map((p) => ({ icon: "▲", label: p.length > 38 ? p.slice(0, 36) + "…" : p, sub: "Preference", color: "#d4860f", type: "preference" })),
  ];

  // Positions: orbit around the avatar (left side + right side + below)
  const positions = [
    { top: "12%", left: "4%"  },   // top-left
    { top: "32%", left: "2%"  },   // mid-left
    { top: "54%", left: "4%"  },   // lower-left
    { top: "12%", right: "4%" },   // top-right
    { top: "32%", right: "2%" },   // mid-right
    { top: "54%", right: "4%" },   // lower-right
  ];

  return (
    <>
      {items.slice(0, positions.length).map((item, i) => {
        const pos = positions[i];
        const isLeft = "left" in pos;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.7, x: isLeft ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.4, delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
            onHoverStart={() => setHovered(i)}
            onHoverEnd={() => setHovered(null)}
            style={{
              position: "absolute",
              ...pos,
              zIndex: 5,
              cursor: "default",
              maxWidth: hovered === i ? 220 : 44,
              transition: "max-width 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Connector line to avatar center */}
            <svg
              style={{ position: "absolute", top: "50%", [isLeft ? "right" : "left"]: "100%", transform: "translateY(-50%)", pointerEvents: "none", overflow: "visible" }}
              width="40" height="2"
            >
              <line x1="0" y1="1" x2="40" y2="1" stroke={item.color} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            </svg>

            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(11,12,15,0.82)",
                border: `1px solid ${item.color}55`,
                backdropFilter: "blur(12px)",
                padding: hovered === i ? "8px 12px" : "0",
                borderRadius: 99,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "padding 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              {/* Icon circle — always visible */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `${item.color}22`,
                border: `1px solid ${item.color}88`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: item.color, flexShrink: 0,
                fontWeight: 700,
              }}>
                {item.icon}
              </div>

              {/* Text — visible on hover */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: "hidden", paddingRight: 4 }}
                  >
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
      <div className="label" style={{ marginBottom: 4, textAlign: me ? "right" : "left" }}>{me ? "You · RM" : "Twin"}</div>
      <div style={{
        padding: "11px 14px", borderRadius: 3, fontSize: 14, lineHeight: 1.5,
        background: me ? "var(--ink)" : "var(--paper-2)", color: me ? "var(--paper)" : "var(--ink)",
      }}>{m.content}</div>
    </motion.div>
  );
}
