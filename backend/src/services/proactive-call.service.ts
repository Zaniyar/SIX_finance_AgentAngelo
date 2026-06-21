import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import twilio from "twilio";
import { PhoeniqsService, ChatMessage } from "./phoeniqs.service";
import { getClient, getPortfolio } from "../data/loader";
import { buildAlerts } from "../advisory/alerts";
import { buildDna } from "../advisory/dna";
import { appendAuditLog } from "../advisory/evidence";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "IKne3meq5aSn9XLyUdCD"; // Charlie — young confident male
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID ?? "";
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET ?? "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";
const RM_PHONE_NUMBER = process.env.RM_PHONE_NUMBER ?? "";
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL ?? "http://localhost:3001";

export interface CallRecord {
  callId: string;
  alertId: string;
  clientId: string;
  clientName: string;
  alertTitle: string;
  script: string;
  twilioSid: string | null;
  status: "pending" | "calling" | "in-progress" | "completed" | "failed";
  error?: string;
  calledAt: string;
}

// In-memory store of recent calls (last 20)
const callHistory: CallRecord[] = [];

export function getLastCall(): CallRecord | null {
  return callHistory[callHistory.length - 1] ?? null;
}

export function getCallById(callId: string): CallRecord | null {
  return callHistory.find((c) => c.callId === callId) ?? null;
}

export function getAudioPath(callId: string): string {
  return path.join("/tmp", `angelo-${callId}.mp3`);
}

async function generateCallScript(
  clientId: string,
  alertId: string,
  phoeniqs: PhoeniqsService,
  ctx?: ClientContext
): Promise<{ script: string }> {
  // If ctx already built, reuse it; otherwise build fresh
  const c = ctx ?? await buildClientContext(clientId, alertId, phoeniqs);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are Agent Angelo, an AI wealth management assistant. " +
        "Write a short, natural, human-sounding phone call script (spoken out loud). " +
        "Max 5 sentences. Start with 'Hi, this is Agent Angelo calling on behalf of your advisory team.' " +
        "Then name the client, the event, the specific holding at risk, the DNA/values angle, and a concrete next step. " +
        "End warmly. Do NOT use bullet points, markdown, or headers — plain spoken prose only. " +
        "Sound urgent but calm. Be specific with numbers.",
    },
    {
      role: "user",
      content:
        `Client: ${c.clientName}\n` +
        `Event: ${c.event}\n` +
        `Alert: ${c.alertTitle} — ${c.alertBody}\n` +
        `Affected holding: ${c.holdingStr}\n` +
        `DNA hook: ${c.dnaHook}\n` +
        `Swap suggestion: ${c.swapStr}\n` +
        `Write the call script now.`,
    },
  ];

  const script = await phoeniqs.chat(messages, { temperature: 0.6, maxTokens: 200 });
  return { script: script.trim() };
}

