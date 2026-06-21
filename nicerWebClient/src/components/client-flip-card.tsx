import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, RotateCw } from "lucide-react";
import type { Client, Recommendation } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ClientFlipCardProps = {
  client: Client;
  rec: Recommendation;
  aumLabel: string;
  categoryClassName: string;
};

const cardShell =
  "absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.06)] [backface-visibility:hidden]";

export function ClientFlipCard({ client, rec, aumLabel, categoryClassName }: ClientFlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="group/card relative h-[380px] w-full cursor-pointer [perspective:1400px]"
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${client.name}, tap to ${flipped ? "show profile" : "show recommendation"}`}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.85 }}
      >
        {/* Front — photo, segment, strategy */}
        <div className={cn(cardShell, "bg-gradient-to-b from-secondary/30 to-surface")}>
          <div className="relative flex-1 overflow-hidden">
            {client.avatar ? (
              <img
                src={client.avatar}
                alt={client.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-secondary font-display text-5xl text-muted-foreground">
                {client.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
          </div>

          <div className="relative shrink-0 p-4 pt-3">
            <div className="font-display text-lg leading-tight tracking-tight">{client.name}</div>
            <div className="mt-1 text-xs tabular text-muted-foreground">
              {client.segment} · {aumLabel}
            </div>
            <div className="mt-2 text-sm leading-snug">{client.strategy}</div>
            <div className="text-[11px] text-muted-foreground">{client.mandate}</div>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Tap for recommendation</span>
            <RotateCw className="h-3.5 w-3.5 opacity-60 transition group-hover/card:opacity-100" />
          </div>
        </div>

        {/* Back — recommendation */}
        <div
          className={cn(
            cardShell,
            "bg-gradient-to-br from-accent/8 via-surface to-surface p-5 [transform:rotateY(180deg)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recommendation
            </div>
            <RotateCw className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                categoryClassName,
              )}
            >
              {rec.category}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{rec.priority} priority</span>
          </div>

          <h3 className="mt-4 font-display text-xl leading-snug tracking-tight">{rec.title}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{rec.advised}</p>

          <Link
            to="/recommendations/$id"
            params={{ id: rec.id }}
            onClick={(e) => e.stopPropagation()}
            className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm transition hover:bg-secondary hover:text-foreground"
          >
            Review
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
