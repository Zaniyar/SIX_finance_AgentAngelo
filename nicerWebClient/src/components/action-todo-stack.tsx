import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActionTodoCard, type IconGroupId } from "@/components/action-todo-tile";
import type { ActionTodoCardProps } from "@/components/action-todo-tile";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 480;
const VISIBLE_DEPTH = 4;
export const STACK_CARD_W = 340;
export const STACK_CARD_H = 210;
const CARD_W = STACK_CARD_W;
const CARD_H = STACK_CARD_H;
const FAN_GAP_Y = 14;

export type StackCard = Omit<ActionTodoCardProps, "onCardClick" | "className" | "style"> & {
  key: string;
  iconGroup: IconGroupId;
};

type ActionTodoStackProps = {
  items: StackCard[];
  compact?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export function ActionTodoStack({
  items,
  compact = false,
  expanded: expandedProp,
  onExpandedChange,
}: ActionTodoStackProps) {
  const [index, setIndex] = useState(0);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? expandedProp : internalExpanded;

  const setExpanded = useCallback(
    (value: boolean) => {
      if (isControlled) onExpandedChange?.(value);
      else setInternalExpanded(value);
    },
    [isControlled, onExpandedChange],
  );

  const count = items.length;
  const safeIndex = count > 0 ? index % count : 0;

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  const visibleStack = useMemo(() => {
    if (!count) return [];
    const slice: { item: StackCard; depth: number; stackIndex: number }[] = [];
    for (let depth = 0; depth < Math.min(VISIBLE_DEPTH, count); depth++) {
      slice.push({
        item: items[(safeIndex + depth) % count]!,
        depth,
        stackIndex: (safeIndex + depth) % count,
      });
    }
    return slice.reverse();
  }, [count, items, safeIndex]);

  const fanPositions = useMemo(() => {
    if (!expanded || !count) return [];

    return items.map((item, i) => ({
      item,
      x: 0,
      y: i * (CARD_H + FAN_GAP_Y),
      rotate: 0,
      zIndex: i + 1,
    }));
  }, [count, expanded, items]);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    if (count <= 1 || swiping || expanded) return;
    setSwiping(true);
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % count);
      setSwiping(false);
    }, 280);
  }, [count, expanded, swiping]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (expanded) return;
    longPressTriggeredRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setExpanded(true);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    clearLongPress();
    if (expanded) return;

    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (longPressTriggeredRef.current) return;

    const moved =
      start && (Math.abs(e.clientX - start.x) > 8 || Math.abs(e.clientY - start.y) > 8);

    if (!moved && !swiping) advance();
  };

  const handlePointerLeave = () => {
    clearLongPress();
    pointerStartRef.current = null;
  };

  const collapseFan = () => setExpanded(false);

  if (!count) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground"
        style={{ width: CARD_W, height: 240 }}
      >
        Nothing on your desk today.
      </div>
    );
  }

  const stackHeight = compact ? 248 : 280;
  const expandedHeight = count * CARD_H + Math.max(0, count - 1) * FAN_GAP_Y + 36;
  const areaHeight = expanded ? expandedHeight : stackHeight;
  const cardTop = compact ? 0 : 8;

  return (
    <div className="relative shrink-0" style={{ width: CARD_W }}>
      <div
        className={cn("relative flex flex-col", expanded && "z-30")}
        style={{
          minHeight: areaHeight + 28,
          transition: "min-height 0.45s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {expanded && (
          <button
            type="button"
            aria-label="Close overview"
            className="fixed inset-0 z-20 cursor-default bg-background/40 backdrop-blur-[1px]"
            onClick={collapseFan}
          />
        )}

        <div
          className={cn(
            "relative select-none",
            expanded ? "z-30 overflow-visible" : "cursor-pointer overflow-hidden",
          )}
          style={{
            width: CARD_W,
            height: areaHeight,
            perspective: 1400,
            perspectiveOrigin: "50% 20%",
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerLeave}
        >
          <AnimatePresence mode="popLayout">
            {expanded
              ? fanPositions.map(({ item, x, y, rotate, zIndex }) => {
                  const { key: cardKey, ...cardProps } = item;
                  return (
                  <motion.div
                    key={`fan-${cardKey}`}
                    className="absolute left-1/2 top-0"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.92, x: 0, y: CARD_H * 0.35 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x,
                      y,
                      rotateZ: rotate,
                      zIndex,
                    }}
                    exit={{ opacity: 0, scale: 0.94, y: CARD_H * 0.2 }}
                    transition={{ type: "spring", stiffness: 280, damping: 28, delay: zIndex * 0.04 }}
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      marginLeft: -CARD_W / 2,
                    }}
                  >
                    <ActionTodoCard {...cardProps} />
                  </motion.div>
                  );
                })
              : visibleStack.map(({ item, depth, stackIndex }) => {
                  const { key: cardKey, ...cardProps } = item;
                  const isTop = depth === 0;
                  const tilt = depth % 2 === 0 ? 1 : -1;
                  const y = depth * 14;
                  const z = -depth * 55;
                  const scale = 1 - depth * 0.045;
                  const rotateZ = depth * tilt * 1.8;
                  const rotateX = depth * 4;

                  return (
                    <motion.div
                      key={`${cardKey}-${stackIndex}-${safeIndex}`}
                      className="absolute left-1/2 origin-center"
                      style={{
                        top: cardTop,
                        width: CARD_W,
                        height: CARD_H,
                        marginLeft: -CARD_W / 2,
                        zIndex: VISIBLE_DEPTH - depth,
                        transformStyle: "preserve-3d",
                      }}
                      initial={false}
                      animate={
                        isTop && swiping
                          ? {
                              x: 220,
                              y: -30,
                              rotateZ: 18,
                              rotateY: 25,
                              opacity: 0,
                              scale: 0.92,
                            }
                          : {
                              x: depth * tilt * 6,
                              y,
                              z,
                              scale,
                              rotateZ,
                              rotateX,
                              opacity: 1 - depth * 0.1,
                            }
                      }
                      transition={{
                        type: "spring",
                        stiffness: isTop && swiping ? 380 : 320,
                        damping: isTop && swiping ? 28 : 32,
                      }}
                    >
                      <ActionTodoCard
                        {...cardProps}
                        onCardClick={isTop && !swiping ? advance : undefined}
                        className={cn(isTop && "cursor-pointer ring-1 ring-black/5")}
                      />
                    </motion.div>
                  );
                })}
          </AnimatePresence>
        </div>

        <div
          className={cn(
            "relative flex items-center gap-3 text-[11px] text-muted-foreground",
            expanded ? "z-30 mt-3" : compact ? "mt-1" : "mt-2",
          )}
        >
          {!expanded ? (
            <>
              <span className="tabular-nums">
                {safeIndex + 1} / {count}
              </span>
              <span aria-hidden>·</span>
              <span>Tap to next</span>
              <span aria-hidden>·</span>
              <span>Hold to see all</span>
            </>
          ) : (
            <button
              type="button"
              onClick={collapseFan}
              className="rounded-full border border-border bg-background px-3 py-1 text-[10px] uppercase tracking-wider transition hover:bg-secondary"
            >
              Back to stack
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