async function synthesizeAudio(script: string, callId: string): Promise<void> {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not set");

  const body = JSON.stringify({
    text: script,
    model_id: "eleven_turbo_v2_5",
    voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.3, use_speaker_boost: true },
  });

  const outPath = getAudioPath(callId);

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.elevenlabs.io",
        path: `/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Accept: "audio/mpeg",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errBody = "";
          res.on("data", (d) => (errBody += d));
          res.on("end", () => reject(new Error(`ElevenLabs ${res.statusCode}: ${errBody}`)));
          return;
        }
        const file = fs.createWriteStream(outPath);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Use ElevenLabs ConvAI outbound call (two-way conversation)
const EL_CONVAI_KEY = process.env.ELEVENLABS_CONVAI_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? "";
const EL_AGENT_ID = process.env.ELEVENLABS_AGENT_ID ?? "";
const EL_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID ?? "";

interface ClientContext {
  clientName: string;
  alertTitle: string;
  alertBody: string;
  holdingStr: string;
  swapStr: string;
  dnaHook: string;
  event: string;
}

async function buildClientContext(clientId: string, alertId: string, phoeniqs: PhoeniqsService): Promise<ClientContext> {
  const client = getClient(clientId);
  if (!client) throw new Error(`Unknown client: ${clientId}`);
  const holdings = getPortfolio(client.portfolio);
  const dna = await buildDna(clientId, phoeniqs);
  const { alerts } = buildAlerts(client, dna);
  const alert = alerts.find(a => a.id === alertId) ?? alerts[0];
  if (!alert) throw new Error(`No alert for ${clientId}`);
  const totalChf = holdings.reduce((s, h) => s + h.currentChf, 0);
  const holdingStr = alert.holding
    ? `${alert.holding.issuer} (CHF ${Math.round(alert.holding.currentChf / 1000)}k, ${((alert.holding.currentChf / totalChf) * 100).toFixed(1)}% of portfolio)`
    : "a key position";
  const swapStr = alert.swap ? `Recommend swapping into ${alert.swap.toCandidate.issuer}.` : "";
  return {
    clientName: client.displayName,
    alertTitle: alert.title,
    alertBody: alert.body,
    holdingStr,
    swapStr,
    dnaHook: client.scenario.dnaHook,
    event: client.scenario.event,
  };
}

async function placeCall(_callId: string, ctx?: ClientContext): Promise<string> {
  if (!RM_PHONE_NUMBER) throw new Error("RM_PHONE_NUMBER not set");

  // Prefer ElevenLabs ConvAI (two-way), fall back to Twilio one-way
  if (EL_CONVAI_KEY && EL_AGENT_ID && EL_PHONE_NUMBER_ID) {
    const body: Record<string, unknown> = {
      agent_id: EL_AGENT_ID,
      agent_phone_number_id: EL_PHONE_NUMBER_ID,
      to_number: RM_PHONE_NUMBER,
    };

    // Override system prompt and first message with client-specific context
    if (ctx) {
      body.conversation_config_override = {
        agent: {
          first_message: `Hi, this is Agent Angelo. I'm calling about ${ctx.clientName} — there's an urgent portfolio situation. Do you have two minutes?`,
          prompt: {
            prompt:
              `You are Agent Angelo, an AI wealth management assistant at a Swiss private bank.\n` +
              `You are calling the Relationship Manager about ONE specific client: ${ctx.clientName}.\n\n` +
              `SITUATION:\n` +
              `- Event: ${ctx.event}\n` +
              `- Alert: ${ctx.alertTitle} — ${ctx.alertBody}\n` +
              `- Affected position: ${ctx.holdingStr}\n` +
              `- Client DNA / values angle: ${ctx.dnaHook}\n` +
              `- Recommended action: ${ctx.swapStr || "Review urgently with the client."}\n\n` +
              `RULES:\n` +
              `- Focus ONLY on ${ctx.clientName} — do not mention other clients unless asked\n` +
              `- Max 2-3 sentences per response\n` +
              `- Always cite the specific number (CHF or %)\n` +
              `- Sound like a smart colleague, not a robot\n` +
              `- End the call when the RM confirms they will act`,
          },
        },
      };
    }

    const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
      method: "POST",
      headers: { "xi-api-key": EL_CONVAI_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`ElevenLabs ConvAI ${res.status}: ${await res.text()}`);
    const json = await res.json() as { callSid?: string; conversation_id?: string };
    return json.callSid ?? json.conversation_id ?? "convai-call";
  }

  // Fallback: Twilio one-way MP3 playback
  if (!TWILIO_ACCOUNT_SID) throw new Error("No call provider configured");
  const audioUrl = `${BACKEND_PUBLIC_URL}/api/calls/audio/${_callId}`;
  const twiml = `<Response><Play>${audioUrl}</Play></Response>`;
  const client = TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET
    ? twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, { accountSid: TWILIO_ACCOUNT_SID })
    : twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const call = await client.calls.create({ to: RM_PHONE_NUMBER, from: TWILIO_FROM_NUMBER, twiml });
  return call.sid;
}

async function pollCallStatus(twilioSid: string): Promise<string> {
  if (twilioSid === "convai-call" || twilioSid.startsWith("conv_")) return "completed";
  try {
    const client = TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET
      ? twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, { accountSid: TWILIO_ACCOUNT_SID })
      : twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const call = await client.calls(twilioSid).fetch();
    return call.status;
  } catch { return "completed"; }
}

export async function triggerCall(
  clientId: string,
  alertId: string,
  phoeniqs: PhoeniqsService
): Promise<CallRecord> {
  const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const record: CallRecord = {
    callId,
    alertId,
    clientId,
    clientName: "",
    alertTitle: "",
    script: "",
    twilioSid: null,
    status: "pending",
    calledAt: new Date().toISOString(),
  };

  callHistory.push(record);
  if (callHistory.length > 20) callHistory.shift();

  try {
    record.status = "calling";

    // 1. Build client context (used for ConvAI override + fallback script)
    const ctx = await buildClientContext(clientId, alertId, phoeniqs);
    record.clientName = ctx.clientName;
    record.alertTitle = ctx.alertTitle;

    // 2. Generate script (for fallback one-way audio only)
    const { script } = await generateCallScript(clientId, alertId, phoeniqs, ctx);
    record.script = script;
    console.log(`[Angelo] Script for ${ctx.clientName}:\n${script}\n`);

    // 3. Synthesize audio (used only in fallback Twilio path)
    await synthesizeAudio(script, callId);
    console.log(`[Angelo] Audio saved → /tmp/angelo-${callId}.mp3`);

    // 4. Place call — pass ctx so ConvAI gets client-specific prompt
    const twilioSid = await placeCall(callId, ctx);
    record.twilioSid = twilioSid;
    record.status = "in-progress";
    console.log(`[Angelo] Call placed → Twilio SID ${twilioSid}`);

    // 5. Audit log
    appendAuditLog({
      actor_id: "agent-angelo",
      action: "PROACTIVE_CALL_TRIGGERED",
      object_type: "call",
      object_id: alertId,
      content: `${ctx.clientName}|${ctx.alertTitle}|${script}`,
      evidence_ids: [],
      note: `Called RM about ${ctx.clientName}: ${ctx.alertTitle}. Script length: ${script.length} chars.`,
    });

    // 5. Poll for completion in background (non-blocking)
    pollUntilDone(record, twilioSid);
  } catch (err) {
    record.status = "failed";
    record.error = (err as Error).message;
    console.error(`[Angelo] Call failed:`, err);
  }

  return record;
}

function pollUntilDone(record: CallRecord, twilioSid: string) {
  let attempts = 0;
  const timer = setInterval(async () => {
    try {
      const status = await pollCallStatus(twilioSid);
      if (status === "completed" || status === "busy" || status === "failed" || status === "no-answer" || status === "canceled") {
        record.status = status === "completed" ? "completed" : "failed";
        if (status !== "completed") record.error = `Call ended with status: ${status}`;
        clearInterval(timer);
        console.log(`[Angelo] Call ${twilioSid} → ${status}`);
      }
    } catch (e) {
      attempts++;
      if (attempts > 12) { // give up after 2 min
        record.status = "failed";
        record.error = "Status polling timed out";
        clearInterval(timer);
      }
    }
  }, 10_000);
}
