import axios, { AxiosInstance } from "axios";
import { IntegrationProbe } from "../shared/types";
import { maskToken, preview } from "./probe";

// Phoeniqs provides the hackathon LLM credits via an OpenAI-compatible API.
const DEFAULT_PHOENIQS_URL = "https://maas.phoeniqs.com/v1";
const DEFAULT_MODEL = "inference-gpt-oss-120b";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class PhoeniqsService {
  private client: AxiosInstance;
  private model: string;
  private readonly baseUrl: string;
  private readonly authPreview: string;
  readonly configured: boolean;

  constructor() {
    const apiKey = process.env.PHOENIQS_API_KEY || "";
    this.baseUrl = process.env.PHOENIQS_API_URL || DEFAULT_PHOENIQS_URL;
    this.model = process.env.PHOENIQS_MODEL || DEFAULT_MODEL;
    this.authPreview = maskToken(apiKey);
    this.configured = Boolean(apiKey) && !apiKey.startsWith("your_");

    if (!this.configured) {
      console.warn("[Phoeniqs] API key not configured; set PHOENIQS_API_KEY");
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      timeout: 60000,
    });
  }

  /** Generic chat completion. Returns the assistant message text. */
  async chat(messages: ChatMessage[], opts: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
    if (!this.configured) {
      throw new Error("[Phoeniqs] not configured: set PHOENIQS_API_KEY in .env");
    }
    try {
      const { data } = await this.client.post("/chat/completions", {
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 2000,
      });
      const msg = data?.choices?.[0]?.message;
      // Reasoning models (o1-style) put the final answer in content; if null,
      // fall back to reasoning_content so we still get a usable response.
      return msg?.content ?? msg?.reasoning_content ?? "";
    } catch (error) {
      const ax = error as { response?: { data?: { error?: { message?: string } } } };
      const msg = ax.response?.data?.error?.message || (error as Error).message;
      throw new Error(`[Phoeniqs] ${msg}`);
    }
  }

  /** Chat that must return JSON; tolerates prose/markdown-fenced wrappers. */
  async chatJson<T>(messages: ChatMessage[], opts: { temperature?: number; maxTokens?: number } = {}): Promise<T> {
    const content = await this.chat(messages, { temperature: opts.temperature ?? 0.2, maxTokens: opts.maxTokens });
    return this.parseJson<T>(content);
  }

  private parseJson<T>(content: string): T {
    try {
      return JSON.parse(content) as T;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as T;
        } catch {
          /* fall through */
        }
      }
      throw new Error(`[Phoeniqs] could not parse JSON response: ${content.slice(0, 160)}`);
    }
  }

  /** Liveness check (reused probe pattern). */
  async ping(): Promise<IntegrationProbe> {
    const started = Date.now();
    const request = { method: "GET", url: `${this.baseUrl}/models`, headers: { Authorization: this.authPreview } };
    if (!this.configured) {
      return { name: "Phoeniqs LLM API", configured: false, ok: false, durationMs: 0, request, error: "PHOENIQS_API_KEY not set" };
    }
    try {
      const res = await this.client.get("/models");
      return { name: "Phoeniqs LLM API", configured: true, ok: true, durationMs: Date.now() - started, request, response: { status: res.status, body: preview(res.data) } };
    } catch (error) {
      const ax = error as { response?: { status?: number; data?: unknown } };
      return {
        name: "Phoeniqs LLM API",
        configured: true,
        ok: false,
        durationMs: Date.now() - started,
        request,
        response: ax.response ? { status: ax.response.status, body: preview(ax.response.data) } : undefined,
        error: (error as Error).message,
      };
    }
  }
}
