import { useCallback, useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientPageChat, type AskAiSelectionMeta } from "@/components/client-page-chat-context";

type MenuState = {
  x: number;
  y: number;
  text: string;
  meta: AskAiSelectionMeta;
};

function getSelectedText(): string {
  return window.getSelection()?.toString().trim() ?? "";
}

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target.closest("textarea, input, select, [contenteditable='true'], .tl-container, .tlui-layout")) {
    return true;
  }
  if (target.closest("[data-ask-ai-ignore]")) return true;
  return false;
}

function findSectionTitle(el: HTMLElement): string | undefined {
  const marked = el.closest("[data-ask-ai-section]");
  if (marked instanceof HTMLElement) return marked.dataset.askAiSection;

  const panel = el.closest(".bento-detail-panel");
  if (panel) {
    const heading = panel.querySelector("h3");
    if (heading?.textContent) return heading.textContent.trim();
  }

  const sectionHeading = el.closest("section")?.querySelector("h2, h3");
  if (sectionHeading?.textContent) return sectionHeading.textContent.trim();

  return undefined;
}

function surroundingContext(el: HTMLElement, selection: string): string | undefined {
  const block =
    el.closest("[data-ask-ai-section], .bento-detail-panel, section, article, li, td, p") ?? el;
  const text = block.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (!text || text.length <= selection.length + 20) return undefined;

  const idx = text.indexOf(selection);
  if (idx === -1) return text.slice(0, 220);

  const start = Math.max(0, idx - 90);
  const end = Math.min(text.length, idx + selection.length + 90);
  return text.slice(start, end);
}

export function AskAiSelectionMenu() {
  const { askAboutSelection } = useClientPageChat();
  const [menu, setMenu] = useState<MenuState | null>(null);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if (shouldIgnoreTarget(e.target)) return;

      const text = getSelectedText();
      if (text.length < 2) return;

      e.preventDefault();

      const el = e.target instanceof HTMLElement ? e.target : null;
      const meta: AskAiSelectionMeta = {
        sectionTitle: el ? findSectionTitle(el) : undefined,
        surrounding: el ? surroundingContext(el, text) : undefined,
      };

      setMenu({ x: e.clientX, y: e.clientY, text, meta });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  useEffect(() => {
    if (!menu) return;
    const onScroll = () => close();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [menu, close]);

  if (!menu) return null;

  const clipped = menu.text.length > 72 ? `${menu.text.slice(0, 71)}…` : menu.text;

  return (
    <>
      <div className="fixed inset-0 z-[200]" onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div
        role="menu"
        className={cn(
          "fixed z-[201] min-w-[200px] max-w-[280px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
          "animate-in fade-in-0 zoom-in-95 duration-100",
        )}
        style={{ left: menu.x, top: menu.y }}
        data-ask-ai-ignore
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            askAboutSelection(menu.text, menu.meta);
            close();
          }}
        >
          <Bot className="h-4 w-4 shrink-0 text-primary" />
          Ask AI
        </button>
        <div className="mx-2 my-1 border-t border-border" />
        <div className="px-2 pb-1.5 text-[10px] leading-snug text-muted-foreground">
          “{clipped}”
        </div>
      </div>
    </>
  );
}
