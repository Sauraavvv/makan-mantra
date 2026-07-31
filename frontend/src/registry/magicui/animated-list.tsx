"use client";

import { Children, type ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedListProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  focusIndex?: number;
  focusScale?: number;
  interval?: number;
  visibleItems?: number;
};

type AnimatedRow = {
  itemIndex: number;
  cycle: number;
};

export function AnimatedList({
  children,
  className,
  delay = 140,
  focusIndex = -1,
  focusScale = 1.08,
  interval = 1800,
  visibleItems,
}: AnimatedListProps) {
  const items = Children.toArray(children);
  const visibleRows = rowsToRender(items.length, visibleItems);
  const shouldReduceMotion = useReducedMotion();
  const [rows, setRows] = useState<AnimatedRow[]>(
    () => items.map((_, itemIndex) => ({ itemIndex, cycle: 0 })),
  );

  useEffect(() => {
    if (shouldReduceMotion || items.length < 2) return;

    const timer = window.setInterval(() => {
      setRows((currentRows) => {
        const [firstRow, ...remainingRows] = currentRows;
        return [...remainingRows, { itemIndex: firstRow.itemIndex, cycle: firstRow.cycle + 1 }];
      });
    }, interval);

    return () => window.clearInterval(timer);
  }, [interval, items.length, shouldReduceMotion]);

  return (
    <div className={cn("relative flex flex-col gap-3 overflow-visible px-2 py-3 [perspective:900px]", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        {rows.slice(0, visibleRows).map((row, position) => {
          const isFocused = position === focusIndex;

          return (
            <motion.div
              key={`${row.itemIndex}-${row.cycle}`}
              layout
              initial={{ opacity: 0, y: 34, scale: 0.96, rotate: -1.5, rotateX: -10 }}
              animate={{
                opacity: isFocused ? 1 : 0.82,
                y: 0,
                scale: isFocused ? focusScale : 1,
                rotate: 0,
                rotateX: 0,
              }}
              exit={{ opacity: 0, y: -34, scale: 0.94, rotate: 1.5, rotateX: 10 }}
              transition={{
                delay: position === visibleRows - 1 ? delay / 1000 : 0,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                isFocused
                  ? "relative z-10"
                  : "[&>figure]:border-black/20 [&>figure]:bg-black/25 [&>figure]:shadow-[inset_0_0_0_1px_rgba(0,0,0,.14),0_14px_32px_rgba(0,0,0,.22)] [&>figure]:hover:bg-black/30",
              )}
            >
              {items[row.itemIndex]}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function rowsToRender(itemCount: number, visibleItems?: number) {
  if (!visibleItems) return itemCount;
  return Math.min(itemCount, visibleItems);
}
