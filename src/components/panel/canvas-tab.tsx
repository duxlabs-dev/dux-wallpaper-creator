import { HoldButton } from "@/components/ui/hold-button";
import { defaultPrefs } from "@/lib/prefs";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { useWallpaper, wallpaper } from "@/store/wallpaper";
import { DeleteForever, RestartAlt } from "material-symbols/rounded";
import { FormatPicker } from "./format-picker";
import { PatternPicker } from "./pattern-picker";

export function CanvasTab() {
  const prefs = useWallpaper((state) => state.prefs);
  const defaults = defaultPrefs();
  const canvasIsDefault =
    prefs.format === defaults.format &&
    prefs.orientation === defaults.orientation &&
    prefs.pattern === defaults.pattern &&
    prefs.opacity === defaults.opacity &&
    prefs.patternScale === defaults.patternScale;

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
        <HoldButton
          icon={<RestartAlt />}
          label="Reset canvas settings"
          title="Hold to reset the format and pattern"
          releasedTooEarly="Hold the button to reset the canvas settings."
          disabled={canvasIsDefault}
          onConfirm={wallpaper.resetCanvas}
        />
        <HoldButton
          variant="danger"
          icon={<DeleteForever />}
          label="Clear everything"
          title="Hold to remove all shapes and the pattern (X)"
          releasedTooEarly="Hold the button to clear everything."
          aria-keyshortcuts={ariaKeyshortcuts("X")}
          onConfirm={wallpaper.clearAll}
        />
      </div>
    </section>
  );
}
