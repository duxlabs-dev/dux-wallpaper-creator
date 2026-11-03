import { RadioItem } from "./radio-group";
import { cssColor, cssOnColor, type PaletteColor } from "@/lib/palette";
import { Check } from "material-symbols/rounded";

interface SwatchProps {
  color: PaletteColor;
}

export function Swatch({ color }: SwatchProps) {
  return (
    <RadioItem
      value={color}
      aria-label={color.replace("-", " ")}
      className="inline-flex size-[30px] items-center justify-center rounded-full border-0 p-0 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-on-surface)_25%,transparent)] focus-ring [&>svg]:size-[18px] [&>svg]:scale-0 [&>svg]:transition-transform [&>svg]:duration-(--duration-fast-spatial) [&>svg]:ease-fast-spatial data-checked:[&>svg]:scale-100"
      style={{ background: cssColor(color), color: cssOnColor(color) }}
    >
      <Check />
    </RadioItem>
  );
}
