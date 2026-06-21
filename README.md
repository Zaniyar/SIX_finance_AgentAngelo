# Agent Angelo

---

> **"The world's first proactive wealth management dashboard — an AI agent that doesn't wait to be asked."**

Live demo: **[agentangelo.finance](https://agentangelo.finance)**

Built for **SwissHacks 2026**

---

**Built with and supported by**

<a href="http://swissmade.xyz/"><img src="https://raw.githubusercontent.com/Zaniyar/SIX_finance_AgentAngelo/main/web/public/realite-suisse-logo.png" height="40" alt="Réalité Suisse GmbH" /></a>&nbsp;&nbsp;&nbsp;
<img src="https://cdn.prod.website-files.com/65d86f019d4bd1a34646a0ae/65ee074c28ba5c0aaa3ea114_Tenity_logo_white%20(1).svg" height="36" alt="Tenity" />&nbsp;&nbsp;&nbsp;
<img src="https://cdn.prod.website-files.com/65d86f019d4bd1a34646a0ae/65d87371590440050fa08a8f_1_SIX-p-1080.png" height="36" alt="SIX" />

---

## What is Agent Angelo?

Agent Angelo is a next-generation **Relationship Manager Intelligence Platform** for Swiss and international private banks serving (ultra-)high-net-worth clients. It transforms years of CRM notes, live portfolio data, and real-time market signals into **personalised, explainable, auditable advisory actions** — while keeping the RM fully in the loop.

It is not just a dashboard. It is a **living agent** embedded in your data.

---

## Key Innovations

### The World's First Proactive Dashboard
Agent Angelo is an AI agent that monitors your entire client book 24/7 and **calls you on your real phone** when something urgent happens. When Novartis shuts down its neurology program and one of your clients holds 5.8% in that stock, Angelo doesn't wait for you to log in. He calls. He briefs you. He suggests the swap. In a human voice. In real-time.

Built on **ElevenLabs Conversational AI** + **Twilio** — genuine two-way voice conversation, not a recording. Angelo knows each client's DNA, portfolio, and communication style before he dials.

### AI Everywhere — Right-Click Context Intelligence
Every number, every chart, every claim on the screen is **right-click explainable**. Select any text or figure and choose "Ask AI" — the assistant answers in the context of that exact data point. *"What does this 5.8% exposure mean for Schneider's risk profile?"* The AI knows, because it sees exactly what you see.

This is contextual intelligence at the pixel level, not a generic chatbot bolted on the side.

### 3D Digital Twin for Client Rehearsal
Before any sensitive client meeting, the RM can **rehearse the full conversation** with a real-time 3D clone of the client — animated, lipsync'd, and grounded in that client's actual DNA (values, sensitivities, communication style, objection patterns).

**3D Avatar Technology by [3DClone.me](https://3DClone.me)** — personalized 3D human avatars with facial animation and lipsync.
**Immersive rehearsal environment by [MetaRoom.city](https://MetaRoom.city/)** — a Swiss startup bringing spatial computing to professional training and client preparation.

The twin doesn't guess. It role-plays from real CRM notes, DNA extractions, and behavioral patterns — so when the RM says the wrong thing, the twin pushes back exactly as the real client would.

### "Why This?" — Full Decision Traceability
Every recommendation, every alert, every number is **traced to its source**. Click the "Why" button on any message field and an animated decision tree unfolds — showing exactly which market signal triggered the alert, which DNA value it conflicts with, which CIO-approved swap was selected, and why.

No black boxes. Every assertion cites the API endpoint and field that produced it:
```
GET /api/clients/schneider/portfolio-fit  →  holdings[].weight_pct = 5.8%
GET /api/alerts/a-1                       →  title = "Novartis shuts neurology programs"
```

### OPA Policy Engine — Compliance by Design
Every AI output passes through **Open Policy Agent (OPA)** before it reaches the RM. OPA is an industry-standard policy engine used at scale to enforce rules in real-time — a compliance firewall that runs in milliseconds before any AI response is shown.

In Agent Angelo, OPA enforces:

- **Hallucination detection** — if the AI mentions a ticker not in the client's real portfolio, the response is blocked and flagged
- **Suitability checks** — no recommendation can exceed the client's risk tolerance or mandate limits
- **Concentration limits** — per mandate (Defensive: 8%, Balanced: 12%, Growth: 18%)
- **Sanctions hard blocks** — sanctioned clients are never served recommendations
- **Citation enforcement** — every recommendation must reference a verified API source

The result: the AI can only say things that are true, sourced, and compliant. Every decision is logged to a **hash-chained audit ledger** — FINMA-grade traceability, validated with 7/7 test scenarios under OPA 1.17.1.

### Client DNA — The Deepest Personalization Layer
Each client has a **DNA profile** built from CRM notes, meeting transcripts, behavioral patterns, family context, and stated values — extracted by LLM and cached with confidence scores (Explicit / Pattern / Inferred).

The DNA drives everything: tone, channel, angle, timing. Schneider's DNA knows about Chloe's illness. Huber's DNA knows about the Atlantic Forest foundation. The AI never ignores what matters most to a client.

### Deterministic Alert Engine — Auditable by Design
The core decision logic — which holding clashes with which client value, which CIO-approved same-sector replacement to propose, mandate/drift/concentration checks — is **pure deterministic TypeScript**. Not AI. Fully auditable. No hallucinations possible at the decision layer.

The LLM only writes *language*: the RM draft, the twin's persona, the briefing script. The *decision* is always code.

---

## Architecture

```
nicerWebClient/   TanStack Start (SSR) + React + Three.js
                  WorldMap · Recommendations · TwinChat · Copilot · Events

backend/          Express + TypeScript API
                  Phoeniqs LLM · SIX MCP (live prices) · ElevenLabs (voice)
                  advisory/   DNA · alert+swap matcher · draft · twin · OPA
                  data/       JSON seeds + hash-chained audit ledger
                  opa/        Rego policies · 7 test scenarios (OPA 1.17.1)
```

Live at [agentangelo.finance](https://agentangelo.finance) · Docker + nginx + Let's Encrypt

---

## Run it locally

Fill `SIX-Noumena-NTT-Data/demo/.env` with:
```
PHOENIQS_API_KEY        ELEVENLABS_API_KEY      ELEVENLABS_AGENT_ID
TWILIO_ACCOUNT_SID      TWILIO_AUTH_TOKEN       TWILIO_FROM_NUMBER
RM_PHONE_NUMBER         ELEVENLABS_PHONE_NUMBER_ID
```

```bash
cd backend && npm install && npm run dev          # port 3001
cd nicerWebClient && npm install && npm run dev  # port 5173 (HTTPS)
```

---

## Client Personas

| Client | Mandate | Scenario | DNA Hook |
|--------|---------|----------|----------|
| Hubertus & Carmen Schneider | Balanced | Novartis shuts neurology → swap to Roche | Daughter Chloe's illness |
| Marius & Elena Huber | Defensive | Unilever reforestation → increase position | Atlantic Forest foundation |
| Eugen & Lisa Räber | Defensive | CIO TAA clashes with mandate exclusion | Capital preservation above all |
| Julian Ammann | Growth | Labour scandal at Amazon → reputation risk | Cannot hold names in public backlash |

---

## Contact

[jaha@zhaw.ch](mailto:jaha@zhaw.ch)
