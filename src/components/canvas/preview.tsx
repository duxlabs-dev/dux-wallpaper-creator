import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ExportMenu } from "@/components/panel/export-menu";
import { useWallpaper } from "@/store/wallpaper";
import { ui, useUi } from "@/store/ui";
import { BgModeBadge } from "./bg-mode-badge";
import { Stage } from "./stage";

export function Preview() {
  const canvas = useWallpaper((state) => state.canvas);
  const hidden = useUi((state) => state.panel === "hidden");
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const containerElement = ref.current;
    if (!containerElement) return;
    const fit = () =>
      setScale(
        Math.max(
          containerElement.clientWidth / canvas.width,
          containerElement.clientHeight / canvas.height,
        ) || 1,
      );
    fit();
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(containerElement);
    return () => resizeObserver.disconnect();
  }, [canvas.width, canvas.height]);

  const aspectRatio = canvas.width / canvas.height;
  const style = {
    width: `min(100cqw, 100cqh * ${aspectRatio})`,
    aspectRatio: aspectRatio,
  } as CSSProperties;

  const onPointerDown = () => {
    const containerElement = ref.current;
    if (!containerElement || document.activeElement === containerElement) return;
    containerElement.focus({ preventScroll: true });
  };

  const onFocus = () => {
    ui.setCanvasFocused(true);
  };

  return (
    <main className="[container-type:size] relative grid min-w-0 flex-1 place-items-center">
      {hidden && (
        <div className="absolute top-3 left-3">
          <ExportMenu trigger={false} />
        </div>
      )}
      <div
        ref={ref}
        data-canvas
        tabIndex={0}
        role="application"
        aria-label="Wallpaper canvas"
        onFocus={onFocus}
        onBlur={() => ui.setCanvasFocused(false)}
        onPointerDown={onPointerDown}
        className="relative overflow-hidden bg-surface shadow-[0_0_0_1px] shadow-outline-variant focus-ring"
        style={style}
      >
        <Stage scale={scale} />
      </div>
      <BgModeBadge />
    </main>
  );
}
