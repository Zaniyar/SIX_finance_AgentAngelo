# Agent Angelo — Futuristic Swiss-Clean RM Advisory App

## Context

This is the **Agent Angelo** entry for **SwissHacks 2026** (challenge brief in `CHALLENGE_BRIEF.md`).
The product is a **relationship-manager (RM) dashboard** for a private bank serving ultra-high-net-worth
clients. It turns raw CRM notes + portfolio + live news into **personalised, explainable swap proposals**
within each client's fixed mandate — **AI drafts, RM decides, client places orders** (AI never talks to the
client directly).

On top of the required dashboard, we add the differentiating layer the user wants: a **futuristic but
Swiss-clean** UI (design language inspired by swissmade.xyz/BikeTausch — Helvetica typography, generous
whitespace, strict grid, monochrome + one accent, restrained motion), an interactive **world map** as the
navigation hub, and a **3D talking "digital twin"** of each client (realistic Rocketbox avatar in a
react-three-fiber scene, Web Speech voice, lip-sync, LLM-backed persona) that the RM can rehearse with
*before* meeting the real client.

We have the real provided dataset: `SIX-Noumena-NTT-Data/data/` — CRM (4 clients: Räber, Schneider, Huber,
Ammann), a 173-row CIO recommendation list, and 3 mandate portfolios (Defensive/Balanced/Growth). The
existing `SIX-Noumena-NTT-Data/demo/` has clean, reusable service patterns for the three live integrations.

### Decisions locked with the user
- **Avatar:** react-three-fiber + `wawa-lipsync`, using **realistic Rocketbox avatars** (not cartoonish).
- **Voice:** **Browser Web Speech API** (free, de-CH/de/en, no keys).
- **Data mode:** **Live-only** — LLM/news/market features call the real Phoeniqs/SIX/Event-Registry APIs;
  no mock fallback. (The CRM/portfolio/CIO *dataset* is local provided data, parsed to JSON — not an API.)
- **First slice:** **Schneider, full depth**, end-to-end; then replicate to the other 3 personas.

### Two engineering wrinkles being handled deliberately
1. **Web Speech ⇄ wawa-lipsync don't directly compose** — `SpeechSynthesis` plays to the speakers and
   can't be reliably tapped by wawa's Web Audio analyser. Solution: a `LipsyncDriver` abstraction with two
   implementations — `WebSpeechDriver` (procedural visemes from utterance `boundary`/start/end timing, used
   for the chosen voice path) and `WawaAudioDriver` (real `HTMLAudioElement` → wawa, kept wired for a future
   cloud-TTS / pre-rendered-audio path). Both write to the same `viseme_*` morph targets.
