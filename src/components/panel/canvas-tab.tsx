import { Button } from "@/components/ui/button";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { wallpaper } from "@/store/wallpaper";
import { FormatPicker } from "./format-picker";
import { PatternPicker } from "./pattern-picker";
import { DeleteForever } from "material-symbols/rounded";

export function CanvasTab() {
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
        <Button
          variant="danger"
          title="Clear everything (X)"
          aria-keyshortcuts={ariaKeyshortcuts("X")}
          onClick={wallpaper.clearAll}
        >
          <DeleteForever />
          Clear everything
        </Button>
      </div>
    </section>
  );
}
