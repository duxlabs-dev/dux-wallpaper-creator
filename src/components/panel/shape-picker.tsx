import { useEffect, useRef } from "react";
import { useFocusReturn } from "@/hooks/ui/use-focus-return";
import { IconButton } from "@/components/ui/icon-button";
import type { ShapeSpec } from "@/lib/layer";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { selectActive, useWallpaper, wallpaper, wallpaperStore } from "@/store/wallpaper";
import { ui, useUi, type PickMode } from "@/store/ui";
import { ShapeGrid } from "./shape-grid";
import { ArrowBack } from "material-symbols/rounded";

export const pickShape = (mode: PickMode, spec: ShapeSpec) => {
  if (mode === "replace" && wallpaperStore.state.activeId) wallpaper.replaceActiveShape(spec);
  else wallpaper.addLayer(spec);
};

export function ShapePicker() {
  const mode = useUi((state) => state.picker);
  const active = useWallpaper(selectActive);
  const back = useRef<HTMLButtonElement>(null);
  const open = mode !== null;
  useFocusReturn(open);

  useEffect(() => {
    if (open) back.current?.focus({ preventScroll: true });
  }, [open]);

  const replacing = mode === "replace" && active !== null;

  return (
    <section
      aria-label="Shape picker"
      inert={!open}
      data-open={open}
      className="absolute inset-0 flex flex-col bg-surface-container pt-2 transition-[translate,opacity] duration-450 ease-emphasized group-data-[panel=mini]/panel:hidden data-[open=false]:translate-x-full"
    >
      <div className="flex items-center gap-2 border-b border-outline-variant px-1.5 pb-2">
        <IconButton
          ref={back}
          label="Back (Esc)"
          aria-keyshortcuts={ariaKeyshortcuts("Escape")}
          onClick={ui.closePicker}
        >
          <ArrowBack />
        </IconButton>
        <span className="text-base leading-6 font-medium whitespace-nowrap">
          {replacing ? "Change shape" : "Add shape"}
        </span>
      </div>
      <ShapeGrid
        className="min-h-0 flex-1 grid-cols-4 px-1.5 pt-3 pb-1.5"
        currentShape={replacing ? active?.shape : undefined}
        onPick={(spec, shiftKey) => {
          pickShape(mode!, spec);
          if (!shiftKey || replacing) {
            ui.closePicker();
          }
        }}
      />
    </section>
  );
}
