import { useLayoutEffect, useRef, useState } from "react";
import { clamp, cn, decimals } from "@/lib/utils";

export type Range = [number, number];

interface RangeSliderProps {
  id: string;
  value: Range;
  min: number;
  max: number;
  step: number;
  onChange: (value: Range) => void;
  labels: [string, string];
  valueText?: (value: number) => string;
  className?: string;
  inactiveTrackColor?: string;
}

const GAP = 6;
const TICK_INSET = 8;
const DRAG_SLOP = 4;

type Thumb = 0 | 1;

export function RangeSlider({
  id,
  value,
  min,
  max,
  step,
  onChange,
  labels,
  valueText,
  className,
  inactiveTrackColor = "var(--color-secondary-container)",
}: RangeSliderProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [width, setWidth] = useState(0);
  const [pressed, setPressed] = useState<Thumb | null>(null);
  const [focused, setFocused] = useState<Thumb | null>(null);
  const pointerFocus = useRef(false);
  // Pointer x of a press on both handles at once; the drag direction then picks one.
  const undecidedPress = useRef<number | null>(null);
  const valueRef = useRef(value);

  useLayoutEffect(() => {
    valueRef.current = value;
  }, [value]);

  useLayoutEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    measure();
    return () => resizeObserver.disconnect();
  }, []);

  const toX = (current: number) => clamp((current - min) / (max - min), 0, 1) * width;
  const positions = [toX(value[0]), toX(value[1])];
  const narrow = (thumb: Thumb) => pressed === thumb || focused === thumb;
  const gaps = [GAP + (narrow(0) ? 1 : 2), GAP + (narrow(1) ? 1 : 2)];

  const stops = [
    ...(positions[0] > gaps[0] + TICK_INSET ? [TICK_INSET] : []),
    ...(positions[1] < width - gaps[1] - TICK_INSET ? [width - TICK_INSET] : []),
  ];

  const valueAt = (clientX: number) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect?.width) return null;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const precision = Math.max(decimals(step), decimals(min));
    const raw = min + Math.round((ratio * (max - min)) / step) * step;
    return clamp(+raw.toFixed(precision), min, max);
  };

  const setThumb = (thumb: Thumb, next: number) => {
    const [low, high] = valueRef.current;
    const updated: Range = thumb === 0 ? [Math.min(next, high), high] : [low, Math.max(next, low)];
    if (updated[0] !== low || updated[1] !== high) onChange(updated);
  };

  // The closer handle follows the pointer, or neither when the press is on both handles.
  const nearestThumb = (target: number): Thumb | null => {
    const [low, high] = valueRef.current;
    if (low === high && target === low) return null;
    const toLow = Math.abs(target - low);
    const toHigh = Math.abs(target - high);
    if (toLow !== toHigh) return toLow < toHigh ? 0 : 1;
    return target < low ? 0 : 1;
  };

  const press = (thumb: Thumb, target: number) => {
    setPressed(thumb);
    inputs[thumb].current?.focus();
    setThumb(thumb, target);
  };

  const endPress = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    undecidedPress.current = null;
    setPressed(null);
  };

  const trackClass = "pointer-events-none absolute top-1.5 h-4 pointer-coarse:top-3.5";

  return (
    <div
      ref={wrap}
      onPointerDown={(event) => {
        const target = valueAt(event.clientX);
        if (target === null) return;
        pointerFocus.current = true;
        setFocused(null);
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const thumb = nearestThumb(target);
        if (thumb === null) undecidedPress.current = event.clientX;
        else press(thumb, target);
      }}
      onPointerMove={(event) => {
        const target = valueAt(event.clientX);
        if (target === null) return;
        if (undecidedPress.current !== null) {
          const direction = event.clientX - undecidedPress.current;
          if (Math.abs(direction) < DRAG_SLOP) return;
          undecidedPress.current = null;
          press(direction < 0 ? 0 : 1, target);
        } else if (pressed !== null) {
          setThumb(pressed, target);
        }
      }}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      className={cn(
        "relative h-7 w-full shrink-0 cursor-pointer touch-pan-y select-none pointer-coarse:h-11",
        className,
      )}
    >
      {([0, 1] as const).map((thumb) => (
        <input
          key={thumb}
          ref={inputs[thumb]}
          id={`${id}-${thumb === 0 ? "min" : "max"}`}
          type="range"
          min={thumb === 0 ? min : value[0]}
          max={thumb === 0 ? value[1] : max}
          step={step}
          value={value[thumb]}
          aria-label={labels[thumb]}
          aria-valuetext={valueText?.(value[thumb])}
          onChange={(event) => setThumb(thumb, +event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Tab") pointerFocus.current = false;
            const direction =
              event.key === "ArrowLeft" || event.key === "ArrowDown"
                ? -1
                : event.key === "ArrowRight" || event.key === "ArrowUp"
                  ? 1
                  : 0;
            if (!event.shiftKey || !direction) return;
            event.preventDefault();
            setThumb(thumb, clamp(+(value[thumb] + direction * step * 10).toFixed(4), min, max));
          }}
          onFocus={() => setFocused(pointerFocus.current ? null : thumb)}
          onBlur={(event) => {
            // A press on the other handle moves focus there; it's still pointer focus.
            if (!wrap.current?.contains(event.relatedTarget)) pointerFocus.current = false;
            setFocused(null);
          }}
          className="pointer-events-none absolute inset-0 m-0 h-full w-full appearance-none opacity-0"
        />
      ))}
      <div
        aria-hidden
        className={cn(trackClass, "left-0 rounded-l-lg rounded-r-[2px]")}
        style={{ width: Math.max(0, positions[0] - gaps[0]), backgroundColor: inactiveTrackColor }}
      />
      <div
        aria-hidden
        className={cn(trackClass, "rounded-[2px] bg-primary")}
        style={{
          left: positions[0] + gaps[0],
          width: Math.max(0, positions[1] - gaps[1] - (positions[0] + gaps[0])),
        }}
      />
      <div
        aria-hidden
        className={cn(trackClass, "right-0 rounded-l-[2px] rounded-r-lg")}
        style={{
          left: Math.min(width, positions[1] + gaps[1]),
          backgroundColor: inactiveTrackColor,
        }}
      />
      {width > 0 &&
        stops.map((stop) => (
          <span
            key={stop}
            aria-hidden
            className="pointer-events-none absolute top-3.5 -mt-0.5 -ml-0.5 size-1 rounded-full bg-primary pointer-coarse:top-5.5"
            style={{ left: stop }}
          />
        ))}
      {([0, 1] as const).map((thumb) => (
        <div
          key={thumb}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 z-1 -ml-0.5 h-7 w-1 rounded-full bg-primary transition-[width,margin] duration-(--duration-fast-spatial) ease-fast-spatial pointer-coarse:h-11",
            narrow(thumb) && "-ml-px w-0.5",
            focused === thumb && "outline-3 outline-offset-2 outline-secondary",
          )}
          style={{ left: positions[thumb] }}
        />
      ))}
    </div>
  );
}
