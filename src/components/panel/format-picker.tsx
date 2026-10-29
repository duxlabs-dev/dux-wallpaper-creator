import { FieldLabel } from "@/components/ui/field-label";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import { Segmented } from "@/components/ui/segmented";
import {
  findFormat,
  FORMATS,
  MAX_PX,
  MIN_PX,
  type FormatId,
  type Orientation,
} from "@/lib/formats";
import { useWallpaper, wallpaper } from "@/store/wallpaper";
import { ImageAspectRatio } from "material-symbols/rounded";

const orientations = [
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
] as const;

const chipClass =
  "morph focus-ring flex h-14 flex-col items-center justify-center gap-1.5 rounded-2xl border-0 bg-surface-container-high text-xs font-medium leading-none text-on-surface hover:state-layer-8 active:rounded-[10px] data-checked:rounded-[28px] data-checked:bg-primary-container data-checked:text-on-primary-container";

function ChipIcon({ ratio, portrait }: { ratio: number; portrait: boolean }) {
  const aspectRatio = portrait ? 1 / ratio : ratio;
  const width = aspectRatio >= 1 ? 28 : 20 * aspectRatio;
  const height = aspectRatio >= 1 ? 28 / aspectRatio : 20;
  return <i className="block rounded-[3px] border-2 border-current" style={{ width, height }} />;
}

const inputClass =
  "no-spin min-w-0 flex-1 h-14 rounded-[4px] border border-outline bg-transparent px-4 py-0 font-[inherit] text-base text-on-surface transition-[border-color,box-shadow] duration-(--duration-default-effects) ease-default-effects hover:border-on-surface focus:border-primary focus:shadow-[0_0_0_1px_var(--color-primary)] focus:outline-none";

export function FormatPicker() {
  const { format, orientation, canvas } = useWallpaper((state) => ({
    format: state.prefs.format,
    orientation: state.prefs.orientation,
    canvas: state.canvas,
  }));
  const preset = findFormat(format);
  const portrait = orientation === "portrait";

  const commitCustom = (width: number, height: number) =>
    wallpaper.setFormat({ custom: { width: width, height: height } });

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel icon={<ImageAspectRatio />}>Format</FieldLabel>
      <RadioGroup<FormatId>
        label="Screen proportions"
        value={format}
        onChange={(format) => wallpaper.setFormat({ format: format })}
        className="grid grid-cols-4 gap-2"
      >
        {FORMATS.map((format) => (
          <RadioItem
            key={format.id}
            value={format.id}
            title={`${format.hint} · ${format.width} × ${format.height}`}
            className={chipClass}
          >
            <ChipIcon ratio={format.width / format.height} portrait={portrait} />
            {format.id}
          </RadioItem>
        ))}
        <RadioItem value="custom" title="Enter your own size" className={chipClass}>
          <i className="block h-5 w-7 rounded-[3px] border-2 border-dashed border-current" />
          Custom
        </RadioItem>
      </RadioGroup>
      {preset ? (
        <Segmented<Orientation>
          label="Orientation"
          value={orientation}
          options={orientations}
          onChange={(orientation) => wallpaper.setFormat({ orientation })}
        />
      ) : (
        <div className="flex items-center gap-2 text-on-surface-variant">
          <input
            key={`w${canvas.width}`}
            type="number"
            min={MIN_PX}
            max={MAX_PX}
            step={1}
            defaultValue={canvas.width}
            aria-label="Width in pixels"
            className={inputClass}
            onBlur={(event) => commitCustom(+event.target.value, canvas.height)}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          />
          <span aria-hidden>×</span>
          <input
            key={`h${canvas.height}`}
            type="number"
            min={MIN_PX}
            max={MAX_PX}
            step={1}
            defaultValue={canvas.height}
            aria-label="Height in pixels"
            className={inputClass}
            onBlur={(event) => commitCustom(canvas.width, +event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          />
          <span aria-hidden>px</span>
        </div>
      )}
      <div className="text-xs text-on-surface-variant">
        {preset ? `${preset.hint} · ` : ""}
        {canvas.width} × {canvas.height} px
      </div>
    </div>
  );
}
