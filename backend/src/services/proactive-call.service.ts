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
  phoeniqs: PhoeniqsService
): Promise<{ script: string; clientName: string; alertTitle: string }> {
  const client = getClient(clientId);
  if (!client) throw new Error(`Unknown client: ${clientId}`);

  const holdings = getPortfolio(client.portfolio);
  const dna = await buildDna(clientId, phoeniqs);
  const { alerts } = buildAlerts(client, dna);
  const alert = alerts.find((a) => a.id === alertId) ?? alerts[0];
  if (!alert) throw new Error(`No alert found for client ${clientId}`);

  const holdingStr = alert.holding
    ? `${alert.holding.issuer} (CHF ${Math.round(alert.holding.currentChf / 1000)}k, ${((alert.holding.currentChf / holdings.reduce((s, h) => s + h.currentChf, 0)) * 100).toFixed(1)}% of portfolio)`
    : "a key position";

  const swapStr = alert.swap
    ? `I recommend swapping into ${alert.swap.toCandidate.issuer}.`
    : "";

  const dnaHook = client.scenario.dnaHook;

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
        `Client: ${client.displayName}\n` +
        `Event: ${client.scenario.event}\n` +
        `Alert: ${alert.title} — ${alert.body}\n` +
        `Affected holding: ${holdingStr}\n` +
        `DNA hook: ${dnaHook}\n` +
        `Swap suggestion: ${swapStr}\n` +
        `Write the call script now.`,
    },
  ];

  const script = await phoeniqs.chat(messages, { temperature: 0.6, maxTokens: 200 });

  return {
    script: script.trim(),
    clientName: client.displayName,
    alertTitle: alert.title,
  };
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

async function placeCall(callId: string): Promise<string> {
  if (!TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID not set");
  if (!RM_PHONE_NUMBER) throw new Error("RM_PHONE_NUMBER not set");

  const audioUrl = `${BACKEND_PUBLIC_URL}/api/calls/audio/${callId}`;
  const twiml = `<Response><Play>${audioUrl}</Play></Response>`;

  // Use API Key + Secret if available (recommended), fall back to Auth Token
  const client = TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET
    ? twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, { accountSid: TWILIO_ACCOUNT_SID })
    : twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const call = await client.calls.create({
    to: RM_PHONE_NUMBER,
    from: TWILIO_FROM_NUMBER,
    twiml,
  });

  return call.sid;
}

async function pollCallStatus(twilioSid: string): Promise<string> {
  const client = TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET
    ? twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, { accountSid: TWILIO_ACCOUNT_SID })
    : twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const call = await client.calls(twilioSid).fetch();
  return call.status;
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

    // 1. Generate script
    const { script, clientName, alertTitle } = await generateCallScript(clientId, alertId, phoeniqs);
    record.script = script;
    record.clientName = clientName;
    record.alertTitle = alertTitle;

    console.log(`[Angelo] Script for ${clientName}:\n${script}\n`);

    // 2. Synthesize audio
    await synthesizeAudio(script, callId);
    console.log(`[Angelo] Audio saved → /tmp/angelo-${callId}.mp3`);

    // 3. Place call
    const twilioSid = await placeCall(callId);
    record.twilioSid = twilioSid;
    record.status = "in-progress";
    console.log(`[Angelo] Call placed → Twilio SID ${twilioSid}`);

    // 4. Audit log
    appendAuditLog({
      actor_id: "agent-angelo",
      action: "PROACTIVE_CALL_TRIGGERED",
      object_type: "call",
      object_id: alertId,
      content: `${clientName}|${alertTitle}|${script}`,
      evidence_ids: [],
      note: `Called RM about ${clientName}: ${alertTitle}. Script length: ${script.length} chars.`,
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
