import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DelayedTooltipProps {
  content: ReactNode;
  className?: string;
  children: ReactNode;
  delay?: number;
}

export function DelayedTooltip({ content, className, children, delay = 550 }: DelayedTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  function updatePosition() {
    const anchor = anchorRef.current?.firstElementChild ?? anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const margin = 12;
    const tooltipWidth = Math.min(320, window.innerWidth - margin * 2);
    const tooltipHeight = 72;
    const centerX = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(centerX - tooltipWidth / 2, margin),
      window.innerWidth - tooltipWidth - margin,
    );
    const top =
      rect.bottom + 12 + tooltipHeight > window.innerHeight - margin
        ? Math.max(margin, rect.top - tooltipHeight - 12)
        : rect.bottom + 12;

    setPosition({ left, top });
  }

  useEffect(() => {
    const handleResize = () => {
      if (!visible) return;
      updatePosition();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [visible]);

  const begin = () => {
    if (!content) return;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, delay);
  };

  const end = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setVisible(false);
  };

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
        visible &&
        createPortal(
          <span
            className="pointer-events-none fixed z-50 inline-block rounded-2xl border border-outline bg-surface-container-high px-3 py-2 text-[12px] leading-5 whitespace-normal text-on-surface shadow-lg shadow-black/10"
            style={{
              left: `${position.left}px`,
              top: `${position.top}px`,
              width: "max-content",
              maxWidth: "min(20rem, calc(100vw - 1.5rem))",
            }}
          >
            {content}
          </span>,
          document.body,
        )}
    </div>
  );
}
