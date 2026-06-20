# Agent Angelo

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

The twin scene drives the standard `viseme_*` morph-target contract. A procedural
placeholder head renders + lip-syncs out of the box. For the realistic **Rocketbox**
avatar, drop a converted `.glb` in `web/public/avatars/` and set `VITE_AVATAR_URL` —
see [web/public/avatars/README.md](web/public/avatars/README.md). Voice is the browser
**Web Speech API**; lip-sync is driven procedurally from speech timing (see
`web/src/three/lipsync.ts` for the driver abstraction and the audio-element path).

## Personas (all four work, data-driven)

| Client | Mandate | Scenario |
|--------|---------|----------|
| Schneider | Balanced | Pharma holding (Roche) defunds neuro research → swap to same-sector CIO BUY |
| Huber | Defensive | Palm-oil cut-off → values-aligned Consumer-Staples tilt (opportunity) |
| Räber | Defensive | CIO rotation into US tech clashes with aversion → decline rotation |
| Ammann | Growth | Labour scandal at a consumer brand → swap to same-sector CIO BUY |
