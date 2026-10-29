import { useState } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { Slider } from "@/components/ui/slider";
import { hexToRgb } from "@/lib/color";
import { BASE_HUE, toHct } from "@/lib/theme";
import { normDeg } from "@/lib/utils";
import { useWallpaper, wallpaper } from "@/store/wallpaper";
import { ui } from "@/store/ui";
import { Colorize } from "material-symbols/rounded";

interface HuePickerProps {
  track: string;
  placeholder: string;
}

export function HuePicker({ track, placeholder }: HuePickerProps) {
  const hue = useWallpaper((state) => state.prefs.hue);
  const [hex, setHex] = useState("");

  const applyHex = (text: string) => {
    const rgb = hexToRgb(text);
    if (!rgb) {
      if (text.trim()) ui.showToast("Use a hex like #4c662b", 2000);
      return;
    }
    const { chroma, hue } = toHct(rgb);
    if (chroma < 3) {
      ui.showToast("That color is gray, so it has no hue.", 2000);
      return;
    }
    wallpaper.setHue(hue - BASE_HUE);
  };

  const onSliderDragStart = () => document.documentElement.classList.add("no-transitions");
  const onSliderDragEnd = () => document.documentElement.classList.remove("no-transitions");
  const onHueChange = (value: number) => {
    setHex("");
    wallpaper.setHue(value - BASE_HUE);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <FieldLabel icon={<Colorize />} htmlFor="hue" className="flex-1">
          Hue
        </FieldLabel>
        <input
          type="text"
          maxLength={7}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-label="Hex color"
          title="Type a hex color to use its hue"
          value={hex}
          onChange={(event) => {
            setHex(event.target.value);
            if (/^#?[0-9a-f]{6}$/i.test(event.target.value.trim())) applyHex(event.target.value);
          }}
          onBlur={(event) => applyHex(event.target.value)}
          onKeyDown={(event) =>
            (event.key === "Enter" || event.key === "Escape") && event.currentTarget.blur()
          }
          className="h-10 w-28 rounded-[4px] border border-outline bg-transparent px-3 py-0 font-[inherit] text-sm text-on-surface transition-[border-color,box-shadow] duration-(--duration-default-effects) ease-default-effects placeholder:text-on-surface-variant hover:border-on-surface focus:border-primary focus:shadow-[0_0_0_1px_var(--color-primary)] focus:outline-none"
        />
      </div>
      <Slider
        id="hue"
        min={0}
        max={359.5}
        step={0.5}
        value={+normDeg(BASE_HUE + hue).toFixed(1)}
        track={track}
        onChange={onHueChange}
        onReset={() => {
          setHex("");
          wallpaper.setHue(0);
        }}
        onPointerDown={onSliderDragStart}
        onPointerUp={onSliderDragEnd}
        onPointerCancel={onSliderDragEnd}
      />
    </div>
  );
}
