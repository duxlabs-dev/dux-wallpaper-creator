import {
  useHotkeys,
  type HotkeyCallback,
  type RegisterableHotkey,
  type UseHotkeyOptions,
} from "@tanstack/react-hotkeys";
import { openShapes } from "@/components/panel/shape-tab";
import { canvasEl, sidebarEl } from "@/lib/focus-dom";
import { focusCanvas, focusSidebar, selectAndAnnounce } from "@/a11y/focus-zones";
import { PALETTE } from "@/lib/palette";
import { patternLabel } from "@/lib/patterns";
import { clamp, normDeg, round } from "@/lib/utils";
import { say, sayActive, sayLayerPosition } from "@/a11y/announce";
import { armable } from "@/hooks/shortcuts/arm";
import {
  selectActive,
  selectActiveIndex,
  useWallpaper,
  wallpaper,
  wallpaperStore,
} from "@/store/wallpaper";
import { ui, uiStore, useUi } from "@/store/ui";

const hasActive = () => wallpaperStore.state.activeId !== null;

const step = (event: KeyboardEvent) => (event.shiftKey ? 10 : 1);

const moveBy = (deltaX: number, deltaY: number, event: KeyboardEvent) => {
  if (!hasActive()) return;
  const stepAmount = step(event);
  wallpaper.moveActiveBy(deltaX * stepAmount, deltaY * stepAmount);
  sayActive();
};

const snap15 = (rotation: number, direction: number) =>
  normDeg(
    direction > 0
      ? Math.ceil((rotation + 0.01) / 15) * 15
      : Math.floor((rotation - 0.01) / 15) * 15,
  );

const rotateBy = (direction: number, event: KeyboardEvent) => {
  const active = selectActive(wallpaperStore.state);
  if (!active) return;
  const cur = normDeg(active.rot);
  wallpaper.patchActive({
    rot: event.shiftKey ? snap15(cur, direction) : normDeg(cur + direction),
  });
  sayActive();
};

const resizeBy = (direction: number, event: KeyboardEvent) => {
  const active = selectActive(wallpaperStore.state);
  if (!active) return;
  wallpaper.resizeActive(active.size + direction * step(event));
  sayActive();
};

const opacityBy = (direction: number, event: KeyboardEvent) => {
  const active = selectActive(wallpaperStore.state);
  if (!active) return;
  const next = clamp(
    Math.round(((active.opacity ?? 1) + direction * (event.shiftKey ? 0.1 : 0.01)) * 100),
    10,
    100,
  );
  wallpaper.patchActive({ opacity: next >= 100 ? undefined : next / 100 });
  sayActive();
};

const reorder = (direction: number) => {
  const before = selectActiveIndex(wallpaperStore.state);
  wallpaper.reorderActive(direction);
  sayLayerPosition(before);
};

const deleteActive = () => {
  if (!hasActive()) return;
  wallpaper.deleteActive();
  say("Shape deleted", 150);
};

const stepZone = (direction: 1 | -1, event: KeyboardEvent) => {
  // Step shapes only for keydowns that started on the canvas.
  // Prevents tabbing out of the controls focuses the second instead of the first shape
  // because the canvas itself handles the tab as well
  const canvas = canvasEl();
  if (!canvas || !(event.target instanceof Element) || !canvas.contains(event.target)) return;

  const { layers, activeId } = wallpaperStore.state;
  const activeIndex = layers.findIndex((layer) => layer.id === activeId);
  const next = activeIndex < 0 ? (direction > 0 ? 0 : layers.length - 1) : activeIndex + direction;

  if (next < 0 || next >= layers.length) {
    // Forward past the top shape exits to the browser (native behavior)
    // backward past the bottom shape goes to the sidebar
    if (direction < 0 && focusSidebar("end")) event.preventDefault();
    return;
  }

  event.preventDefault();
  selectAndAnnounce(layers[next]);
};

