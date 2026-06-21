import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, AlertTriangle, Layers, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { bentoAccentStyles, type BentoAccent } from "@/lib/bento-accent";

export type IconGroupId = "opportunity" | "macro" | "alert" | "other";

export const ICON_GROUP_ORDER: IconGroupId[] = ["alert", "opportunity", "macro", "other"];

export const ICON_GROUP_META: Record<
  IconGroupId,
  { label: string; icon: ReactNode }
> = {
  alert: { label: "Action required", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  opportunity: { label: "Opportunities", icon: <Sparkles className="h-3.5 w-3.5" /> },
  macro: { label: "Macro & CIO", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  other: { label: "Portfolio", icon: <Layers className="h-3.5 w-3.5" /> },
};

export function resolveIconGroup(opts: { category: string; eventKind?: string; isEvent?: boolean }): IconGroupId {
  if (opts.isEvent) {
    return opts.eventKind === "Opportunity" ? "opportunity" : "alert";
  }
  if (opts.category === "Opportunity") return "opportunity";
  if (opts.category === "Macro") return "macro";
  if (opts.category === "Reputational" || opts.category === "Fraud" || opts.category === "Concentration") {
    return "alert";
  }
  return "other";
}

export type ActionTodoHref =
  | { to: "/recommendations/$id"; params: { id: string } }
  | { to: "/events/$id"; params: { id: string } };

export type ActionTodoCardProps = {
  accent: BentoAccent;
  icon: ReactNode;
  eyebrow: ReactNode;
  title: string;
  footer: ReactNode;
  href: ActionTodoHref;
  cta?: string;
  onCardClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

const tileBase =
  "group/tile relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/95 p-4 text-left backdrop-blur-sm " +
  "shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.06)]";

export function ActionTodoCard({
  accent,
  icon,
  eyebrow,
  title,
  footer,
  href,
  cta = "Review",
  onCardClick,
  className,
  style,
}: ActionTodoCardProps) {
  const styles = bentoAccentStyles[accent];

  return (
    <div
      className={cn(tileBase, className)}
      style={style}
      onClick={onCardClick}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick();
              }
            }
          : undefined
      }
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", styles.glow)} />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm [&_svg]:h-6 [&_svg]:w-6", styles.icon)}>
          {icon}
        </div>
        <Link
          {...href}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground transition-all duration-300",
            "hover:border-accent/30 hover:text-accent hover:shadow-md hover:ring-2 hover:ring-accent/20 hover:ring-offset-2 hover:ring-offset-background",
          )}
          aria-label={cta}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative z-10 mt-4 min-h-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground line-clamp-1">{eyebrow}</div>
        <h3 className="mt-2 font-display text-xl leading-snug tracking-tight line-clamp-3">{title}</h3>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">{footer}</div>
        <Link
          {...href}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {cta} →
        </Link>
      </div>
    </div>
  );
}

export function buildRecommendationCardProps({
  clientName,
  segment,
  aumLabel,
  title,
  category,
  priority,
  recId,
  categoryClassName,
}: {
  clientName: string;
  segment: string;
  aumLabel: string;
  title: string;
  category: string;
  priority: string;
  recId: string;
  categoryClassName: string;
}): Omit<ActionTodoCardProps, "onCardClick" | "className" | "style"> & { key: string; iconGroup: IconGroupId } {
  return {
    key: recId,
    iconGroup: resolveIconGroup({ category }),
    accent: accentForRec(category, priority),
    icon: <RecIcon category={category} />,
    eyebrow: `${clientName} · ${segment} · ${aumLabel}`,
    title,
    href: { to: "/recommendations/$id", params: { id: recId } },
    footer: (
      <>
        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${categoryClassName}`}>
          {category}
        </span>
        <PriorityPill priority={priority} />
      </>
    ),
  };
}

export function buildEventCardProps({
  kind,
  category,
  categoryClassName,
  title,
  affectedCount,
  date,
  eventId,
}: {
  kind: string;
  category: string;
  categoryClassName: string;
  title: string;
  affectedCount: number;
  date: string;
  eventId: string;
}): Omit<ActionTodoCardProps, "onCardClick" | "className" | "style"> & { key: string; iconGroup: IconGroupId } {
  return {
    key: eventId,
    iconGroup: resolveIconGroup({ category, eventKind: kind, isEvent: true }),
    accent: kind === "Opportunity" ? "trust" : "risk",
    icon: kind === "Opportunity" ? <Sparkles className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />,
    eyebrow: `Event · ${kind} · ${date}`,
    title,
    href: { to: "/events/$id", params: { id: eventId } },
    cta: "Brief",
    footer: (
      <>
        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${categoryClassName}`}>
          {category}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {affectedCount} client{affectedCount > 1 ? "s" : ""}
        </span>
      </>
    ),
  };
}

function accentForRec(category: string, priority: string): BentoAccent {
  if (priority === "High") {
    return category === "Opportunity" ? "trust" : "risk";
  }
  if (category === "Opportunity") return "trust";
  if (category === "Macro") return "insight";
  if (category === "Reputational" || category === "Fraud" || category === "Concentration") return "risk";
  return "business";
}

function PriorityPill({ priority }: { priority: string }) {
  const cls =
    priority === "High"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : priority === "Medium"
        ? "border-accent/30 bg-accent/10 text-accent"
        : "border-border bg-secondary text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>
      {priority}
    </span>
  );
}

function RecIcon({ category }: { category: string }) {
  if (category === "Opportunity") return <Sparkles className="h-6 w-6" />;
  if (category === "Macro") return <TrendingUp className="h-6 w-6" />;
  if (category === "Reputational" || category === "Fraud") return <AlertTriangle className="h-6 w-6" />;
  return <Layers className="h-6 w-6" />;
}
