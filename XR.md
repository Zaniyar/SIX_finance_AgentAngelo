# XR & 3D Avatar Architecture

> Technical deep-dive into the voice, lipsync, 3D avatar, and proactive call stack.
> Written for engineers who want to extract this subsystem and build a standalone XR product.

---

## Vision: From Agent Angelo to a Full XR Platform

Agent Angelo contains a complete, production-tested stack for:

- **Real-time 3D human avatars** with authentic lipsync (phoneme-level morph targets)
- **Two-way AI voice calls** that know about the person being called and speak naturally
- **AR mode** for placing the avatar in physical space via WebXR
- **Rehearsal scenarios** where an AI role-plays as a specific human, grounded in that person's real data

This is the foundation for a product that competes with [Xara Community](https://xara-community.ch/en/) but with dynamic, data-driven AI characters instead of scripted actors.

---

## 1. The Viseme Contract — Morph Target Standard

Every avatar in this system must export the **15 Oculus/OVR visemes** as morph targets (shape keys in Blender). This is the universal contract between the avatar mesh and the lipsync drivers.

### The 15 Viseme Names

```
viseme_sil   — silence / neutral mouth
viseme_PP    — bilabial (p, b, m)
viseme_FF    — labiodental (f, v)
viseme_TH    — dental (th)
viseme_DD    — alveolar stop (d, t)
viseme_kk    — velar stop (k, g)
viseme_CH    — postalveolar (ch, sh, zh)
viseme_SS    — sibilant (s, z)
viseme_nn    — nasal (n, l)
viseme_RR    — rhotic (r)
viseme_aa    — open vowel (father)
viseme_E     — front vowel (bed)
viseme_I     — close front (see)
viseme_O     — back rounded (go)
viseme_U     — close back (blue)
```

### Groupings Used for Procedural Animation

```typescript
// vowel-like shapes — driven by amplitude/energy
OPEN_VISEMES  = ["viseme_aa", "viseme_E", "viseme_O", "viseme_I", "viseme_U"]

// closure snaps — driven by word boundary events
CLOSED_VISEMES = ["viseme_PP", "viseme_FF", "viseme_nn"]
```

### Blink Morph Targets (optional, any of these names work)

```typescript
BLINK_TARGETS = ["eyeBlinkLeft", "eyeBlinkRight", "blink", "eyesClosed"]
```

Fault-tolerant: if a target name doesn't exist on the mesh, it is silently skipped.

---

## 2. Avatar Pipeline — From Rocketbox/Mixamo to GLB

### What the Runtime Expects

A single `.glb` file containing:
1. A Mixamo-compatible skeleton rig
2. All 15 Oculus viseme morph targets on the face mesh(es)
3. Two animation clips: **`BreathingIdle`** and **`Waving`**
4. PBR materials (MeshStandardMaterial — metalness/roughness workflow)

### Full Pipeline

```
1. Source avatar
   Microsoft Rocketbox (.fbx) or any rigged character

2. Import to Blender
   File → Import → FBX
   The mesh has Rocketbox-specific blend shape names (not Oculus names)

3. Strip animation data (optional)
   Keep only the mesh + armature

4. Export as FBX
   File → Export → FBX (include armature, no animation)

5. Upload to Mixamo (mixamo.com)
   - Auto-rig (or use existing rig if Mixamo-compatible)
   - Download two animations separately:
     a. "Breathing Idle" → rename clip to "BreathingIdle"
     b. "Waving" → rename clip to "Waving"

6. Back in Blender: Import all three FBX files
   - Base mesh + rig
   - BreathingIdle animation
   - Waving animation

7. Rename blend shapes (CRITICAL)
   Run the script from TalkingHead:
   https://github.com/MiiKkeel/TalkingHead/blob/main/rename-rocketbox-shapekeys.py
   This remaps Rocketbox blend shape names → Oculus viseme names

8. Bake animations onto the combined rig

9. Export as GLB
   File → Export → glTF 2.0
   - Include: Mesh, Armature, Shape Keys, Animation
   - Format: Binary (.glb)

10. Deploy
    Place in nicerWebClient/public/avatars/
    Reference via VITE_AVATAR_URL or hardcoded path
```

### Material Adjustments Applied at Runtime

The system nudges GLB PBR materials for portrait rendering in WebGL:

```typescript
mat.envMapIntensity = 0.35;                         // Soften reflections
mat.roughness = Math.min(mat.roughness, 0.72);      // Prevent metallic look
mat.metalness = Math.min(mat.metalness, 0.08);      // Keep skin matte
```

---

## 3. Lipsync Drivers

The lipsync system has two drivers that implement the same `LipsyncDriver` interface. The avatar samples `driver.visemes` every frame (via `useFrame`) and applies morph target weights directly.

```typescript
interface LipsyncDriver {
  visemes: VisemeMap;          // { [visemeName]: 0..1 }
  speaking: boolean;
  speak(text: string): Promise<void>;
  stop(): void;
  update(dt: number): void;   // Called every frame
}
```

### Driver A: AudioFileDriver (Real Amplitude)

Used for ElevenLabs TTS — plays an MP3 and drives visemes from the real audio waveform.

**How it works:**
1. Creates `HTMLAudioElement` with `crossOrigin: "anonymous"`
2. Wires it through Web Audio API: `MediaElementSource → AnalyserNode → AudioContext.destination`
3. AnalyserNode with `fftSize = 256` (128 frequency bins)
4. Every frame: calls `getByteTimeDomainData()` (time-domain, not frequency)
5. Computes RMS amplitude: `sum of |sample - 128| / length / 28`
6. Maps amplitude → vowel morph weight
7. All morphs lerp at `dt * 18` for smooth transitions

```typescript
// Core amplitude → viseme mapping
const amplitude = Math.min(1, sum / buf.length / 28);

if (amplitude > 0.02) {
  const wave = Math.sin(phase) * 0.5 + 0.5;
  target[activeOpen] = Math.min(1, amplitude * 1.6 + wave * 0.2);
} else {
  target["viseme_sil"] = 1;
}
```

Active viseme re-picked every 80–140ms for natural variation.

### Driver B: WebSpeechDriver (Procedural)

Used when audio cannot be tapped (Web Speech API plays directly to speakers). Falls back to estimated timing.

**How it works:**
1. Uses `SpeechSynthesisUtterance` to speak text
2. `onboundary` event → `energy = 1` (word-boundary pulse)
3. Energy decays at 4.5 units/sec between boundaries
4. Phase oscillator at 9 rad/sec drives a sine wave for vowel cycling
5. Active viseme re-picked every 100–170ms

```typescript
const wave = (Math.sin(phase) * 0.5 + 0.5);
const open = Math.min(1, 0.25 + wave * 0.55 + energy * 0.4);
target[activeOpen] = open;
target[activeClosed] = (1 - wave) * 0.35;  // Closure snap
```

Voice preference: de-CH → de → en-GB → system default.

**Fallback (no TTS available):** Estimates duration as `400 + text.length * 45`ms, still animates mouth.

### Frame-Level Application

```typescript
// useFrame in Avatar.tsx — every render frame
driver.update(dt);

for (const t of targets) {
  if (t.name.startsWith("viseme_")) {
    t.mesh.morphTargetInfluences![t.index] = driver.visemes[t.name] ?? 0;
  }
}
```

Morph targets collected once on mount via `collectMorphTargets()` — traverses scene graph, builds `{ mesh, index, name }` tuples.

---

## 4. Animation System

### The Two Clips

| Clip Name | Behavior | Transition |
|-----------|----------|------------|
| `BreathingIdle` | Default loop, always playing | `setLoop(LoopRepeat)` on mount |
| `Waving` | Plays while `speaking=true` | `crossFadeFrom(idle, 0.4s)` |

**Critical pattern:** `BreathingIdle` never stops. When speaking starts, `Waving` crossfades FROM idle. When speaking ends, idle crossfades FROM wave. This prevents T-pose flashes.

```typescript
// On speaking start
wave.setLoop(THREE.LoopRepeat, Infinity).reset().play();
wave.crossFadeFrom(idle, 0.4, true);

// On speaking end
idle.reset().play();
idle.crossFadeFrom(wave, 0.4, true);
```

### Blink System

Random blink interval: 1.6–5.1 seconds. Sine-shaped eyelid movement.

```typescript
b.closing = Math.max(0, b.closing - dt * 9);
const blinkVal = Math.sin(Math.min(1, b.closing) * Math.PI);
// Applied to all BLINK_TARGETS morph targets
```

---

## 5. Scene & Lighting

### 3-Point Studio Lighting (portrait-optimised)

```typescript
// Key light — warm, upper-left softbox
directionalLight({ position: [-1.5, 4, 3], intensity: 1.6, color: "#fff5e8" })

// Fill light — cool blue from right, softens shadows
directionalLight({ position: [3, 2, -1], intensity: 0.55, color: "#c8d8ff" })

// Rim / back light — separates avatar from dark background
directionalLight({ position: [0, 3, -4], intensity: 0.9, color: "#a0b8ff" })

// Ambient — very subtle to keep shadows readable
ambientLight({ intensity: 0.18, color: "#e8eeff" })

// Face fill — brighter while speaking (0.5 → 1.4)
pointLight({ position: [0, 0.6, 1.8], intensity: speaking ? 1.4 : 0.5, distance: 4 })

// Floor bounce
pointLight({ position: [0, -1.2, 1.0], intensity: 0.15, color: "#dde8ff", distance: 3 })
```

### IBL Environment

```typescript
<Environment preset="city" environmentIntensity={0.4} backgroundBlurriness={1} />
```

City preset gives sharp reflections on skin, fabric, and hair without requiring a custom HDR.

### Rendering Settings

- Tone mapping: `ACESFilmicToneMapping` (cinematic, skin-flattering)
- Color space: `SRGBColorSpace`
- DPR: `[1, 1.5]` (capped for mobile performance)
- Anti-aliasing: enabled

---

## 6. AR Mode (WebXR)

The scene supports AR via `@react-three/xr` with immersive-ar session mode.

```typescript
// AR avatar placement: 1.4m ahead, floor level
<group position={[0, -1.0, -1.4]}>
  <Avatar ... />
  {/* Ground ring so user sees where avatar stands */}
  <mesh rotation={[-Math.PI/2, 0, 0]}>
    <ringGeometry args={[0.28, 0.34, 48]} />
    <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} />
  </mesh>
</group>
```

WebGL context loss recovery: when the app is backgrounded on mobile, the canvas is remounted via `window.dispatchEvent(new CustomEvent("twin-scene-context-restored"))`.

Loading state: `useProgress()` inside Canvas provides `progress` (0–100) and `active` flag, shown as a thin white bar via `Html` component.

---

## 7. The AI Twin Backend

### What the Twin Knows

The backend `twinReply()` function (`advisory/twin.ts`) builds a system prompt containing:

- Client name, archetype, domicile, timezone
- Communication style and tone profile (analytical / values-led / relationship-led)
- Top 5 CRM notes (chronological)
- Up to 10 timeline events (life events, meetings, trades)
- DNA values, sensitivities, dos/don'ts
- Open promises and sensitive topics
- RM name (for role-play framing)

### Role-Play Framing

```
You are roleplaying as {clientName} for a private banking rehearsal session.
The RM is practising how to present a recommendation to you.

Your personality:
- Archetype: {archetype}
- Communication: {commsStyle}
...

Stay in character. Respond as {firstName} would — not as an AI assistant.
```

The LLM (Phoeniqs / Claude-compatible) generates responses that match the client's real communication style and known sensitivities.

---

## 8. ElevenLabs Conversational AI — Proactive Phone Calls

### Architecture

```
Dashboard event detected
  → buildClientContext(clientId, alertId)     # DNA + alert + portfolio
  → conversation_config_override built         # Client-specific prompt
  → POST /v1/convai/twilio/outbound-call       # ElevenLabs API
  → ElevenLabs dials RM via Twilio
  → Two-way voice conversation begins
  → RM responds verbally, AI adapts in real-time
```

### Required Infrastructure

| Resource | What it is |
|----------|-----------|
| ElevenLabs account | Conversational AI enabled (Creator plan+) |
| ElevenLabs Agent | Pre-configured with base system prompt + Charlie voice |
| Phone number | Twilio number registered with ElevenLabs via `/v1/convai/phone-numbers` |
| Twilio account | For call routing (SID + Auth Token) |
| Backend public URL | For MP3 serving in Twilio fallback mode |

### The API Call

```typescript
POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
Headers: { "xi-api-key": ELEVENLABS_CONVAI_API_KEY }

Body: {
  agent_id: "agent_xxx",
  agent_phone_number_id: "phnum_xxx",
  to_number: "+41764436995",

  conversation_config_override: {
    agent: {
      first_message: "Hi, this is Agent Angelo. I'm calling about Hubertus Schneider — there's an urgent portfolio situation. Do you have two minutes?",
      prompt: {
        prompt: `Focus ONLY on Hubertus Schneider.
                 Event: Novartis shutting neurology R&D
                 Alert: Roche Holding AG conflicts with client values
                 Holding: Roche Holding AG (CHF 112k, 0.5% of portfolio)
                 DNA: Funding neurodegenerative-disease research (daughter Chloe)
                 Action: Recommend swap into Pfizer Inc.
                 Rules: max 2-3 sentences, cite numbers, end when RM confirms action`
      }
    }
  }
}
```

The `conversation_config_override` makes each call specific to one client — the base agent handles generic interactions, the override injects real context per call.

### Fallback: Twilio One-Way MP3

If ConvAI is not configured:
1. Phoeniqs LLM generates a ~5-sentence spoken script
2. ElevenLabs TTS synthesizes it as MP3 (Charlie voice, `eleven_turbo_v2_5`)
3. MP3 saved to `/tmp/angelo-{callId}.mp3`
4. Backend serves it publicly at `/api/calls/audio/:callId`
5. Twilio `<Play>` TwiML plays it on the call

---

## 9. TTS for Avatar Speech (Frontend)

ElevenLabs TTS is proxied through the backend to keep the API key server-side:

```
Frontend: fetch(`/api/tts`, { method: "POST", body: { text } })
  → Backend: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
  → Streams audio/mpeg back to frontend
  → Frontend: URL.createObjectURL(blob)
  → AudioFileDriver.playFile(url)
  → Real-time lipsync via Web Audio analyser
```

Voice: **Charlie** (`IKne3meq5aSn9XLyUdCD`) — young, confident male, designed for assistants.
Model: `eleven_turbo_v2_5` (lowest latency, highest realism).
Settings: stability 0.45, similarity_boost 0.82, style 0.3.

---

## 10. Microphone Input (STT)

Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) captures voice input:

