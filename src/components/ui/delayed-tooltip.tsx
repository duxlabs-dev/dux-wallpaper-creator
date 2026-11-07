import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { clamp, cn } from "@/lib/utils";

interface DelayedTooltipProps {
  content: ReactNode;
  className?: string;
  children: ReactNode;
  delay?: number;
}

const ANCHOR_SPACING = 4;
const VIEWPORT_MARGIN = 8;
const EXIT_MS = 75;
// the time when hovering an element that has a tooltip shows the tooltip immediately when one was shown before instead of waiting for the delay
const SKIP_DELAY_MS = 300;

let openTooltips = 0;
let skipDelayUntil = 0;

type Placement = { left: number; top: number; above: boolean };

export function DelayedTooltip({ content, className, children, delay = 300 }: DelayedTooltipProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const showTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const id = useId();

  const place = useCallback(() => {
    const anchor = anchorRef.current?.firstElementChild ?? anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const rect = anchor.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const above = rect.top - ANCHOR_SPACING - height >= VIEWPORT_MARGIN;
    setPlacement({
      left: clamp(
        rect.left + rect.width / 2 - width / 2,
        VIEWPORT_MARGIN,
        window.innerWidth - width - VIEWPORT_MARGIN,
      ),
      top: above ? rect.top - ANCHOR_SPACING - height : rect.bottom + ANCHOR_SPACING,
      above,
    });
  }, []);

  const clearTimers = () => {
    if (showTimer.current !== null) window.clearTimeout(showTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    showTimer.current = null;
    closeTimer.current = null;
  };

  const begin = () => {
    if (!content) return;
    clearTimers();
    if (open) {
      setClosing(false);
      return;
    }
    if (openTooltips > 0 || performance.now() < skipDelayUntil) setOpen(true);
    else showTimer.current = window.setTimeout(() => setOpen(true), delay);
  };

  const end = useCallback(() => {
    if (showTimer.current !== null) window.clearTimeout(showTimer.current);
    showTimer.current = null;
    if (!open || closeTimer.current !== null) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
      setClosing(false);
      setPlacement(null);
    }, EXIT_MS);
  }, [open]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    openTooltips += 1;
    return () => {
      openTooltips -= 1;
      skipDelayUntil = performance.now() + SKIP_DELAY_MS;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") end();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, place, end]);

  useEffect(() => clearTimers, []);

  return (
    <div
      ref={anchorRef}
      className={cn("contents", className)}
      onMouseEnter={begin}
      onMouseLeave={end}
      onFocus={(event) => {
        // Focus moved by script after a click (e.g. opening a subpage) shouldn't pop a tooltip.
        if (event.target.matches(":focus-visible")) begin();
      }}
      onBlur={end}
      onPointerDown={end}
    >
      {children}
      {content &&
        open &&
        createPortal(
          <span
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-50 block min-h-6 w-max max-w-[min(200px,calc(100vw-16px))] min-w-10 rounded-[4px] bg-inverse-surface px-2 py-1 text-xs leading-4 font-normal tracking-[0.4px] text-inverse-on-surface",
              "starting:scale-80 starting:opacity-0",
              closing ? "scale-80 opacity-0" : "scale-100 opacity-100",
              !placement && "invisible",
            )}
            style={{
              left: placement?.left ?? 0,
              top: placement?.top ?? 0,
              transformOrigin: placement?.above === false ? "top center" : "bottom center",
              transition: closing
                ? `opacity ${EXIT_MS}ms linear, scale ${EXIT_MS}ms linear`
                : "opacity var(--duration-fast-effects) var(--ease-fast-effects), scale var(--duration-fast-spatial) var(--ease-fast-spatial)",
            }}
          >
            {content}
          </span>,
          document.body,
        )}
    </div>
  );
}