const switchZone = (edge: "start" | "end", canvasFocused: boolean) => {
  if (!canvasFocused || !focusSidebar(edge)) focusCanvas();
};

const leaveCanvas = (bgMode: boolean) => {
  if (bgMode) {
    ui.toggleBgMode(false);
    return;
  }
  if (!sidebarEl()) {
    ui.setPanel("full");
    requestAnimationFrame(() => focusSidebar("start"));
    return;
  }
  focusSidebar("start");
};

const setPatternStrength = (direction: number, event: KeyboardEvent) => {
  wallpaper.setPatternOpacity(
    wallpaperStore.state.prefs.opacity + direction * (event.shiftKey ? 0.1 : 0.01),
  );
  say(`Pattern strength ${Math.round(wallpaperStore.state.prefs.opacity * 100)}%`);
};

const setPatternSize = (direction: number, event: KeyboardEvent) => {
  wallpaper.setPatternScale(
    wallpaperStore.state.prefs.patternScale + direction * (event.shiftKey ? 0.5 : 0.1),
  );
  say(`Pattern size ${round(wallpaperStore.state.prefs.patternScale, 1)}`);
};

const cyclePattern = (direction: 1 | -1) => {
  wallpaper.cyclePattern(direction);
  say(`Pattern: ${patternLabel(wallpaperStore.state.prefs.pattern)}`, 250);
};

const togglePattern = () => {
  wallpaper.togglePattern();
  ui.announce(
    wallpaperStore.state.prefs.pattern === "none"
      ? "Background pattern off"
      : "Background pattern on",
  );
};

interface BindOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreInputs?: boolean;
}

const bind = (
  hotkey: RegisterableHotkey,
  callback: HotkeyCallback,
  { preventDefault = true, enabled, ignoreInputs }: BindOptions = {},
) => {
  const options: UseHotkeyOptions = { preventDefault };
  if (enabled !== undefined) options.enabled = enabled;
  if (ignoreInputs !== undefined) options.ignoreInputs = ignoreInputs;
  return { hotkey, callback, options };
};

// only active when pressed without modifier
const plain = (run: (event: KeyboardEvent) => void) => (event: KeyboardEvent) => {
  if (!event.altKey && !event.ctrlKey && !event.metaKey) run(event);
};

// some commands should not fire again on holding them
const once = (run: () => void) => (event: KeyboardEvent) => {
  if (!event.repeat) run();
};