```typescript
const rec = new SpeechRecognition();
rec.lang = "en-US";
rec.interimResults = false;
rec.maxAlternatives = 1;

rec.onresult = (e) => {
  const transcript = e.results[0][0].transcript;
  send(transcript);   // Goes to AI twin backend
};
```

Requires HTTPS (microphone permissions blocked on HTTP). Pulsing red animation on recording button.

---

## 11. What to Build Next — XR Platform Architecture

### Core Modules to Extract

| Module | Files | Reuse |
|--------|-------|-------|
| Lipsync engine | `lipsync.ts`, `visemes.ts` | Drop-in — framework agnostic |
| Avatar renderer | `Avatar.tsx`, `TwinScene.tsx` | Depends on R3F |
| Proactive call system | `proactive-call.service.ts` | Node.js backend module |
| AI twin persona | `advisory/twin.ts` | Any OpenAI-compatible LLM |
| Avatar pipeline | Blender + Mixamo scripts | Artist workflow |

### Architecture for a Standalone XR Product

```
XR Platform
├── Avatar Service
│   ├── GLB asset store (S3 / CDN)
│   ├── Real-time lipsync (AudioFileDriver)
│   ├── Animation blending (BreathingIdle + expressions)
│   └── WebXR placement (AR mode)
│
├── Voice Service
│   ├── ElevenLabs ConvAI (outbound calls)
│   ├── ElevenLabs TTS (frontend speech)
│   ├── Web Speech API (STT input)
│   └── Twilio (PSTN routing)
│
├── AI Persona Service
│   ├── System prompt builder (per person/scenario)
│   ├── Phoeniqs / Claude / GPT-4 backend
│   ├── Conversation history store
│   └── Scenario library (rehearsal scripts)
│
└── XR Frontend
    ├── Three.js / R3F canvas
    ├── WebXR (AR/VR sessions)
    ├── Multiplayer (WebSocket sync)
    └── Recording / playback
```

