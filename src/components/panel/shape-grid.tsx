import { useRef, useState } from "react";
import type { ShapeSpec } from "@/lib/layer";
import { prettyName, randomBlob, SHAPES } from "@/lib/shapes";
import { cn } from "@/lib/utils";
import { ShapeCard } from "./shape-card";

interface ShapeGridProps {
  currentShape?: number;
  onPick: (spec: ShapeSpec, shiftKey: boolean) => void;
  columns?: number;
  className?: string;
}

const columnCount = (element: HTMLElement) =>
  Math.max(1, getComputedStyle(element).gridTemplateColumns.split(/\s+/).filter(Boolean).length);

export function ShapeGrid({ currentShape, onPick, columns, className }: ShapeGridProps) {
  const total = SHAPES.length + 1;
  const lastRowStart = columns ? Math.floor((total - 1) / columns) * columns : 0;
  const corners = (position: number) =>
    columns
      ? cn(
          position === 0 && "rounded-tl-2xl",
          position === columns - 1 && "rounded-tr-2xl",
          position === lastRowStart && "rounded-bl-2xl",
          position === total - 1 && "rounded-br-2xl",
        )
      : undefined;
  const [blob, setBlob] = useState(randomBlob);
  const [active, setActive] = useState(currentShape === undefined ? 0 : currentShape + 1);
  const grid = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const focusedIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (focusedIndex < 0) return;
    const last = buttons.length - 1;
    const cols = columnCount(event.currentTarget);
    const next =
      event.key === "ArrowRight"
        ? focusedIndex + 1
        : event.key === "ArrowLeft"
          ? focusedIndex - 1
          : event.key === "ArrowDown"
            ? focusedIndex + cols
            : event.key === "ArrowUp"
              ? focusedIndex - cols
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? last
                  : undefined;
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const target = Math.max(0, Math.min(last, next));
    setActive(target);
    buttons[target]?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={grid}
      onKeyDown={onKeyDown}
      className={cn(
        "scrollbar-hidden grid content-start gap-2 overflow-y-auto overscroll-contain",
        className,
      )}
    >
      <ShapeCard
        d={blob.path}
        name="Random blob"
        connected={columns !== undefined}
        cornerClass={corners(0)}
        tabIndex={active === 0 ? 0 : -1}
        onFocus={() => setActive(0)}
        onPick={(shift) => {
          onPick({ type: "blob", ...blob }, shift);
          setBlob(randomBlob());
        }}
      />
      {SHAPES.map((shape, index) => (
        <ShapeCard
          key={shape.name}
          d={shape.path}
          name={prettyName(shape.name)}
          current={currentShape === index}
          connected={columns !== undefined}
          cornerClass={corners(index + 1)}
          tabIndex={active === index + 1 ? 0 : -1}
          onFocus={() => setActive(index + 1)}
          onPick={(shift) => onPick({ type: "shape", shape: index }, shift)}
        />
      ))}
    </div>
  );
}