export const useShortcuts = () => {
  const { picking, sheetOpen, dialogOpen, exportMenuOpen, randomizeOpen, bgMode, canvasFocused } =
    useUi((state) => ({
      picking: state.picker !== null,
      sheetOpen: state.sheet !== null,
      dialogOpen: state.shortcutsOpen,
      exportMenuOpen: state.exportMenuOpen,
      randomizeOpen: state.randomizeOpen,
      bgMode: state.bgMode,
      canvasFocused: state.canvasFocused,
    }));
  const active = useWallpaper((state) => state.activeId !== null);

  const modal = picking || sheetOpen || dialogOpen;
  const overlay = modal || exportMenuOpen || randomizeOpen;
  const live = !overlay;
  const onCanvas = canvasFocused && live;
  const shapeKeys = live && active && !bgMode;
  const bgKeys = live && bgMode;

  useHotkeys(
    [
      bind("Mod+Z", wallpaper.undo, { enabled: !overlay, ignoreInputs: true }),
      bind("Mod+Shift+Z", wallpaper.redo, { enabled: !overlay, ignoreInputs: true }),
      bind("Mod+Y", wallpaper.redo, { enabled: !overlay, ignoreInputs: true }),
      bind("Mod+S", () => ui.setExportMenuOpen(!exportMenuOpen), {
        enabled: !overlay,
        ignoreInputs: true,
      }),
      bind(
        "Shift+L",
        () => {
          if (uiStore.state.aligning) {
            wallpaper.confirmAlignment();
            ui.setAligning(false);
          } else {
            wallpaper.beginAlignment();
            ui.setAligning(true);
          }
        },
        { enabled: !overlay, ignoreInputs: true },
      ),
      bind(
        "Shift+R",
        () => {
          if (uiStore.state.aligning) {
            wallpaper.cancelAlignment();
            ui.setAligning(false);
          }
          ui.setRandomizeOpen(true);
        },
        { enabled: !overlay, ignoreInputs: true },
      ),
      bind("?", () => ui.setShortcutsOpen(true), { enabled: !dialogOpen }),
      bind("F1", () => ui.setShortcutsOpen(true), { enabled: !dialogOpen }),
      bind("F6", () => switchZone("start", canvasFocused), {
        enabled: !overlay,
        ignoreInputs: false,
      }),
      bind("Shift+F6", () => switchZone("end", canvasFocused), {
        enabled: !overlay,
        ignoreInputs: false,
      }),
      bind("N", () => openShapes("add"), { enabled: !overlay }),
    ],
    { conflictBehavior: "allow" },
  );

  useHotkeys(
    [
      bind("Tab", (event) => stepZone(1, event), { enabled: onCanvas, preventDefault: false }),
      bind("Shift+Tab", (event) => stepZone(-1, event), {
        enabled: onCanvas,
        preventDefault: false,
      }),
      bind("Escape", () => leaveCanvas(bgMode), { enabled: onCanvas }),

      bind("Delete", deleteActive, { enabled: shapeKeys }),
      bind("Backspace", deleteActive, { enabled: shapeKeys }),
      bind(
        "Mod+D",
        () => {
          if (!hasActive()) return;
          wallpaper.duplicateActive();
          sayActive(150);
        },
        { enabled: shapeKeys, ignoreInputs: true },
      ),

      ...(
        [
          ["ArrowUp", 0, -1],
          ["[KeyW]", 0, -1],
          ["ArrowDown", 0, 1],
          ["[KeyS]", 0, 1],
          ["ArrowLeft", -1, 0],
          ["[KeyA]", -1, 0],
          ["ArrowRight", 1, 0],
          ["[KeyD]", 1, 0],
        ] as const
      ).flatMap(([key, deltaX, deltaY]) => [
        bind(
          key as RegisterableHotkey,
          plain((event) => moveBy(deltaX, deltaY, event)),
          { enabled: shapeKeys },
        ),
        bind(
          `Shift+${key}` as RegisterableHotkey,
          plain((event) => moveBy(deltaX, deltaY, event)),
          { enabled: shapeKeys },
        ),
      ]),

      ...(
        [
          [",", -1],
          [".", 1],
          ["[KeyQ]", -1],
          ["[KeyE]", 1],
        ] as const
      ).flatMap(([key, direction]) => [
        bind(
          key as RegisterableHotkey,
          plain((event) => rotateBy(direction, event)),
          { enabled: shapeKeys },
        ),
        bind(
          `Shift+${key}` as RegisterableHotkey,
          plain((event) => rotateBy(direction, event)),
          { enabled: shapeKeys },
        ),
      ]),

      bind("R", (event) => resizeBy(1, event), { enabled: shapeKeys }),
      bind("Shift+R", (event) => resizeBy(1, event), { enabled: shapeKeys }),
      bind("F", (event) => resizeBy(-1, event), { enabled: shapeKeys }),
      bind("Shift+F", (event) => resizeBy(-1, event), { enabled: shapeKeys }),

      bind("T", (event) => opacityBy(1, event), { enabled: shapeKeys }),
      bind("Shift+T", (event) => opacityBy(1, event), { enabled: shapeKeys }),
      bind("G", (event) => opacityBy(-1, event), { enabled: shapeKeys }),
      bind("Shift+G", (event) => opacityBy(-1, event), { enabled: shapeKeys }),

      ...PALETTE.map((fill, index) =>
        bind(
          `[Digit${index + 1}]` as RegisterableHotkey,
          plain(() => {
            wallpaper.setActiveFill(fill);
            sayActive(150);
          }),
          { enabled: shapeKeys },
        ),
      ),

      ...PALETTE.map((fill, index) =>
        bind(
          `Shift+[Digit${index + 1}]` as RegisterableHotkey,
          plain(() => {
            wallpaper.setActiveOverlap(fill);
            sayActive(150);
          }),
          { enabled: shapeKeys },
        ),
      ),
      bind(
        "Shift+[Digit0]",
        plain(() => {
          wallpaper.setActiveOverlap("none");
          sayActive(150);
        }),
        { enabled: shapeKeys },
      ),
      bind(
        "C",
        () => {
          wallpaper.cycleActiveFill(1);
          sayActive(150);
        },
        { enabled: shapeKeys },
      ),
      bind(
        "Shift+C",
        () => {
          wallpaper.cycleActiveFill(-1);
          sayActive(150);
        },
        { enabled: shapeKeys },
      ),

      bind("U", () => reorder(1), { enabled: shapeKeys }),
      bind("Shift+U", () => reorder(Infinity), { enabled: shapeKeys }),
      bind("J", () => reorder(-1), { enabled: shapeKeys }),
      bind("Shift+J", () => reorder(-Infinity), { enabled: shapeKeys }),

      bind(
        "M",
        once(() => {
          if (!hasActive()) return;
          wallpaper.shuffleActive();
          sayActive(150);
        }),
        { enabled: shapeKeys },
      ),
      bind(
        "X",
        (event) => armable(event, "x", "Clear everything? Press X again", wallpaper.clearAll),
        {
          enabled: live,
        },
      ),
      bind(
        "B",
        once(() => ui.toggleBgMode(!bgMode)),
        { enabled: live },
      ),
      bind("Shift+B", once(togglePattern), { enabled: live }),
      bind("P", once(ui.cyclePanel), { enabled: live }),
      bind("ArrowUp", () => cyclePattern(-1), { enabled: bgKeys }),
      bind("Shift+ArrowUp", () => cyclePattern(-1), { enabled: bgKeys }),
      bind("ArrowDown", () => cyclePattern(1), { enabled: bgKeys }),
      bind("Shift+ArrowDown", () => cyclePattern(1), { enabled: bgKeys }),
      bind("ArrowLeft", (event) => setPatternStrength(-1, event), { enabled: bgKeys }),
      bind("Shift+ArrowLeft", (event) => setPatternStrength(-1, event), { enabled: bgKeys }),
      bind("ArrowRight", (event) => setPatternStrength(1, event), { enabled: bgKeys }),
      bind("Shift+ArrowRight", (event) => setPatternStrength(1, event), { enabled: bgKeys }),
      bind("T", (event) => setPatternStrength(1, event), { enabled: bgKeys }),
      bind("Shift+T", (event) => setPatternStrength(1, event), { enabled: bgKeys }),
      bind("G", (event) => setPatternStrength(-1, event), { enabled: bgKeys }),
      bind("Shift+G", (event) => setPatternStrength(-1, event), { enabled: bgKeys }),
      bind("R", (event) => setPatternSize(1, event), { enabled: bgKeys }),
      bind("Shift+R", (event) => setPatternSize(1, event), { enabled: bgKeys }),
      bind("F", (event) => setPatternSize(-1, event), { enabled: bgKeys }),
      bind("Shift+F", (event) => setPatternSize(-1, event), { enabled: bgKeys }),
    ],
    { conflictBehavior: "allow" },
  );

  useHotkeys(
    [
      bind("Escape", ui.closePicker, { enabled: picking }),
      bind("N", ui.closePicker, { enabled: picking }),
      bind("Escape", ui.closeSheet, { enabled: sheetOpen }),
      bind("N", ui.closeSheet, { enabled: sheetOpen }),
    ],
    { ignoreInputs: true, conflictBehavior: "allow" },
  );
};
