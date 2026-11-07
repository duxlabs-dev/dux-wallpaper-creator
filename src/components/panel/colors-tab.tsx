import { HoldButton } from "@/components/ui/hold-button";
import { defaultPrefs } from "@/lib/prefs";
import { DEFAULT_DARK, useWallpaper, wallpaper } from "@/store/wallpaper";
import { RestartAlt } from "material-symbols/rounded";
import { HuePicker } from "./hue-picker";
import { SchemePicker } from "./scheme-picker";
import { ThemeToggle } from "./theme-toggle";

interface ColorsTabProps {
  hueTrack: string;
  primaryHex: string;
}

export function ColorsTab({ hueTrack, primaryHex }: ColorsTabProps) {
  const { prefs, dark } = useWallpaper((state) => ({ prefs: state.prefs, dark: state.dark }));
  const defaults = defaultPrefs();
  const colorsAreDefault =
    dark === DEFAULT_DARK &&
    prefs.hue === defaults.hue &&
    prefs.scheme === defaults.scheme &&
    prefs.spec === defaults.spec;

  return (
    <section
      id="panel-colors"
      role="tabpanel"
      aria-labelledby="tab-colors"
      className="flex animate-fade-up flex-col gap-0.5 panel-sections"
    >
      <ThemeToggle />
      <HuePicker track={hueTrack} placeholder={primaryHex} />
      <SchemePicker />
      <div className="flex flex-col gap-2">
        <HoldButton
          icon={<RestartAlt />}
          label="Reset colors"
          title="Hold to reset the theme, hue, scheme and color spec"
          releasedTooEarly="Hold the button to reset the colors."
          disabled={colorsAreDefault}
          onConfirm={wallpaper.resetColors}
        />
      </div>
    </section>
  );
}