2. **Rocketbox GLB needs offline Blender/Mixamo conversion** (can't run here). The scene loads a
   **configurable GLB path** and targets the standard `viseme_*` + ARKit morph-target naming (the same
   contract TalkingHead's `rename-rocketbox-shapekeys.py` produces). Drop the converted file in
   `web/public/avatars/` and set `VITE_AVATAR_URL`. Until then the scene renders a neutral placeholder and a
   clear "drop your Rocketbox GLB here" hint; a public Ready-Player-Me URL (same morph-target names) can be
   used to prove lip-sync immediately.

## Architecture

New app at repo root, alongside the existing reference demo (left untouched):

```
AgentAngelo/
  backend/              # Express + TS API (reuses demo service patterns)
    services/           # phoeniqs, six, newsai  (copied/adapted from demo, see reuse below)
    advisory/           # NEW: dna, alerts/swap matcher, draft, twin-chat
    data/               # generated JSON seeds (gitignored source = xlsx)
    routes + index.ts
  web/                  # Vite + React + TS frontend
    src/views/          # WorldMap, ClientView, TwinChat
    src/three/          # R3F scene, Avatar, LipsyncDriver(s), viseme map
    src/design/         # tokens, typography, layout primitives
    public/avatars/     # drop Rocketbox GLB here
  scripts/extract-data.ts   # xlsx -> backend/data/*.json (run once / on data change)
```

- **Frontend:** Vite + React + TypeScript, `react-three-fiber` + `@react-three/drei` + `three`,
  `wawa-lipsync`, `zustand` (UI/session state), `framer-motion` (Swiss restrained motion), Tailwind for the
  design system. Vite dev proxy `/api` → backend (port 3001).
- **Backend:** Express + TS. Reuse the three service classes from
  `SIX-Noumena-NTT-Data/demo/src/backend/services/` largely as-is:
  - `phoeniqs.service.ts` (OpenAI-compatible chat; `configured` guard, robust JSON parsing) — reused for DNA
    extraction, alert reasoning, draft messages, twin chat.
  - `six.service.ts` (`findInstrument`, `getStockPrice`, `{valor}_{mic}` listing convention, MCP table
    parsing) — reused for live prices on holdings/swap candidates.
  - `newsai.service.ts` (`getLatestNews`, `analyzeNewsSentiment`) — reused for corroborating live headlines.
  - `probe.ts` ping pattern → an `/api/integrations` status panel in the UI.

## Core advisory logic (the "trust & explainability" engine — deterministic where it matters)

Keep the **decision-making deterministic and traceable**; use the LLM only for *language*, not for picking
trades. This directly targets the 25% "Trust & explainability" weight.

1. **Client DNA** (`advisory/dna.ts`): Phoeniqs reads a client's CRM notes → structured DNA
   `{ values[], context[], preferences[], commsStyle }`. Cache to `backend/data/cache/dna-<client>.json`
   to conserve shared LLM credits.
2. **Trigger event:** taken from the client's latest CRM `[SYSTEM ENTRY]` note (already present in the data
   — e.g. Schneider's pharma research-division shutdown), enriched with **live** Event-Registry headlines for
   the affected issuer/sector. (This keeps the scripted scenario reliable even under live-only.)
3. **Alert / swap matcher** (`advisory/alerts.ts`, pure TS): cross DNA × portfolio holdings × trigger →
   flag the conflicting holding; find a **same-sector** replacement from the **CIO BUY** list (constrained to
   the CIO Recommendation List — never invent tickers); respect the mandate (Defensive/Balanced/Growth) and
   the ±2.0pp drift rule. Output a structured, traceable proposal (which holding, why it clashes with which
   DNA value, which CIO candidate, sector/mandate checks passed).
4. **RM draft** (`advisory/draft.ts`): Phoeniqs writes the client-facing message, **tone-matched** to the
   DNA comms style (analytical vs values-led). RM can **edit/approve** before a mock "send".
5. **Digital twin chat** (`advisory/twin.ts`): Phoeniqs role-plays the client, grounded in that client's DNA
   + portfolio + recent CRM, with a guardrail system prompt (it's a rehearsal twin for the RM, not advice to
   a real client).

### API endpoints
- `GET /api/clients` — list (id, name, mandate, location, headline alert count)
- `GET /api/clients/:id` — DNA + portfolio (with live SIX prices + drift) + alerts + swap proposal
- `POST /api/clients/:id/draft` — generate/regenerate tone-matched RM message
- `POST /api/twin/:id/chat` — `{messages}` → twin reply (text the UI speaks via Web Speech)
- `GET /api/news?q=` — live corroborating headlines + sentiment
- `GET /api/integrations` — SIX/News/Phoeniqs liveness (reused probe pattern)

## Views (futuristic Swiss-clean)

1. **World Map (hub):** interactive map with the 4 clients as nodes (Swiss-centric), each showing mandate +
   alert state; click → Client View. Restrained motion, mono + accent, fine grid.
2. **Client View (Schneider first, full depth):** DNA panel · Portfolio panel (holdings, target vs current
   drift, CIO rating chips, live price) · Alert feed with explicit **"why"** · Swap proposal card with the
   full traceable chain · editable RM draft with approve/send.
3. **Twin Chat:** R3F scene with the Rocketbox avatar (idle + talking states), text input + voice output via
   Web Speech, lip-sync via `WebSpeechDriver`, persona answers from `/api/twin/:id/chat`.

## Build order

1. Scaffold `web` (Vite) + `backend` (Express) + design tokens; `scripts/extract-data.ts` → JSON seeds.
2. Backend: port the 3 services; add `dna`, `alerts`, `draft`, `twin`, routes; `/api/integrations`.
3. Client View for **Schneider** end-to-end (DNA → portfolio+prices → alert → swap → draft).
4. World Map hub wired to `/api/clients`.
5. Twin Chat: R3F scene + Avatar + `LipsyncDriver` (WebSpeech) + viseme map + chat wiring.
6. Replicate Client View depth to Räber, Huber, Ammann (data-driven, no new code).
7. Polish: motion, integrations panel, empty/error states for missing keys (live-only).

## Verification

- `scripts/extract-data.ts` produces non-empty `backend/data/*.json` for all 4 CRM tabs, CIO list, 3 portfolios.
- With real keys in `.env`: `GET /api/integrations` shows SIX + News + Phoeniqs green (reused ping pattern).
- `GET /api/clients/:id=schneider` returns DNA, live-priced portfolio with drift, ≥1 alert, a CIO-constrained
  same-sector swap proposal with a traceable reason chain.
- `POST /api/clients/schneider/draft` returns a values-led tone-matched message; editable in the UI.
- Twin Chat: typing a question → spoken reply + visible lip movement on the avatar; once a converted Rocketbox
  GLB is dropped in `web/public/avatars/` and `VITE_AVATAR_URL` set, the realistic avatar renders and lip-syncs.
- Manual demo walk-through of the Schneider story: world map → client → understand why → edit draft → rehearse
  with twin.

## Notes / risks
- **Live-only** means LLM/news/SIX features need valid `.env` keys to function; UI shows clear "integration not
  configured" states rather than mocks. Current `.env` has placeholders — keys must be added before those
  features work. The local dataset (CRM/portfolio/CIO) works without keys.
- Shared Phoeniqs credits: DNA + drafts are cached to disk to avoid re-billing.
- Rocketbox GLB conversion is an **offline manual step** (Blender + Mixamo + the TalkingHead rename script);
  the app is built to accept the result with zero code changes.
