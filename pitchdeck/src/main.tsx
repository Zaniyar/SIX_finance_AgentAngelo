import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import Reveal from "reveal.js";
import Notes from "reveal.js/plugin/notes/notes.esm.js";
import "reveal.js/dist/reveal.css";
import "./styles.css";

function App() {
  useEffect(() => {
    Reveal.initialize({
      hash: true,
      width: 1440,
      height: 900,
      margin: 0.035,
      transition: "slide",
      backgroundTransition: "fade",
      controls: true,
      progress: true,
      center: false,
      plugins: [Notes],
    });
    return () => {
      Reveal.destroy();
    };
  }, []);

  return (
    <div className="reveal">
      <div className="slides">
        <section className="hero" data-background-color="#07090d">
          <div className="aurora" />
          <div className="topline">
            <span>Agent Angelo - AURA</span>
            <span>SwissHacks Pitch · 2-3 min</span>
          </div>
          <div className="heroGrid">
            <div>
              <p className="eyebrow">Adaptive Understanding & Relationship Assistant</p>
              <h1>
                Every private banker gets a relationship radar.
              </h1>
              <p className="lead">
                AURA watches the portfolio, understands the person behind it, and prepares the relationship manager for the exact conversation that matters now.
              </p>
              <div className="teamLine">
                <span>Raisa Gulati</span>
                <span>Zaniyar Jahany</span>
                <span>Dean Marti</span>
                <span>Iulian Andrei Birlog</span>
              </div>
            </div>
            <div className="orbitStage" aria-label="AURA product visual">
              <div className="corePulse">AURA</div>
              <div className="orbit orbit1"><span>DNA</span></div>
              <div className="orbit orbit2"><span>SIX</span></div>
              <div className="orbit orbit3"><span>RM</span></div>
              <div className="orbit orbit4"><span>Guardrails</span></div>
              <div className="clientStack">
                {["schneider", "huber", "raeber", "ammann"].map((id) => (
                  <img key={id} src={`/profiles/${id}.png`} alt="" />
                ))}
              </div>
            </div>
          </div>
          <aside className="notes">
            Opening: We are team Agent Angelo. We built AURA: an adaptive understanding and relationship assistant for private banking. The problem is simple: relationship managers have too much market noise and too little time to translate it into personal, compliant client conversations. AURA gives every RM a relationship radar.
          </aside>
        </section>

        <section data-background-color="#f4f2eb">
          <div className="split">
            <div>
              <p className="eyebrow dark">Problem</p>
              <h2>The RM knows the portfolio. The client expects them to remember the relationship.</h2>
              <p className="bodyText">
                News, CIO views, mandate drift, client values, preferences, and past meetings live in different places. The risk is not only missing an investment signal. The bigger risk is calling the client with the wrong message.
              </p>
            </div>
            <div className="problemBoard">
              <Metric value="17" label="tabs before one call" tone="red" />
              <Metric value="1" label="wrong framing can break trust" tone="black" />
              <Metric value="0" label="time to rehearse" tone="green" />
              <div className="attentionCurve">
                <svg viewBox="0 0 520 190" role="img" aria-label="attention curve">
                  <path d="M20 132 C100 30, 210 30, 300 116 S450 165, 500 70" />
                  <line x1="48" y1="28" x2="48" y2="164" />
                  <line x1="250" y1="28" x2="250" y2="164" />
                  <line x1="470" y1="28" x2="470" y2="164" />
                </svg>
                <span>Catch the relationship signal before attention fades.</span>
              </div>
            </div>
          </div>
          <aside className="notes">
            Who has the problem? Relationship managers in private banking. They need to protect trust while acting quickly. Today the information is scattered: market data, CIO recommendations, CRM notes, client preferences. So the problem is not just data overload. It is relationship context overload.
          </aside>
        </section>

        <section data-background-color="#07090d">
          <div className="darkSlide">
            <p className="eyebrow">What we built</p>
            <h2>AURA turns noise into one next best relationship action.</h2>
            <div className="productFrame">
              <div className="mapPanel">
                <div className="mapGrid" />
                {[
                  ["schneider", "Geneva", "conflict", "18%", "74%"],
                  ["huber", "Bern", "opportunity", "54%", "45%"],
                  ["raeber", "Zurich", "opportunity", "72%", "33%"],
                  ["ammann", "St. Gallen", "conflict", "83%", "63%"],
                ].map(([id, city, type, left, top]) => (
                  <div key={id} className={`pin ${type}`} style={{ left, top }}>
                    <img src={`/profiles/${id}.png`} alt="" />
                    <span>{city}</span>
                  </div>
                ))}
              </div>
              <div className="actionPanel">
                <div className="chip red">Values conflict</div>
                <h3>Holding conflicts with client values</h3>
                <p>Matched to client DNA: sustainable family legacy, low reputational risk, relationship-led communication.</p>
                <div className="swap">
                  <div>
                    <small>Exit</small>
                    <strong>Controversial issuer</strong>
                  </div>
                  <b>→</b>
                  <div>
                    <small>Reinvest</small>
                    <strong>CIO BUY alternative</strong>
                  </div>
                </div>
                <div className="checks">
                  <span>Same sector</span>
                  <span>CIO approved</span>
                  <span>Mandate preserved</span>
                </div>
              </div>
            </div>
          </div>
          <aside className="notes">
            What did we build? A dashboard that monitors clients and highlights conflicts or opportunities. For each client, it explains why this matters, which value it touches, what action to consider, and whether the action passes suitability-style guardrails.
          </aside>
        </section>

        <section data-background-color="#f4f2eb">
          <div className="flowSlide">
            <p className="eyebrow dark">How it works</p>
            <h2>Deterministic decisions. Generative language. Human final call.</h2>
            <div className="flow">
              <Step n="01" title="Understand" text="CRM notes become client DNA: values, context, preferences, communication style." />
              <Step n="02" title="Detect" text="Portfolio + news + CIO universe surface conflicts and opportunities." />
              <Step n="03" title="Validate" text="Same-sector, mandate drift, concentration, evidence, and DNA-link checks." />
              <Step n="04" title="Prepare" text="Draft outreach and rehearse with a digital twin before the real meeting." />
            </div>
            <div className="twinDemo">
              <div className="avatarHalo">
                <img src="/profiles/schneider.png" alt="" />
              </div>
              <div className="chatCard">
                <span>Digital twin rehearsal</span>
                <p>“I understand the performance case. But explain why this does not compromise what we agreed about reputation risk.”</p>
              </div>
            </div>
          </div>
          <aside className="notes">
            How does it work? We deliberately separate the hard decisions from the language. The matching and guardrails are deterministic and auditable. The LLM is used where it is strong: summarizing, drafting, and role-playing the client. The RM remains in control.
          </aside>
        </section>

        <section data-background-color="#0c1020">
          <div className="wow">
            <p className="eyebrow">Why it wins</p>
            <h2>Not a chatbot. A trust-preserving copilot for the moment before the call.</h2>
            <div className="wowGrid">
              <div className="wowCard">
                <b>For the bank</b>
                <span>Fewer missed signals. Cleaner audit trails. Scalable relationship quality.</span>
              </div>
              <div className="wowCard">
                <b>For the RM</b>
                <span>Know what happened, why it matters, and how to say it.</span>
              </div>
              <div className="wowCard">
                <b>For the client</b>
                <span>Advice feels personal, timely, and consistent with who they are.</span>
              </div>
            </div>
            <div className="closingLine">AURA makes private banking feel private again.</div>
          </div>
          <aside className="notes">
            Wow factor: the digital twin. Before a difficult call, the RM can rehearse with a client-like persona grounded in CRM context and values. Our team is Raisa, Zaniyar, Dean, and Iulian. The next step is to connect more live data sources and measure time saved per prepared client conversation. Final line: AURA makes private banking feel private again.
          </aside>
        </section>

        <section data-background-color="#f4f2eb">
          <div className="qaSlide">
            <p className="eyebrow dark">Q&A prep</p>
            <h2>Likely questions. Crisp answers.</h2>
            <div className="qaGrid">
              <QA q="Is this giving financial advice automatically?" a="No. AURA prepares the RM. Suitability checks and recommendations are surfaced, but the human owns the final decision and client conversation." />
              <QA q="How do you prevent hallucinated actions?" a="The action logic is deterministic: same-sector matching, CIO universe, mandate drift, concentration, evidence, and DNA-link checks. Generative AI is used for language and rehearsal." />
              <QA q="Where does the client DNA come from?" a="CRM notes and relationship history are summarized into values, context, preferences, and communication style. It is explainable and can be corrected by the RM." />
              <QA q="What makes this different from a bank dashboard?" a="It connects portfolio events to the person: why this client cares, what to do, how to say it, and how the client might react." />
            </div>
          </div>
          <aside className="notes">
            Backup slide for Q&A. Keep answers short. Bring every answer back to three principles: human in control, auditability, relationship context.
          </aside>
        </section>

        <section data-background-color="#07090d">
          <div className="appendix">
            <p className="eyebrow">Pitch timing</p>
            <h2>2-3 minute run of show</h2>
            <div className="timing">
              <span><b>0:00</b> What: AURA relationship radar</span>
              <span><b>0:25</b> Who: private banking RMs</span>
              <span><b>0:50</b> Problem: scattered data, fragile trust</span>
              <span><b>1:25</b> How: DNA + detection + guardrails + twin</span>
              <span><b>2:20</b> Team + closing punchline</span>
            </div>
          </div>
          <aside className="notes">
            This is a backup timing slide, not required in the live pitch unless asked.
          </aside>
        </section>
      </div>
    </div>
  );
}

function Metric({ value, label, tone }: { value: string; label: string; tone: "red" | "green" | "black" }) {
  return (
    <div className={`metric ${tone}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="step">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="qa">
      <b>{q}</b>
      <span>{a}</span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
