import { canvasEl, focusablesOf, sidebarEl, tryFocus } from "@/lib/focus-dom";
import { say } from "@/a11y/announce";
import { describeShape } from "@/lib/describe";
import type { Layer } from "@/lib/layer";
import { wallpaper, wallpaperStore } from "@/store/wallpaper";

export type CanvasFocusTarget = "first" | "active";

const shapeFor = (target: CanvasFocusTarget): Layer | undefined => {
  const { layers, activeId } = wallpaperStore.state;
  return target === "first"
    ? layers[0]
    : (layers.find((layer) => layer.id === activeId) ?? layers[0]);
};

export const selectAndAnnounce = (shape: Layer) => {
  wallpaper.select(shape.id);
  say(describeShape(shape), 120);
};

export const focusCanvas = (
  target: CanvasFocusTarget = "active",
  options: { keepSelection?: boolean } = {},
) => {
  if (!options.keepSelection) {
    const shape = shapeFor(target);
    if (shape) selectAndAnnounce(shape);
  }
  return tryFocus(canvasEl());
};

export const focusSubpage = () => {
  const bar = sidebarEl();
  if (!bar) return false;
  return tryFocus(
    focusablesOf(bar).find((element) => element.matches("[data-subpage-back]")),
    { focusVisible: true },
  );
};

export const focusSidebar = (edge: "start" | "end" = "start") => {
  const bar = sidebarEl();
  if (!bar) return false;
  const items = focusablesOf(bar);
  const order = edge === "start" ? items : [...items].reverse();
  for (const target of order) if (tryFocus(target, { focusVisible: true })) return true;
  return false;
};
