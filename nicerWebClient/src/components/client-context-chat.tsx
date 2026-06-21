import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, ChevronDown, Send } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { api, type IntegrationProbe } from "@/lib/api";
import { useClientPageChat } from "@/components/client-page-chat-context";

const chatIconClass =
  "border-primary/20 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 text-primary";
const chatGlowClass = "from-primary/8 via-transparent to-transparent";

export function ClientContextChat() {
  const {
    client,
    recCount,
    messages,
    busy,
    error,
    input,
    setInput,
    chatOpen,
    setChatOpen,
    submit,
    suggestions,
    inputRef,
    scrollerRef,
  } = useClientPageChat();

  const [probes, setProbes] = useState<IntegrationProbe[]>([]);

  useEffect(() => {
    api.integrations().then((r) => setProbes(r.probes)).catch(() => {});
  }, []);

  const integrationDots = [
    { label: "Phoeniqs", probe: probes.find((p) => /phoeniqs/i.test(p.name)) },
    { label: "SIX MCP", probe: probes.find((p) => /six/i.test(p.name)) },
    { label: "News", probe: probes.find((p) => /news|event/i.test(p.name)) },
  ];

  return (
    <Collapsible
      open={chatOpen}
      onOpenChange={setChatOpen}
      className={cn(
        "group/card relative overflow-hidden rounded-xl border border-border/80 bg-surface/90 backdrop-blur-sm",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-16px_rgba(0,0,0,0.12)]",
        "transition-[box-shadow,border-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_16px_36px_-14px_rgba(0,0,0,0.14)]",
        chatOpen &&
          "translate-y-0 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_24px_48px_-20px_rgba(0,0,0,0.16)] ring-1 ring-primary/15",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", chatGlowClass)} />
      <CollapsibleTrigger
        className={cn(
          "bento-card-trigger relative z-10 flex w-full items-center gap-2.5 text-left transition-colors",
          chatOpen ? "px-3 pb-2 pt-3" : "px-3 py-3",
        )}
      >
        <div
          className={cn(
            "bento-card-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
            chatIconClass,
            "[&_svg]:h-8 [&_svg]:w-8",
            chatOpen && "h-8 w-8 [&_svg]:h-3.5 [&_svg]:w-3.5",
          )}
        >
          <Bot />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Client context</div>
          <div className="font-display flex flex-wrap items-center gap-2 text-xl tracking-tight">
            Chat bot
            {recCount > 1 && <span className="text-xs text-primary">· {recCount} recs</span>}
          </div>
        </div>
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition",
            chatOpen && "rotate-180",
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="relative z-10 p-0 pt-0">
        <div className="border-b border-border px-5 py-2.5 flex flex-wrap items-center gap-3 bg-secondary/20">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live APIs</span>
          {integrationDots.map(({ label, probe }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  probe?.ok ? "bg-positive" : probe?.configured ? "bg-accent animate-pulse" : "bg-muted-foreground/40",
                )}
              />
              {label}
            </span>
          ))}
        </div>

        <div ref={scrollerRef} className="max-h-[320px] overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ask about {client.name.split(" ")[0]}&apos;s profile, recommendations, portfolio, or DNA. Select text on the page and
                right-click → <span className="font-medium text-foreground">Ask AI</span>.
              </p>
              <div className="grid gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="text-left text-xs border border-border rounded-md px-3 py-2.5 hover:bg-secondary/40 transition leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  m.role === "user"
                    ? "max-w-[90%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                    : "w-full rounded-lg border border-border bg-secondary/20 px-3 py-2.5",
                )}
              >
                {m.role === "assistant" && (
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Bot className="h-3 w-3 text-primary" /> Chat bot
                  </div>
                )}
                {m.role === "user" ? (
                  <div className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="reco-chat-md text-xs leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_h2]:font-display [&_h2]:text-sm [&_h2]:mt-3 [&_h2]:mb-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Thinking…
            </div>
          )}

          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/5 p-2.5 text-[11px] text-destructive">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
          className="flex items-end gap-2 border-t border-border bg-background p-4"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            placeholder={`Ask about ${client.name.split(" ")[0]}…`}
            className="flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="border-t border-border px-5 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
          Reads full client context plus live SIX, news, and Phoeniqs. Does not send messages or execute trades.
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
