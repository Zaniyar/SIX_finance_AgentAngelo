import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About · AgentAngelo" }] }),
  component: About,
});

const team = [
  { name: "Raisa Gulati" },
  { name: "Zaniyar Jahany", contact: "jaha@zhaw.ch" },
  { name: "Dean Marti" },
  { name: "Iulian Andrei Birlog" },
];

const partners = [
  { name: "Réalité Suisse GmbH", url: "http://swissmade.xyz/", logo: "https://raw.githubusercontent.com/Zaniyar/SIX_finance_AgentAngelo/main/web/public/realite-suisse-logo.png" },
  { name: "Tenity", logo: "https://cdn.prod.website-files.com/65d86f019d4bd1a34646a0ae/65ee074c28ba5c0aaa3ea114_Tenity_logo_white%20(1).svg" },
  { name: "SIX", logo: "https://cdn.prod.website-files.com/65d86f019d4bd1a34646a0ae/65d87371590440050fa08a8f_1_SIX-p-1080.png" },
];

function About() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-16 py-8">

        {/* Hero */}
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Built for SwissHacks 2026</p>
          <h1 className="font-display text-5xl tracking-tight leading-tight">Agent Angelo</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            The world's first proactive wealth management dashboard — an AI agent that doesn't wait to be asked.
          </p>
          <a href="https://agentangelo.finance" className="inline-flex items-center gap-2 text-sm text-accent hover:underline">
            agentangelo.finance
          </a>
        </section>

        <div className="w-full h-px bg-border" />

        {/* What is it */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What is Agent Angelo?</h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            Agent Angelo is a next-generation Relationship Manager Intelligence Platform for Swiss and international private banks serving (ultra-)high-net-worth clients. It transforms years of CRM notes, live portfolio data, and real-time market signals into personalised, explainable, auditable advisory actions — while keeping the RM fully in the loop.
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            It is not just a dashboard. It is a <strong>living agent</strong> embedded in your data.
          </p>
          <blockquote className="border-l-2 border-accent pl-4 text-sm italic text-muted-foreground">
            The idea of an agent living inside data — believing its world is real — was inspired by the art project{" "}
            <a href="http://promptedworld.xyz/" className="text-accent hover:underline" target="_blank" rel="noreferrer">PromptedWorld</a>,
            where an AI agent exists entirely within a simulated reality, convinced that it and its world are genuine.
            Agent Angelo carries that same premise into finance: a mind living inside your data, acting as if the stakes are real — because they are.
          </blockquote>
        </section>

        <div className="w-full h-px bg-border" />

        {/* Key Innovations */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl tracking-tight">Key Innovations</h2>
          {[
            {
              title: "Proactive AI that calls you",
              body: "Angelo monitors your client book 24/7 and calls you on your real phone when something urgent happens — in a human voice, with a two-way conversation powered by ElevenLabs Conversational AI and Twilio.",
            },
            {
              title: "AI Everywhere — right-click context intelligence",
              body: "Every number, chart and claim is right-click explainable. Select any text and choose 'Ask AI' — the assistant answers in the context of that exact data point. Contextual intelligence at the pixel level.",
            },
            {
              title: "3D Digital Twin for client rehearsal",
              body: "Rehearse the full conversation with a real-time 3D clone of the client before any sensitive meeting — animated, lipsync'd, and grounded in that client's actual DNA. Powered by 3DClone.me and MetaRoom.city.",
            },
            {
              title: "'Why This?' — full decision traceability",
              body: "Every recommendation traces to its API source. An animated decision tree shows exactly which market signal triggered the alert, which DNA value it conflicts with, and why the swap was chosen.",
            },
            {
              title: "OPA Policy Engine — compliance by design",
              body: "Every AI output passes through Open Policy Agent before reaching the RM. Hallucination detection, suitability checks, concentration limits, sanctions blocks, and citation enforcement — enforced in milliseconds.",
            },
            {
              title: "Client DNA — the deepest personalization layer",
              body: "Each client has a DNA profile built from CRM notes, behavioral patterns, family context, and stated values — extracted by LLM with Explicit / Pattern / Inferred confidence scores.",
            },
            {
              title: "Deterministic alert engine — auditable by design",
              body: "The core decision logic is pure deterministic TypeScript, not AI. Fully auditable. The LLM only writes language — the decision is always code.",
            },
          ].map((item) => (
            <div key={item.title} className="space-y-1.5">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <div className="w-full h-px bg-border" />

        {/* Team */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl tracking-tight">Team</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {team.map((m) => (
              <div key={m.name} className="bg-secondary/40 border border-border rounded-xl px-4 py-3 text-center">
                <div className="text-sm font-medium">{m.name}</div>
                {m.contact && (
                  <a href={`mailto:${m.contact}`} className="text-[11px] text-muted-foreground hover:text-accent transition mt-0.5 block">{m.contact}</a>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="w-full h-px bg-border" />

        {/* Partners */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl tracking-tight">Built with and supported by</h2>
          <div className="flex items-center gap-8 flex-wrap">
            {partners.map((p) => (
              <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition">
                <img src={p.logo} alt={p.name} className="h-8 w-auto" />
              </a>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
