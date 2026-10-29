import { FieldLabel } from "@/components/ui/field-label";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { usePatternTile } from "@/hooks/use-pattern-tile";
import {
  PATTERN_OPACITY,
  PATTERN_SCALE,
  patternLabel,
  PATTERNS,
  patternUrl,
  type PatternId,
} from "@/lib/patterns";
import { useWallpaper, wallpaper } from "@/store/wallpaper";
import { Contrast, OpenInFull, Texture } from "material-symbols/rounded";

function PatternTile({ id }: { id: PatternId }) {
  const tile = usePatternTile(id);
  const src = patternUrl(id);
  const label = patternLabel(id);
  const maskSize = tile ? `64px ${Math.round((64 * tile[1]) / tile[0])}px` : "60px auto";
  return (
    <RadioItem
      value={id}
      title={label}
      aria-label={label}
      className="relative aspect-square overflow-hidden rounded-2xl border-0 bg-surface-container-high text-xs font-medium text-on-surface focus-ring morph hover:state-layer-8 active:rounded-[10px] data-checked:rounded-[28px] data-checked:bg-primary-container data-checked:text-on-primary-container"
    >
      {src ? (
        <span
          aria-hidden
          className="absolute inset-0 bg-primary opacity-80"
          style={{
            maskImage: `url("${src}")`,
            maskSize,
            WebkitMaskImage: `url("${src}")`,
            WebkitMaskSize: maskSize,
          }}
        />
      ) : (
        "None"
      )}
    </RadioItem>
  );
}

export function PatternPicker() {
  const { pattern, opacity, scale } = useWallpaper((state) => ({
    pattern: state.prefs.pattern,
    opacity: state.prefs.opacity,
    scale: state.prefs.patternScale,
  }));
  return (
    <>
      <div className="flex flex-col gap-2">
        <FieldLabel icon={<Texture />} htmlFor="pattern-select">
          Pattern
        </FieldLabel>
        <RadioGroup<PatternId>
          id="pattern-select"
          label="Background pattern"
          value={pattern}
          onChange={wallpaper.setPattern}
          className="grid grid-cols-4 gap-2"
        >
          {PATTERNS.map((id) => (
            <PatternTile key={id} id={id} />
          ))}
        </RadioGroup>
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel
          icon={<OpenInFull />}
          htmlFor="pattern-scale"
          title="Pattern size: R and F while in background mode"
        >
          Pattern size
        </FieldLabel>
        <Slider
          id="pattern-scale"
          min={PATTERN_SCALE.min}
          max={PATTERN_SCALE.max}
          step={0.1}
          value={scale}
          onChange={wallpaper.setPatternScale}
          onReset={() => wallpaper.setPatternScale(PATTERN_SCALE.default)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel
          icon={<Contrast />}
          htmlFor="pattern-opacity"
          title="Pattern strength: ← and → or T and G while in background mode"
        >
          Pattern strength
        </FieldLabel>
        <Slider
          id="pattern-opacity"
          min={PATTERN_OPACITY.min * 100}
          max={PATTERN_OPACITY.max * 100}
          step={1}
          value={Math.round(opacity * 100)}
          onChange={(value) => wallpaper.setPatternOpacity(value / 100)}
          onReset={() => wallpaper.setPatternOpacity(PATTERN_OPACITY.default)}
        />
      </div>
    </>
  );
}
