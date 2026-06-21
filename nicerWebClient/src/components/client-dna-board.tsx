import { useCallback, useEffect, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import type { Client } from "@/lib/mock-data";
import { resetClientDnaBoard, seedClientDnaBoardIfEmpty } from "@/lib/client-dna-board-seed";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

type ClientDnaBoardProps = {
  client: Client;
  className?: string;
};

function BoardChrome({ client, onReset }: { client: Client; onReset: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3">
      <div className="pointer-events-auto rounded-xl border border-border/80 bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">DNA canvas</div>
        <div className="font-display text-sm tracking-tight">{client.name.split(" ")[0]} · infinite board</div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm transition hover:border-accent/30 hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset layout
      </button>
    </div>
  );
}

function ClientDnaBoardInner({ client, className }: ClientDnaBoardProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const persistenceKey = `aura-dna-board-v2-${client.id}`;

  const handleMount = useCallback(
    (ed: Editor) => {
      setEditor(ed);
      seedClientDnaBoardIfEmpty(ed, client);
    },
    [client],
  );

  const handleReset = useCallback(() => {
    if (!editor) return;
    resetClientDnaBoard(editor, client);
  }, [editor, client]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-[#fbfcfd]", className)}>
      <BoardChrome client={client} onReset={handleReset} />
      <div className="absolute inset-0 top-0">
        <Tldraw persistenceKey={persistenceKey} onMount={handleMount} />
      </div>
    </div>
  );
}

export function ClientDnaBoard({ client, className }: ClientDnaBoardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-2xl border border-border bg-secondary/30",
          className ?? "h-[min(72vh,820px)] min-h-[520px]",
        )}
      />
    );
  }

  return <ClientDnaBoardInner client={client} className={className ?? "h-[min(72vh,820px)] min-h-[520px]"} />;
}
