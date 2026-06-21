/**
 * Watchdog — monitors alert priority and proactively calls the RM when:
 *   1. A client has an alert with priority_score >= CALL_THRESHOLD
 *   2. The RM has been offline for >= OFFLINE_MINUTES_THRESHOLD minutes
 *   3. Market hours (08:00–18:00 CET, Mon–Fri)
 *   4. The same alert has not triggered a call within COOLDOWN_MS
 */
import { getClients, getPortfolio } from "../data/loader";
import { buildAlerts } from "./alerts";
import { buildDna } from "./dna";
import { computeClientScores } from "./scoring";
import { PhoeniqsService } from "../services/phoeniqs.service";
import { triggerCall } from "../services/proactive-call.service";
import { getRmLastSeen } from "../middleware/rm-activity";
import { POLICY } from "../config/policy";

const CALL_THRESHOLD = POLICY.alert.priorityCritical; // 85
const OFFLINE_MINUTES_THRESHOLD = 15;
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const CHECK_INTERVAL_MS = 60_000; // 1 minute

// Track when each alert last triggered a call
const callCooldowns = new Map<string, number>();

let phoeniqs: PhoeniqsService | null = null;

function isMarketHours(): boolean {
  // CET = UTC+1 (winter) / UTC+2 (summer) — approximate with UTC+1
  const now = new Date();
  const cetOffset = 60; // minutes, approximate
  const cetMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + cetOffset) % (24 * 60);
  const cetHour = cetMinutes / 60;
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat
  return dayOfWeek >= 1 && dayOfWeek <= 5 && cetHour >= 8 && cetHour < 18;
}

function isRmOffline(): boolean {
  const lastSeen = getRmLastSeen("rm1");
  if (lastSeen === null) return true; // never seen = offline
  const diffMs = Date.now() - lastSeen;
  return diffMs > OFFLINE_MINUTES_THRESHOLD * 60 * 1000;
}

function isOnCooldown(alertId: string): boolean {
  const last = callCooldowns.get(alertId);
  return last !== undefined && Date.now() - last < COOLDOWN_MS;
}

async function checkAndCall() {
  if (!isMarketHours()) return;
  if (!isRmOffline()) return;
  if (!phoeniqs) return;

  const clients = getClients();

  for (const client of clients) {
    try {
      const holdings = getPortfolio(client.portfolio);
      if (!holdings.length) continue;

      const dna = await buildDna(client.id, phoeniqs);
      const { alerts } = buildAlerts(client, dna);
      if (!alerts.length) continue;

      const portfolioValue = holdings.reduce((s, h) => s + h.currentChf, 0);
      const scores = computeClientScores(dna, holdings, alerts[0], portfolioValue);

      const highPriorityAlert = alerts.find(
        (a, i) => i === 0 && scores.alert_priority_score >= CALL_THRESHOLD
      );

      if (!highPriorityAlert) continue;
      if (isOnCooldown(highPriorityAlert.id)) continue;

      console.log(
        `[Watchdog] High priority alert (${scores.alert_priority_score}) for ${client.displayName} — RM offline — triggering call`
      );

      callCooldowns.set(highPriorityAlert.id, Date.now());
      await triggerCall(client.id, highPriorityAlert.id, phoeniqs);

      // Only call for the highest-priority client per cycle to avoid spam
      break;
    } catch (err) {
      console.error(`[Watchdog] Error checking client ${client.id}:`, err);
    }
  }
}

export function startWatchdog(phoeniqsService: PhoeniqsService) {
  phoeniqs = phoeniqsService;
  console.log(
    `[Watchdog] Started — checking every ${CHECK_INTERVAL_MS / 1000}s, ` +
    `call threshold: ${CALL_THRESHOLD}, offline threshold: ${OFFLINE_MINUTES_THRESHOLD}min`
  );
  setInterval(() => { checkAndCall().catch(console.error); }, CHECK_INTERVAL_MS);
}
