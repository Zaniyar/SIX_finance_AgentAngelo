import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildRecommendationChatContext, type ClientPageTab } from "@/lib/recommendation-context";
import { readChatStreamReply } from "@/lib/chat-stream";
import type { Client, Recommendation } from "@/lib/mock-data";

export type { ClientPageTab } from "@/lib/recommendation-context";

type ChatMsg = { role: "user" | "assistant"; content: string };

export type AskAiSelectionMeta = {
  sectionTitle?: string;
  surrounding?: string;
};

type ClientPageChatContextValue = {
  client: Client;
  recCount: number;
  messages: ChatMsg[];
  busy: boolean;
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  submit: (text: string) => Promise<void>;
  askAboutSelection: (selection: string, meta?: AskAiSelectionMeta) => void;
  suggestions: string[];
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
};

const ClientPageChatContext = createContext<ClientPageChatContextValue | null>(null);

export function useClientPageChat() {
  const ctx = useContext(ClientPageChatContext);
  if (!ctx) throw new Error("useClientPageChat must be used within ClientPageChatProvider");
  return ctx;
}

const TAB_LABELS: Record<ClientPageTab, string> = {
  reco: "Recommendation",
  portfolio: "Portfolio",
  dna: "Client DNA",
};

function buildSelectionQuestion(
  selection: string,
  activeTab: ClientPageTab,
  client: Client,
  meta?: AskAiSelectionMeta,
) {
  const first = client.name.split(" ")[0];
  const section = meta?.sectionTitle ? ` (${meta.sectionTitle})` : "";

  return (
    `[Ask AI · selection] On the ${TAB_LABELS[activeTab]} tab${section}, I highlighted:\n“${selection}”\n\n` +
    `Reply in 2–4 short sentences only — like briefing a colleague, not writing a memo. ` +
    `What does this mean for ${first}, and what's the one practical thing I should do? No tables, no checklists, no headers.`
  );
}

export function ClientPageChatProvider({
  client,
  recs,
  activeTab,
  children,
}: {
  client: Client;
  recs: Recommendation[];
  activeTab: ClientPageTab;
  children: ReactNode;
}) {
  const chatContext = useMemo(
    () => buildRecommendationChatContext(client, recs, { activeTab }),
    [client, recs, activeTab],
  );

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const primaryRec = recs[0];
  const suggestions = useMemo(() => {
    const first = client.name.split(" ")[0];
    if (activeTab === "portfolio") {
      return [
        `Summarize ${first}'s portfolio positioning and any drift from mandate.`,
        "Which holdings have alerts and what actions are linked?",
        "How does performance compare to the benchmark?",
        "What should I watch before the next review?",
      ];
    }
    if (activeTab === "dna") {
      return [
        `What should I remember about ${first} before a client meeting?`,
        "Walk me through values, sensitivities, and conversation starters.",
        "What DNA gaps should I probe at the next touchpoint?",
        `Draft a warm ${client.preferredChannel} note using their communication style.`,
      ];
    }
    if (recs.length > 1) {
      return [
        `Summarize all ${recs.length} proposed actions for ${first} and how they fit together.`,
        "What are the biggest risks across these recommendations?",
        "Which compliance points should I cover on a joint call?",
        "What's the business value for the bank if we execute all of them?",
      ];
    }
    return [
      `Why does "${primaryRec?.title ?? "this recommendation"}" matter for ${first} right now?`,
      "Walk me through confidence, evidence, and what could go wrong.",
      "What alternatives were considered and why were they rejected?",
      `Draft a ${client.preferredChannel} note in ${first}'s communication style.`,
    ];
  }, [activeTab, client.name, client.preferredChannel, recs.length, primaryRec?.title]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const submit = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setInput("");
      setError(null);

      const next: ChatMsg[] = [...messages, { role: "user", content: t }];
      setMessages(next);
      setBusy(true);

      try {
        const res = await fetch("/api/recommendation-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next, context: chatContext }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const reply = await readChatStreamReply(res);
        if (reply) setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [busy, chatContext, messages],
  );

  const askAboutSelection = useCallback(
    (selection: string, meta?: AskAiSelectionMeta) => {
      setChatOpen(true);
      void submit(buildSelectionQuestion(selection, activeTab, client, meta));
    },
    [activeTab, client, submit],
  );

  const value = useMemo(
    () => ({
      client,
      recCount: recs.length,
      messages,
      busy,
      error,
      input,
      setInput,
      chatOpen,
      setChatOpen,
      submit,
      askAboutSelection,
      suggestions,
      inputRef,
      scrollerRef,
    }),
    [
      client,
      recs.length,
      messages,
      busy,
      error,
      input,
      chatOpen,
      submit,
      askAboutSelection,
      suggestions,
    ],
  );

  return <ClientPageChatContext.Provider value={value}>{children}</ClientPageChatContext.Provider>;
}
