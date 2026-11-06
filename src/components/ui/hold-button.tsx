import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Check } from "material-symbols/rounded";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ui } from "@/store/ui";

const HOLD_MS = 500;

interface HoldButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "onClick" | "children" | "blurOnClick"
> {
  icon: ReactNode;
  label: string;
  releasedTooEarly: string;
  onConfirm: () => void;
}

export function HoldButton({
  icon,
  label,
  releasedTooEarly,
  onConfirm,
  className,
  ...rest
}: HoldButtonProps) {
  const holdStarted = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [wasDisabled, setWasDisabled] = useState(rest.disabled);

  if (wasDisabled !== rest.disabled) {
    setWasDisabled(rest.disabled);
    if (!rest.disabled) {
      setDone(false);
      setProgress(0);
    }
  }

  const stopFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const cancelHold = () => {
    if (holdStarted.current !== null && performance.now() - holdStarted.current < HOLD_MS)
      ui.showToast(releasedTooEarly, 2000);
    holdStarted.current = null;
    stopFrame();
    setProgress(0);
    setDone(false);
  };

  const beginHold = () => {
    if (holdStarted.current !== null) return;
    const start = performance.now();
    holdStarted.current = start;
    setDone(false);
    const tick = () => {
      const next = Math.min((performance.now() - start) / HOLD_MS, 1);
      setProgress(next);
      if (next < 1) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      holdStarted.current = null;
      frame.current = null;
      setDone(true);
      onConfirm();
    };
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => stopFrame, []);

  return (
    <Button
      {...rest}
      blurOnClick={false}
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      onKeyDown={(event) => {
        if (!event.repeat && (event.key === "Enter" || event.key === " ")) beginHold();
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") cancelHold();
      }}
      onBlur={cancelHold}
      className={cn("relative w-full overflow-hidden", className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 rounded-[inherit] bg-current/10"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative z-10 flex h-5 items-center justify-center overflow-hidden">
        <span
          className={cn(
            "inline-flex items-center gap-2 transition-[transform,opacity] duration-300 ease-emphasized",
            done ? "-translate-y-[120%] opacity-0" : "translate-y-0 opacity-100",
          )}
        >
          {icon}
          {label}
        </span>
        <span
          aria-hidden={!done}
          className={cn(
            "absolute inset-0 inline-flex items-center justify-center gap-2 transition-[transform,opacity] duration-300 ease-emphasized",
            done ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0",
          )}
        >
          <Check />
          Done
        </span>
      </span>
    </Button>
  );
}
