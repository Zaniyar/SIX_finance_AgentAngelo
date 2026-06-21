# Agent Angelo

<a href="http://swissmade.xyz/"><img src="https://raw.githubusercontent.com/Zaniyar/SIX_finance_AgentAngelo/main/web/public/realite_suisse_gmbh_logo-271x160.webp" width="120" alt="Réalité Suisse GmbH" /></a>

Futuristic, Swiss-clean **relationship-manager intelligence** app for SwissHacks 2026.
It turns three years of CRM notes + portfolios + live markets into **personalised,
explainable swap proposals** — within each client's fixed mandate, with the RM always in
the loop. On top of the dashboard it adds an interactive **client world map** and a
**3D talking "digital twin"** the RM can rehearse with before a meeting.

See [PLAN.md](PLAN.md) for the full design and [CHALLENGE_BRIEF.md](CHALLENGE_BRIEF.md)
for the challenge.

## Architecture

```
backend/   Express + TS API   — Phoeniqs (LLM) · SIX MCP (prices) · Event Registry (news)
           advisory/          — DNA · deterministic alert+swap matcher · draft · twin
           data/seeds/        — JSON parsed from the provided xlsx (scripts/extract-data.py)
web/       Vite + React + TS  — WorldMap · ClientView · TwinChat (react-three-fiber)
```

**Trust by design:** the *decision* (which holding clashes, which CIO-approved
same-sector replacement, mandate/drift checks) is **pure deterministic code** in
`backend/src/advisory/alerts.ts` — fully auditable. The LLM only writes *language*
(DNA summary, the RM draft, the twin's persona).

## Run it

1. **Keys (for live LLM/news/prices):** fill `SIX-Noumena-NTT-Data/demo/.env`
   (`PHOENIQS_API_KEY`, `SIX_MCP_TOKEN`, `NEWSAPI_KEY`). The backend reads that file.
   Without keys, the deterministic engine (portfolio + alerts + swap + audit trail)
   still renders; DNA, drafts and the twin show a clear "integration needed" state.

2. **Data seeds** (already generated; re-run only if the xlsx changes):
   ```bash
   python3 scripts/extract-data.py
   ```

3. **Backend** (port 3001):
   ```bash
   cd backend && npm install && npm run dev
   ```

4. **Frontend** (port 5173, proxies `/api` → 3001):
   ```bash
   cd web && npm install && npm run dev
   ```
   Open http://localhost:5173

## Digital-twin avatar

The twin scene drives the standard `viseme_*` morph-target contract and enables
**3D immersive rehearsal** — the RM can simulate a full conversation with a client's
digital twin before the real meeting, practicing tone, objections, and timing in a
safe environment.

**3D Avatar Technology by [3DClone.me](https://3DClone.me)** — realistic, personalized
3D human avatars with facial animation and lipsync driven from the `viseme_*` morph
target contract.

**Immersive rehearsal environment powered by [MetaRoom.city](https://MetaRoom.city/)** —
a Swiss startup bringing spatial computing to professional training and client
relationship preparation.

Voice uses **ElevenLabs** for realistic TTS with lipsync driven from the audio
amplitude analyser (see `nicerWebClient/src/three/lipsync.ts`).

## Personas (all four work, data-driven)

| Client | Mandate | Scenario |
|--------|---------|----------|
| Schneider | Balanced | Pharma holding (Roche) defunds neuro research → swap to same-sector CIO BUY |
| Huber | Defensive | Palm-oil cut-off → values-aligned Consumer-Staples tilt (opportunity) |
| Räber | Defensive | CIO rotation into US tech clashes with aversion → decline rotation |
| Ammann | Growth | Labour scandal at a consumer brand → swap to same-sector CIO BUY |
