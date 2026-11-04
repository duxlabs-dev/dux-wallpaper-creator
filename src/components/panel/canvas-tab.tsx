import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { ui } from "@/store/ui";
import { wallpaper } from "@/store/wallpaper";
import { Check, DeleteForever } from "material-symbols/rounded";
import { FormatPicker } from "./format-picker";
import { PatternPicker } from "./pattern-picker";

export function CanvasTab() {
  const holdStarted = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const doneTimer = useRef<number | null>(null);
  const [resetProgress, setResetProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);

  const cancelHold = () => {
    if (holdStarted.current !== null) {
      const elapsed = performance.now() - holdStarted.current;
      if (elapsed < 500) ui.showToast("Hold the button to clear everything.", 2000);
    }
    holdStarted.current = null;
    setHolding(false);
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    setResetProgress(0);
    if (done) {
      setDone(false);
      if (doneTimer.current !== null) {
        clearTimeout(doneTimer.current);
        doneTimer.current = null;
      }
    }
  };

  const beginHold = () => {
    if (holdStarted.current !== null) return;
    holdStarted.current = performance.now();
    setHolding(true);
    if (doneTimer.current !== null) {
      clearTimeout(doneTimer.current);
      doneTimer.current = null;
    }
    if (done) {
      setDone(false);
    }
    const updateProgress = () => {
      if (holdStarted.current === null) return;
      const progress = Math.min((performance.now() - holdStarted.current) / 500, 1);
      setResetProgress(progress);
      if (progress === 1) {
        holdStarted.current = null;
        setHolding(false);
        animationFrame.current = null;
        setDone(true);
        wallpaper.clearAll();
        return;
      }
      animationFrame.current = requestAnimationFrame(updateProgress);
    };
    animationFrame.current = requestAnimationFrame(updateProgress);
  };

  useEffect(
    () => () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      if (doneTimer.current !== null) clearTimeout(doneTimer.current);
    },
    [],
  );

  return (
    <section
      id="panel-canvas"
      role="tabpanel"
      aria-labelledby="tab-canvas"
      className="flex animate-fade-up flex-col gap-7"
    >
      <FormatPicker />
      <PatternPicker />
      <div className="flex flex-col gap-2 border-t border-outline-variant pt-6">
        <div className="relative">
          <Button
            variant="danger"
            title={
              holding ? undefined : "Hold for 500 ms to clear layers and reset canvas settings"
            }
            aria-keyshortcuts={ariaKeyshortcuts("X")}
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
            className="relative w-full overflow-hidden"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 rounded-[inherit]"
              style={{
                width: `${resetProgress * 100}%`,
                backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)",
              }}
            />
            <span className="relative z-10 flex h-5 items-center justify-center overflow-hidden">
              <span
                className={`inline-flex items-center gap-2 transition-[transform,opacity] duration-300 ease-emphasized ${
                  done ? "translate-y-[-120%] opacity-0" : "translate-y-0 opacity-100"
                }`}
              >
                <DeleteForever />
                Clear everything
              </span>
              <span
                className={`absolute inset-0 inline-flex items-center justify-center gap-2 transition-[transform,opacity] duration-300 ease-emphasized ${
                  done ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0"
                }`}
              >
                <Check />
                Done
              </span>
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