### Key Differentiators vs Xara

| Xara | This System |
|------|-------------|
| Pre-scripted video actors | Live AI personas, data-driven |
| Fixed scenarios | Dynamic — grounded in real client/user data |
| No real-time interaction | Two-way voice conversation |
| No AR | WebXR AR placement |
| Closed platform | Open, extensible, self-hostable |
| No lipsync | Real-time phoneme-level morph targets |

### Suggested Next Steps

1. **Extract** lipsync + avatar renderer into an npm package
2. **Add phoneme-to-viseme mapping** from Gentle/Montreal Forced Aligner for precise lipsync
3. **Add facial expression layer** (happy, concerned, thinking) via additional morph targets
4. **Multiplayer** — sync `visemes` map over WebRTC data channel for shared sessions
5. **Custom voice cloning** — ElevenLabs voice clone from 3 minutes of audio
6. **Blender MCP** — generate avatar animations via text prompt using Blender's Python API exposed as MCP tool

---

## Appendix: Environment Variables

```bash
# ElevenLabs TTS (frontend avatar speech)
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=IKne3meq5aSn9XLyUdCD   # Charlie

# ElevenLabs ConvAI (outbound phone calls)
ELEVENLABS_CONVAI_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_PHONE_NUMBER_ID=phnum_...

# Twilio (call routing)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
RM_PHONE_NUMBER=+41...

# Backend public URL (for MP3 serving in fallback mode)
BACKEND_PUBLIC_URL=https://agentangelo.finance
```

---

*This document describes the implementation as of AgentAngelo v1.0 (SwissHacks 2026). For the latest code, see the [GitHub repository](https://github.com/Zaniyar/SIX_finance_AgentAngelo).*
