# Challenge Brief — Agent Angelo @ SwissHacks 2026

> **Purpose:** Fast onboarding for any LLM/agent working on this repo. Read this first, then dive into `SIX-Noumena-NTT-Data/`.

## One-liner

Build a **relationship-manager dashboard** that turns raw CRM notes + portfolio + live news into **personalised, explainable swap proposals** — within the client's existing mandate, with the **RM always in the loop**.

## Core rule (do not violate)

- **Strategy is fixed** (Defensive / Balanced / Growth mandate).
- **Personalisation is at asset level:** find holdings that clash with the client's "DNA", propose a **same-sector replacement** from the **CIO recommendation list**.
- **AI never talks to the client directly.** AI drafts; RM decides; client places orders.

## The 4-step product flow

1. **Parse CRM** → build client DNA (values, context, preferences, comms style)
2. **Link portfolio + news** → holdings, drift, CIO ratings, live events
3. **Surface alerts** → match DNA × portfolio × news → conflicts/opportunities
4. **Draft RM message** → tone matched to client (analytical vs values-led)

## Four demo personas (build & test all)

| Client | Strategy | CRM tab | Portfolio tab | Trigger event |
|--------|----------|---------|---------------|---------------|
| **Schneider** — purpose-driven, family foundation for chronic-illness research | Balanced | `CRM Schneider` | `Sample Portfolio Balanced` | Pharma shuts down research division for that disease |
| **Huber** — environmentalist, South American reforestation | Defensive | `CRM Huber` | `Sample Portfolio Defensive` | Consumer brand announces palm-oil deforestation cut-off |
| **Räber** — conservative Swiss couple, averse to US tech | Defensive | `CRM Raeber` | `Sample Portfolio Defensive` | CIO wants rebalance from blue chips → US AI stocks |
| **Ammann** — Swiss entrepreneur, reputational risk = financial risk | Growth | `CRM Ammann` | `Sample Portfolio Growth` | Labour exploitation scandal at portfolio consumer brand |

## Deliverables (hackathon)

- Clickable prototype / working frontend
- Minimal backend or agent flow showing reasoning + personalisation
- Demo story: RM sees change → understands why → acts
- `.pptx` presentation (problem, demo, features, user journey)
- Submit code + [MCP feedback form](https://forms.office.com/e/tX2cH5n9Yi)

## Judging weights

| Criterion | Weight |
|-----------|--------|
| Creativity | 25% |
| Trust & explainability | 25% |
| Feasibility | 20% |
| Visual design | 15% |
| Presentation | 15% |

**Bias your design toward transparency, traceability, and human control** — not just flashy chat.

## Repo layout

```
SIX-Noumena-NTT-Data/
├── data/                          # SwissHacks CRM.xlsx + Portfolio Construction.xlsx
├── demo/                          # Reference integration (Express + SPA) — START HERE
│   ├── .env.example               # Copy → .env
│   └── src/backend/services/      # phoeniqs, six, newsai service patterns
├── docs/
│   ├── SIX_MCP.md                 # 23 tools, 17 work with hackathon token
│   ├── Phoeniqs_AI.md             # LLM setup
│   └── *.pdf                      # Pitch + deep-dive decks
└── README.md                      # Full challenge spec
```

## Data files (when present in `data/`)

| File | Contents |
|------|----------|
| `SwissHacks CRM.xlsx` | 3 years of RM logs, 1 tab per client |
| `SwissHacks Portfolio Construction.xlsx` | 3 mandates (CHF 10M each), positions, CIO BUY/HOLD/SELL list, swap candidates, tx history, cash flows, SIX Valor+MIC + Yahoo tickers |

**Portfolio conventions:** amounts in CHF; bond qty = face value ÷ 100; `Current (CHF)` = post-rebalance drift (~10 days after Apr 2026 rebalance); `Target (CHF)` = rebalance target; ±2.0pp mandate-drift rule in workbook README.

## Tech stack (provided)

| Layer | What | Env var / config |
|-------|------|------------------|
| Market data | SIX MCP (JSON-RPC over HTTP, 23 tools) | `SIX_MCP_TOKEN`, `SIX_MCP_URL` |
| News | Event Registry / newsapi.ai | `NEWSAPI_KEY` |
| LLM | Phoeniqs (OpenAI-compatible) | `PHOENIQS_API_KEY`, `PHOENIQS_MODEL` |
| Optional | SIX Web API (cert auth), Noumena KG, NTT DATA patterns | see docs |

**SIX ID conventions:**
- Instrument → **Valor** (e.g. `645156`)
- Listing (price tools) → **`{Valor}_{MIC}`** (e.g. `645156_XNAS`)
- Bonds → ISIN via `instrument_symbology`

**Hackathon token:** 17/23 SIX tools work; 6 gated (fundamentals, estimates, classifications, etc.) — see `docs/SIX_MCP.md` §4.

## Reference demo (verify credentials first)

```bash
cd SIX-Noumena-NTT-Data/demo
cp .env.example .env   # fill keys
npm install && npm run dev
# → http://localhost:3000
```

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Server up |
| `GET /api/analysis/integrations` | Ping SIX + News + Phoeniqs |
| `POST /api/analysis/analyze` `{ "symbol": "Apple" }` | End-to-end sample flow |

Use `demo/` as **integration reference**, not the final product — the real app is the RM dashboard with personas above.

## Suggested architecture (optional)

Multi-agent: **Orchestrator** → CRM Agent, Portfolio Agent, News Agent, Message Agent → unified dashboard. Teams may innovate.

## Contacts (credentials & domain help)

| Need | Contact |
|------|---------|
| SIX MCP token | ramiro.lopez@six-group.com, laurent.lefevre@six-group.com |
| Phoeniqs LLM credits | stefan.taroni@phoenix-technologies.ch |
| Personas / business case | thomas.geiger@nttdata.com, sandra@noumenadigital.com |
| On-site | SIX booth @ SwissHacks Zurich, 19–21 Jun 2026 |

## Agent working notes

- **Team name:** Agent Angelo
- **Workspace:** `/Users/jaha/project/AgentAngelo/`
- **Do not** expose raw API keys in code/commits; use `.env`
- **Prioritise:** one persona end-to-end demo > four half-built flows
- **Show reasoning:** why this holding conflicts, why this swap, why this message tone
- **CIO list constrains swaps** — don't invent random tickers outside it
- Parse CRM xlsx tabs by exact names above; portfolio tabs match strategy column

## Quick sanity checklist before building features

- [ ] `.env` has all 3 keys; `/integrations` shows green
- [ ] Can load one client's CRM + portfolio from xlsx
- [ ] Can fetch news for a holding ISIN/name
- [ ] Can explain a DNA conflict and propose CIO-list swap
- [ ] RM can edit/approve draft message before "send"
