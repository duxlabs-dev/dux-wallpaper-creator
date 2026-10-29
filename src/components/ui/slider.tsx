import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp, cn, decimals } from "@/lib/utils";

interface SliderProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onReset?: () => void;
  track?: string;
  label?: string;
  className?: string;
  ticks?: boolean;
  disabled?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: React.PointerEvent<HTMLElement>) => void;
}

// Space between the track and the handle's edge. The handle is 4px wide and
// narrows to 2px while pressed or focused; the track follows so the gap stays.
const GAP = 6;
const TICK = 4;
// Ticks and the stop indicator sit centered in the track's rounded ends.
const TICK_INSET = 8;
const MIN_TICK_SPACING = 8;

const ACTIVE_TRACK = "var(--color-primary)";
const INACTIVE_TRACK = "var(--color-secondary-container)";
const DISABLED_ACTIVE_TRACK = "color-mix(in srgb, var(--color-on-surface) 38%, transparent)";
const DISABLED_INACTIVE_TRACK = "color-mix(in srgb, var(--color-on-surface) 12%, transparent)";

export function Slider({
  id,
  value,
  min,
  max,
  step,
  onChange,
  onReset,
  track,
  label,
  className,
  ticks = false,
  disabled = false,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: SliderProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const pointerFocus = useRef(false);

  const valueRef = useRef(value);
  valueRef.current = value;

  useLayoutEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    measure();
    return () => resizeObserver.disconnect();
  }, []);

  const fraction = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const positionX = fraction * width;
  const narrow = pressed || focused;
  const trackGap = GAP + (narrow ? 1 : 2);

  const count = Math.round((max - min) / step);
  const showTicks =
    ticks && count > 0 && Number.isFinite(count) && width / count >= MIN_TICK_SPACING;

  // Without ticks, a single stop indicator marks the end of the track.
  const tickMarks = (
    showTicks ? Array.from({ length: count + 1 }, (_, index) => index / count) : [1]
  )
    .map((tickFraction) => {
      const tickPositionX = clamp(tickFraction * width, TICK_INSET, width - TICK_INSET);
      return { pos: tickPositionX, active: tickPositionX < positionX };
    })
    .filter((tick) => Math.abs(tick.pos - positionX) >= trackGap + TICK / 2);

  const seek = useCallback(
    (clientX: number) => {
      const rect = wrap.current?.getBoundingClientRect();
      if (!rect?.width) return;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const precision = Math.max(decimals(step), decimals(min));
      const raw = min + Math.round((ratio * (max - min)) / step) * step;
      const stepped = clamp(+raw.toFixed(precision), min, max);
      if (stepped !== valueRef.current) onChange(stepped);
    },
    [min, max, step, onChange],
  );

  const endPress = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setPressed(false);
    onPointerUp?.(event);
    if (cancelled) onPointerCancel?.(event);
  };

  useEffect(() => {
    wrap.current?.style.setProperty("--w", `${width}px`);
  }, [width]);

  const vars = {
    "--active": disabled ? DISABLED_ACTIVE_TRACK : ACTIVE_TRACK,
    "--inactive": disabled ? DISABLED_INACTIVE_TRACK : INACTIVE_TRACK,
    "--slider-gap": `${trackGap}px`,
    ...(track ? { "--track": track } : null),
  } as React.CSSProperties;

  return (
    <div
      ref={wrap}
      aria-disabled={disabled || undefined}
      onPointerDown={(event) => {
        if (disabled) return;
        pointerFocus.current = true;
        setFocused(false);
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
        input.current?.focus();
        seek(event.clientX);
        onPointerDown?.(event);
      }}
      onPointerMove={(event) => {
        if (pressed && !disabled) seek(event.clientX);
      }}
      onPointerUp={(event) => {
        if (!disabled) endPress(event);
      }}
      onPointerCancel={(event) => {
        if (!disabled) endPress(event, true);
      }}
      onDoubleClick={disabled ? undefined : onReset}
      className={cn(
        "relative h-7 w-full shrink-0 cursor-pointer touch-pan-y transition-[--slider-gap] duration-(--duration-fast-spatial) ease-fast-spatial select-none pointer-coarse:h-11",
        disabled && "cursor-not-allowed",
        disabled && track && "opacity-38",
        className,
      )}
      style={vars}
    >
      <input
        ref={input}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(+event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Home") {
            event.preventDefault();
            onChange(min);
            return;
          }
          if (event.key === "End") {
            event.preventDefault();
            onChange(max);
            return;
          }
          const dir =
            event.key === "ArrowLeft" || event.key === "ArrowDown"
              ? -1
              : event.key === "ArrowRight" || event.key === "ArrowUp"
                ? 1
                : 0;
          if (!event.shiftKey || !dir) return;
          event.preventDefault();
          onChange(clamp(+(value + dir * step * 10).toFixed(4), min, max));
        }}
        className="pointer-events-none absolute inset-0 m-0 h-full w-full appearance-none opacity-0"
        onFocus={() => setFocused(!pointerFocus.current)}
        onBlur={() => {
          pointerFocus.current = false;
          setFocused(false);
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1.5 left-0 h-4 rounded-l-lg rounded-r-[2px] bg-[image:var(--track,linear-gradient(var(--active),var(--active)))] bg-[length:var(--w)_100%] bg-no-repeat pointer-coarse:top-3.5"
        style={{ width: `max(0px, ${positionX}px - var(--slider-gap))` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1.5 right-0 h-4 rounded-l-[2px] rounded-r-lg bg-[image:var(--track,linear-gradient(var(--inactive),var(--inactive)))] bg-[length:var(--w)_100%] bg-no-repeat pointer-coarse:top-3.5"
        style={{
          left: `min(${width}px, ${positionX}px + var(--slider-gap))`,
          backgroundPosition: `calc(-${positionX}px - var(--slider-gap)) 0`,
        }}
      />
      {width > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1.5 left-0 h-4 w-full pointer-coarse:top-3.5"
        >
          {tickMarks.map((tick, index) => (
            <span
              key={index}
              className={cn(
                "absolute top-1/2 -mt-0.5 -ml-0.5 size-1 rounded-full",
                track
                  ? "bg-surface"
                  : disabled
                    ? "bg-on-surface/38"
                    : tick.active
                      ? "bg-secondary-container"
                      : "bg-primary",
              )}
              style={{ left: tick.pos }}
            />
          ))}
        </div>
      )}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 z-1 -ml-0.5 h-7 w-1 rounded-full transition-[width,margin] duration-(--duration-fast-spatial) ease-fast-spatial pointer-coarse:h-11",
          disabled ? "bg-on-surface/38" : "bg-primary",
          narrow && "-ml-px w-0.5",
          focused && "outline-3 outline-offset-2 outline-secondary",
        )}
        style={{ left: positionX }}
      />
    </div>
  );
}
