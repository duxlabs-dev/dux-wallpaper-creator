import { Button } from "@/components/ui/button";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { wallpaper } from "@/store/wallpaper";
import { FormatPicker } from "./format-picker";
import { HuePicker } from "./hue-picker";
import { PatternPicker } from "./pattern-picker";
import { SchemePicker } from "./scheme-picker";
import { ThemeToggle } from "./theme-toggle";
import { DeleteForever } from "material-symbols/rounded";

interface GlobalTabProps {
  hueTrack: string;
  primaryHex: string;
}

export function GlobalTab({ hueTrack, primaryHex }: GlobalTabProps) {
  return (
    <section
      id="panel-global"
      role="tabpanel"
      aria-labelledby="tab-global"
      className="flex animate-fade-up flex-col gap-7"
    >
      <ThemeToggle />
      <FormatPicker />
      <HuePicker track={hueTrack} placeholder={primaryHex} />
      <SchemePicker />
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
