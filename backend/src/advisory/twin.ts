import { PhoeniqsService, ChatMessage } from "../services/phoeniqs.service";
import { getCrm } from "../data/loader";
import { Client, ClientDna } from "../shared/types";

/**
 * The "digital twin": Phoeniqs role-plays the client so the RM can rehearse a
 * conversation BEFORE meeting them. This is a private RM tool — the twin is
 * explicitly NOT giving advice to the real client (that boundary is in the brief).
 */
export async function twinReply(
  client: Client,
  dna: ClientDna,
  history: ChatMessage[],
  phoeniqs: PhoeniqsService
): Promise<string> {
  const recentCrm = getCrm(client.id)
    .slice(-8)
    .map((n) => `- [${(n.date || "").slice(0, 10)}] ${n.note}`)
    .join("\n");

  const system =
    `You are a DIGITAL TWIN of a private-banking client, used by their relationship manager to rehearse a ` +
    `conversation before a real meeting. Stay fully in character as the client. Be realistic, not a yes-man: ` +
    `react according to the client's values and personality, push back where they would.\n\n` +
    `You are: ${client.displayName}.\n` +
    `Who you are: ${dna.summary}\n` +
    `Your values: ${dna.values.join("; ")}\n` +
    `Your context: ${dna.context.join("; ")}\n` +
    `Your preferences/aversions: ${dna.preferences.join("; ")}\n` +
    `How you communicate: ${dna.commsStyle}\n\n` +
    `Recent relationship history:\n${recentCrm}\n\n` +
    `Speak in first person as the client. Keep replies to 2-4 sentences, conversational, suitable to be read ` +
    `aloud. Never break character or mention that you are an AI or a twin.`;

  const messages: ChatMessage[] = [{ role: "system", content: system }, ...history];
  return phoeniqs.chat(messages, { temperature: 0.7, maxTokens: 2000 });
}
