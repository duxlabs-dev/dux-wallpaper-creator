import { useEffect, useRef } from "react";
import { useFocusReturn } from "@/hooks/ui/use-focus-return";
import { pickShape } from "@/components/panel/shape-picker";
import { ShapeGrid } from "@/components/panel/shape-grid";
import { cn } from "@/lib/utils";
import { ui, useUi } from "@/store/ui";
import { wallpaperStore } from "@/store/wallpaper";

export function ShapeSheet() {
  const mode = useUi((state) => state.sheet);
  const open = mode !== null;
  const sheet = useRef<HTMLDivElement>(null);
  useFocusReturn(open);

  useEffect(() => {
    if (open) sheet.current?.focus({ preventScroll: true });
  }, [open]);

  const replacing = mode === "replace" && wallpaperStore.state.activeId !== null;

  return (
    <div
      aria-hidden={!open}
      onClick={(event) => event.target === event.currentTarget && ui.closeSheet()}
      className={cn(
        "fixed inset-0 z-20 bg-black/32 transition-opacity duration-300 ease-[cubic-bezier(0.3,0,0,1)]",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div
        ref={sheet}
        role="dialog"
        aria-modal
        aria-label="Shapes"
        tabIndex={-1}
        inert={!open}
        className={cn(
          "absolute bottom-0 left-1/2 flex max-h-[min(78vh,720px)] w-[min(880px,calc(100vw-24px))] flex-col gap-1 rounded-t-[28px] bg-surface-container-low px-3 pb-3 text-sm text-on-surface shadow-level1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.3,0,0,1)] outline-none",
          open
            ? "-translate-x-1/2 opacity-100"
            : "pointer-events-none translate-x-[-50%] translate-y-full opacity-0",
        )}
      >
        <div
          aria-hidden
          className="mt-[22px] mb-[18px] h-1 w-8 shrink-0 self-center rounded-full bg-on-surface-variant"
        />
        <div className="shrink-0 px-2 pb-1 text-center text-[22px] leading-7">
          {replacing ? "Change shape" : "Shapes"}
        </div>
        {open && (
          <ShapeGrid
            className="grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4 p-2"
            currentShape={
              replacing
                ? (wallpaperStore.state.layers.find(
                    (layer) => layer.id === wallpaperStore.state.activeId,
                  )?.shape ?? undefined)
                : undefined
            }
            onPick={(spec, shift) => {
              pickShape(mode, spec);
              if (!shift || replacing) ui.closeSheet();
            }}
          />
        )}
      </div>
    </div>
  );
}
