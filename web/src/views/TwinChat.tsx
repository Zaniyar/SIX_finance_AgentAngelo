import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import TopBar from "../components/TopBar";
import TwinScene from "../three/TwinScene";
import { WebSpeechDriver, AudioFileDriver } from "../three/lipsync";
import { api, ClientSummary } from "../api";

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
          <TwinScene driver={testPlaying ? audioDriver.current : driver.current} speaking={speaking || testPlaying} avatarUrl={client?.avatarUrl} />

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
        </div>

        {/* --- Chat ----------------------------------------------------- */}
        <div className="col" style={{ borderLeft: "1px solid var(--hairline)", background: "var(--card)", minHeight: 0 }}>
          <div className="card-pad" style={{ borderBottom: "1px solid var(--hairline)" }}>
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

          <form className="row" style={{ gap: 10, padding: 16, borderTop: "1px solid var(--hairline)" }}
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

function Bubble({ m }: { m: Msg }) {
  const me = m.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "85%" }}>
      <div className="label" style={{ marginBottom: 4, textAlign: me ? "right" : "left" }}>{me ? "You · RM" : "Twin"}</div>
      <div style={{
        padding: "11px 14px", borderRadius: 3, fontSize: 14, lineHeight: 1.5,
        background: me ? "var(--ink)" : "var(--paper-2)", color: me ? "var(--paper)" : "var(--ink)",
        borderTopRightRadius: me ? 1 : 3, borderTopLeftRadius: me ? 3 : 1,
      }}>{m.content}</div>
    </motion.div>
  );
}
