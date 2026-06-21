import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppShell } from "@/components/app-shell";
import { Sparkles, Send, AlertTriangle, FlaskConical, Users, ExternalLink } from "lucide-react";
import { marketEvents } from "@/lib/mock-data";
import { api, ClientSummary } from "@/lib/api";

const CLIENT_REC_ID: Record<string, string> = {
  schneider: "r-1",
  huber: "r-2",
  raeber: "r-3",
  ammann: "r-4",
};

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "Copilot, AURA" }, { name: "description", content: "Reason across your entire book." }] }),
  component: CopilotPage,
});

const SUGGESTIONS = [
  "Amazon EU warehouse-labour investigation just broke, which clients are exposed and how should I reach each one?",
  "If oil drops 15% next week, who is most at risk and what should I propose?",
  "Which clients have unaddressed ESG concerns in their portfolios?",
  "Draft a one-paragraph note for clients holding NVIDIA after the concentration breach.",
];

interface Citation { api_endpoint: string; field: string; value: string; client_id?: string; }
interface OpaResult { allow: boolean; reasons: string[]; obligations: string[]; }
interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  grounding_warnings?: string[];
  opa?: OpaResult;
}

function CopilotPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendClients, setBackendClients] = useState<ClientSummary[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { api.clients().then(setBackendClients).catch(() => {}); }, []);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const submit = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setError(null);

    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      // Read the SSE stream and pick up the { reply } payload
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      let citations: Msg["citations"] = undefined;
      let grounding_warnings: Msg["grounding_warnings"] = undefined;
      let opa: Msg["opa"] = undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.error) throw new Error(payload.error);
              if (payload.reply) {
                reply = payload.reply;
                citations = payload.citations;
                grounding_warnings = payload.grounding_warnings;
                opa = payload.opa;
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") throw parseErr;
            }
          }
        }
      }

      if (reply) {
        // Add assistant message with all metadata in one atomic update
        setMessages(prev => [...prev, {
          role: "assistant" as const,
          content: reply,
          citations,
          grounding_warnings,
          opa,
        }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, busy]);

  // Derive affected clients from last assistant message
  const lastReply = [...messages].reverse().find(m => m.role === "assistant")?.content ?? "";
  const mentionedClients = backendClients.filter(c =>
    lastReply.toLowerCase().includes(c.name.toLowerCase()) ||
    lastReply.toLowerCase().includes((c.displayName ?? "").toLowerCase())
  );

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Copilot" }]}>
      <div className="grid grid-cols-[1fr_320px] gap-8">
        {/* Chat column */}
        <div className="flex flex-col h-[calc(100vh-180px)] bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/40 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-display text-xl tracking-tight">Copilot</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reasoning across {backendClients.length || 4} clients · {2} open recs · live events
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-background border border-border text-muted-foreground">Beta</span>
          </div>

          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="max-w-2xl mx-auto text-center py-10">
                <div className="inline-flex w-12 h-12 rounded-full bg-accent/10 items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <h2 className="font-display text-3xl tracking-tight mb-2">How can I help across your book?</h2>
                <p className="text-sm text-muted-foreground mb-6">Ask about a company, an event, a theme. I'll pull the affected clients, exposures, and suggested actions.</p>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => submit(s)} className="text-sm border border-border rounded-md px-4 py-3 hover:bg-secondary/40 transition text-left">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => <Message key={i} m={m} clients={backendClients} navigate={navigate} />)}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Thinking…
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded p-3">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
            className="border-t border-border p-3 flex items-end gap-2 bg-background"
          >
            <textarea
              ref={inputRef} rows={1} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
              placeholder="Ask across your book of clients…"
              className="flex-1 resize-none px-4 py-2.5 text-sm bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button type="submit" disabled={busy || !input.trim()}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm flex items-center gap-2 disabled:opacity-40 hover:opacity-90 transition">
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          {/* Affected clients — real backend, detected from last AI reply */}
          {mentionedClients.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Users className="w-3.5 h-3.5" /> Affected clients
              </div>
              <div className="space-y-2">
                {mentionedClients.map(c => (
                  <Link
                    key={c.id}
                    to="/recommendations/$id"
                    params={{ id: CLIENT_REC_ID[c.id] ?? c.id }}
                    className="flex items-center gap-3 p-2.5 border border-border rounded-md hover:bg-secondary/40 transition group"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.direction === "conflict" ? "bg-destructive" : "bg-positive"}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{c.displayName}</div>
                      <div className="text-[11px] text-muted-foreground">{c.mandate} · {c.location.city}</div>
                    </div>
                    <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${c.direction === "conflict" ? "bg-destructive/10 text-destructive" : "bg-positive/10 text-positive"}`}>
                      {c.direction === "conflict" ? "Action" : "Opp"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5" /> Live alerts
            </div>
            {marketEvents.map((e) => (
              <button key={e.id}
                onClick={() => submit(`Brief me on "${e.title}". Who is affected, in urgency order, and what should I do?`)}
                className="text-left w-full mt-2 p-3 border border-border rounded-md hover:bg-secondary/40 transition">
                <div className="text-sm font-medium leading-snug">{e.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{e.affected.length} clients exposed · {e.severity}</div>
              </button>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <FlaskConical className="w-3.5 h-3.5" /> Scenarios
            </div>
            <div className="space-y-2 text-sm">
              {["Oil −15% over next week", "USD/CHF +5%", "ECB hikes 50bps"].map((s) => (
                <button key={s}
                  onClick={() => submit(`Scenario: ${s}. Identify exposed clients in my book and propose actions.`)}
                  className="block w-full text-left px-3 py-2 border border-border rounded-md hover:bg-secondary/40 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed px-2">
            Copilot reads your book data live. It does not execute trades or send messages — the RM owns every decision.
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

// Extract per-client action paragraphs from the AI reply.
// Returns segments: either plain markdown text or a detected client action block.
function splitIntoActionBlocks(text: string, clients: ClientSummary[]): Array<
  | { type: "markdown"; content: string }
  | { type: "action"; clientId: string; clientName: string; recId: string; actionText: string; newsSource: string }
> {
  // Split on bullet/numbered client mentions. We look for lines that start a new
  // client section: "**ClientName**" or "### ClientName" etc.
  const segments: ReturnType<typeof splitIntoActionBlocks> = [];
  let remaining = text;

  for (const c of clients) {
    const recId = CLIENT_REC_ID[c.id] ?? c.id;
    // Find the first occurrence of the client's full name in the text
    const nameLower = c.name.toLowerCase();
    const dispLower = (c.displayName ?? "").toLowerCase();
    const idx = remaining.toLowerCase().search(
      new RegExp(`\\*{0,2}${nameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|\\*{0,2}${dispLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")
    );
    if (idx === -1) continue;

    // Extract a block of ~400 chars around/after the name mention as the action text
    const blockStart = Math.max(0, idx - 20);
    const blockEnd = Math.min(remaining.length, idx + 500);
    const block = remaining.slice(blockStart, blockEnd);

    // Pull out a news/source reference from the block (anything after "source:" or "[" citation)
    const sourceMatch = block.match(/source[:\s]+([^\n]{10,80})|reuters|bloomberg|ft\.com|wsj\.com|\[[\w\s]{3,40}\]/i);
    const newsSource = sourceMatch ? sourceMatch[0].replace(/source[:\s]*/i, "").trim() : "";

    // Before this client block, push remaining prefix as markdown
    if (idx > 0) {
      segments.push({ type: "markdown", content: remaining.slice(0, blockStart) });
    }
    segments.push({ type: "action", clientId: c.id, clientName: c.displayName ?? c.name, recId, actionText: block, newsSource });
    remaining = remaining.slice(blockEnd);
  }

  if (remaining.trim()) segments.push({ type: "markdown", content: remaining });
  // If no client blocks were found, return the whole thing as markdown
  if (segments.length === 0) return [{ type: "markdown", content: text }];
  return segments;
}

function Message({ m, clients, navigate }: {
  m: Msg;
  clients: ClientSummary[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser
        ? "max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3"
        : "w-full"
      }>
        {!isUser && (
          <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="w-3 h-3 text-accent" /> Copilot
          </div>
        )}
        {isUser ? (
          <div className="text-sm leading-relaxed">{m.content}</div>
        ) : (
          <>
          <MarkdownBody content={m.content} />
          {/* Action Studio buttons — one per mentioned client */}
          {clients.filter(c =>
            m.content.toLowerCase().includes(c.name.toLowerCase()) ||
            m.content.toLowerCase().includes((c.displayName ?? "").toLowerCase())
          ).map(c => {
            const recId = CLIENT_REC_ID[c.id] ?? c.id;
            // Extract the paragraph(s) most relevant to this client as the draft message seed
            const lines = m.content.split("\n");
            const clientLines = lines.filter(l =>
              l.toLowerCase().includes(c.name.toLowerCase()) ||
              l.toLowerCase().includes((c.displayName ?? "").toLowerCase())
            );
            // Grab up to 3 lines around each mention as context
            const actionText = clientLines.slice(0, 2).join("\n").replace(/[*_#`]/g, "").trim();

            // Find a source/news reference near the client mention
            const sourceMatch = m.content.match(/reuters|bloomberg|ft\.com|wsj\.com|source[:\s]+([^\n]{5,60})/i);
            const newsSource = sourceMatch ? sourceMatch[0].replace(/source[:\s]*/i, "").trim() : "";

            const params = new URLSearchParams();
            if (actionText) params.set("draft", actionText);
            if (newsSource) params.set("source", newsSource);

            return (
              <button
                key={c.id}
                onClick={() => navigate({
                  to: "/recommendations/$id",
                  params: { id: recId },
                  search: { draft: actionText || undefined, source: newsSource || undefined },
                })}
                className="mt-3 flex items-center gap-2 px-3 py-2 text-xs font-medium border border-accent/40 text-accent bg-accent/5 rounded-md hover:bg-accent/15 transition w-full"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Open Message Studio for <strong>{c.displayName ?? c.name}</strong></span>
              </button>
            );
          })}
          {/* OPA grounding warnings */}
          {m.grounding_warnings && m.grounding_warnings.length > 0 && (
            <div className="mt-3 p-2.5 rounded-md border border-destructive/40 bg-destructive/5 space-y-1">
              {m.grounding_warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-destructive">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* OPA policy status */}
          {m.opa && (
            <div className={`mt-2 flex items-center gap-2 text-[10px] px-2.5 py-1.5 rounded border ${m.opa.allow ? "border-positive/30 bg-positive/5 text-positive" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.opa.allow ? "bg-positive" : "bg-destructive"}`} />
              <span className="font-semibold uppercase tracking-wider">{m.opa.allow ? "OPA: Grounded" : "OPA: Policy blocked"}</span>
              {m.opa.reasons.length > 0 && (
                <span className="ml-1 opacity-70">— {m.opa.reasons.join("; ")}</span>
              )}
              {m.opa.obligations.length > 0 && (
                <span className="ml-1 text-amber-600">⚑ {m.opa.obligations.join("; ")}</span>
              )}
            </div>
          )}

          {/* Citation sources */}
          {m.citations && m.citations.length > 0 && (
            <details className="mt-2">
              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition uppercase tracking-wider">
                {m.citations.length} verified source{m.citations.length !== 1 ? "s" : ""}
              </summary>
              <div className="mt-1.5 space-y-1 pl-2 border-l border-border">
                {[...new Map(m.citations.map(c => [`${c.api_endpoint}::${c.field}`, c])).values()].map((c, i) => (
                  <div key={i} className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                    <span className="text-accent">{c.api_endpoint}</span>
                    <span className="text-muted-foreground/60"> → {c.field}</span>
                    {c.value && <span className="text-foreground ml-1">= {c.value}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}
          </>
        )}
      </div>
    </div>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
              h1: ({ children }) => <h1 className="text-base font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-semibold text-foreground mt-4 mb-2 first:mt-0 pb-1 border-b border-border">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-medium text-foreground mt-3 mb-1.5 first:mt-0">{children}</h3>,
              p: ({ children }) => <p className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="text-sm mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="text-sm mb-3 pl-5 space-y-1 list-decimal marker:text-muted-foreground">{children}</ol>,
              li: ({ children, ...props }) => {
                // Inside <ol> the parent renders numbering; inside <ul> we add the dot
                const isOrdered = (props as any).ordered;
                return isOrdered
                  ? <li className="text-sm leading-relaxed text-foreground pl-1">{children}</li>
                  : (
                    <li className="text-sm leading-relaxed text-foreground flex gap-2 items-start">
                      <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      <span>{children}</span>
                    </li>
                  );
              },
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-accent pl-3 my-3 text-sm text-muted-foreground italic">{children}</blockquote>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock
                  ? <pre className="bg-secondary rounded-md p-3 my-3 overflow-x-auto text-xs font-mono"><code>{children}</code></pre>
                  : <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>;
              },
              table: ({ children }) => (
                <div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-secondary/60">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-border/50">{children}</tbody>,
              tr: ({ children }) => <tr className="hover:bg-secondary/30 transition-colors">{children}</tr>,
              th: ({ children }) => (
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2.5 text-sm text-foreground leading-snug align-top">
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
  );
}
