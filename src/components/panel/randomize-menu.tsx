import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { type Range } from "@/components/ui/range-slider";
import { RangeSliderField } from "@/components/ui/range-slider-field";
import { SliderField } from "@/components/ui/slider-field";
import { SubpageHeader } from "@/components/ui/subpage-header";
import { Switch as OptionSwitch } from "@/components/ui/switch";
import { focusCanvas } from "@/a11y/focus-zones";
import {
  RANDOMIZE_LIMITS,
  SIZE_MAX_WITHOUT_SPILL,
  type RandomizeOptions,
  type RangeKey,
  type RangeToggle,
  type Toggle,
  type ToggleKey,
} from "@/lib/randomize";
import { loadRandomizeOptions, persistRandomizeOptions } from "@/lib/storage";
import { randomizeWithOptions } from "@/lib/randomize-action";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { ui, useUi } from "@/store/ui";
import { useWallpaper } from "@/store/wallpaper";
import {
  ArrowRange,
  Casino,
  Distance,
  FilterAlt,
  FormatColorFill,
  Gesture,
  KeyboardArrowDown,
  Layers,
  LineCurve,
  Numbers,
  Opacity,
  OpenInFull,
  Palette,
  Pattern,
  RotateRight,
  ScatterPlot,
  Shapes,
  Shuffle,
  SwapHoriz,
  SwapVert,
  Tune,
  ZoomOutMap,
} from "material-symbols/rounded";

// "Select all" doesn't include limiting overlap count and minimum gap since these options would make the result less random
const SELECT_ALL_RANDOMIZE_KEYS = [
  "positionX",
  "positionY",
  "shapeCount",
  "shapeType",
  "shapeIndex",
  "blobContour",
  "blobEdges",
  "blobSmoothness",
  "size",
  "rotation",
  "opacity",
  "fill",
  "overlapColor",
  "hue",
  "pattern",
  "patternOpacity",
  "patternScale",
  "layerOrder",
  "allowOverlap",
  "canvasSpill",
] as const satisfies readonly ToggleKey[];

const SWITCH_KEYS = [
  ...SELECT_ALL_RANDOMIZE_KEYS,
  "minimumGap",
  "limitOverlapCount",
] as const satisfies readonly ToggleKey[];

export function RandomizeButton({ mini }: { mini: boolean }) {
  const open = useUi((state) => state.randomizeOpen);
  return (
    <IconButton
      label="Randomize"
      title="Open randomize options (Shift+I)"
      aria-controls="panel-randomize"
      aria-expanded={open}
      aria-keyshortcuts={ariaKeyshortcuts("Shift+I")}
      variant="tonal"
      className={mini ? "size-12 rounded-[14px]" : "size-12 rounded-3xl"}
      onClick={() => ui.setRandomizeOpen(true)}
    >
      <Casino />
    </IconButton>
  );
}

export function RandomizeSettings() {
  const count = useWallpaper((state) => state.layers.length);
  const [options, setOptions] = useState(loadRandomizeOptions);
  const backButton = useRef<HTMLButtonElement>(null);
  const open = useUi((state) => state.randomizeOpen);
  const wasOpen = useRef(open);
  const enabledCount = SELECT_ALL_RANDOMIZE_KEYS.filter((key) => options[key].enabled).length;
  const allEnabled = enabledCount === SELECT_ALL_RANDOMIZE_KEYS.length;
  const someEnabled = enabledCount > 0 && !allEnabled;

  useEffect(() => {
    if (open) backButton.current?.focus({ preventScroll: true });
    else if (wasOpen.current) focusCanvas(undefined, { keepSelection: true });
    wasOpen.current = open;
  }, [open]);

  useEffect(() => persistRandomizeOptions(options), [options]);

  const patch = <K extends ToggleKey>(key: K, changes: Partial<RandomizeOptions[K]>) =>
    setOptions((current) => ({ ...current, [key]: { ...current[key], ...changes } }));

  const switchProps = (key: ToggleKey) => ({
    checked: options[key].enabled,
    onChange: (enabled: boolean) => patch(key, { enabled }),
  });

  const rangeProps = (key: RangeKey) => ({
    ...RANDOMIZE_LIMITS[key],
    value: [options[key].min, options[key].max] as Range,
    onChange: ([min, max]: Range) => patch(key, { min, max }),
  });

  const capSizeWithoutSpill = (size: RangeToggle) => ({
    ...size,
    min: Math.min(size.min, SIZE_MAX_WITHOUT_SPILL),
    max: Math.min(size.max, SIZE_MAX_WITHOUT_SPILL),
  });

  const setAllSwitches = (value: boolean) =>
    setOptions((current) => {
      const next = { ...current };
      for (const key of SWITCH_KEYS)
        (next as Record<ToggleKey, Toggle>)[key] = {
          ...next[key],
          enabled: value && (SELECT_ALL_RANDOMIZE_KEYS as readonly ToggleKey[]).includes(key),
        };
      if (!next.canvasSpill.enabled) next.size = capSizeWithoutSpill(next.size);
      return next;
    });

  return (
    <section
      id="panel-randomize"
      aria-label="Randomize options"
      className="flex min-h-0 flex-1 flex-col text-sm text-on-surface"
    >
      <SubpageHeader
        title="Randomize"
        onBack={() => ui.setRandomizeOpen(false)}
        backRef={backButton}
        endContent={
          <Checkbox
            label="Select all randomization options"
            checked={allEnabled}
            indeterminate={someEnabled}
            onChange={setAllSwitches}
          />
        }
      />
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          <OptionGroup title="Placement" icon={<Layers />} open>
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-shape-count"
                label="Shape count"
                icon={<Numbers />}
                {...switchProps("shapeCount")}
              />
              {options.shapeCount.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-shape-count-range"
                    icon={<ArrowRange />}
                    label="Shape count"
                    {...rangeProps("shapeCount")}
                  />
                </NestedControls>
              )}
            </div>
            <OptionSwitch
              id="randomize-position-x"
              label="Horizontal position"
              icon={<SwapHoriz />}
              tooltip="Randomizes each layer’s horizontal offset within the canvas."
              {...switchProps("positionX")}
            />
            <OptionSwitch
              id="randomize-position-y"
              label="Vertical position"
              icon={<SwapVert />}
              tooltip="Randomizes each layer’s vertical offset within the canvas."
              {...switchProps("positionY")}
            />
            <SliderField
              id="randomize-spread-strength"
              icon={<ScatterPlot />}
              label="Spread strength"
              {...RANDOMIZE_LIMITS.spreadStrength}
              value={options.spreadStrength}
              display={`${options.spreadStrength}%`}
              tooltip="Controls how dispersed the shapes spread across the canvas."
              onChange={(spreadStrength) =>
                setOptions((current) => ({ ...current, spreadStrength }))
              }
            />
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-min-gap"
                label="Keep a minimum gap"
                icon={<Distance />}
                tooltip="Keeps shapes separated by a minimum distance to avoid overlap and crowding."
                {...switchProps("minimumGap")}
              />
              {options.minimumGap.enabled && (
                <NestedControls>
                  <SliderField
                    id="randomize-gap"
                    icon={<Distance />}
                    label="Minimum gap"
                    {...RANDOMIZE_LIMITS.minimumGap}
                    value={options.minimumGap.gap}
                    display={`${options.minimumGap.gap} px`}
                    onChange={(gap) => patch("minimumGap", { gap })}
                  />
                </NestedControls>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-overlap"
                label="Allow overlap"
                icon={<Layers />}
                tooltip="Allows shapes to overlap instead of staying separate."
                {...switchProps("allowOverlap")}
              />
              {options.allowOverlap.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-overlap-depth"
                    icon={<Layers />}
                    label="Overlap depth"
                    format={(value) => `${value}%`}
                    tooltip="How deep overlapping shapes may overlap, in % of the smaller one. It doesn’t force shapes to overlap."
                    {...rangeProps("allowOverlap")}
                  />
                </NestedControls>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-overlap-count"
                label="Limit overlapping neighbors"
                icon={<FilterAlt />}
                tooltip="Caps how many neighboring shapes can overlap each layer."
                {...switchProps("limitOverlapCount")}
              />
              {options.limitOverlapCount.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-overlap-count-range"
                    icon={<ArrowRange />}
                    label="Overlapping neighbors"
                    {...rangeProps("limitOverlapCount")}
                  />
                  {!options.allowOverlap.enabled && options.limitOverlapCount.min > 0 && (
                    <p role="status" className="m-0 text-xs text-on-surface-variant">
                      Minimum neighbors requires overlap; no-overlap takes priority.
                    </p>
                  )}
                </NestedControls>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-spill"
                label="Allow shapes beyond canvas"
                icon={<OpenInFull />}
                tooltip="Lets shapes extend outside the canvas instead of staying fully within bounds."
                checked={options.canvasSpill.enabled}
                onChange={(enabled) =>
                  setOptions((current) => ({
                    ...current,
                    canvasSpill: { ...current.canvasSpill, enabled },
                    size: enabled ? current.size : capSizeWithoutSpill(current.size),
                  }))
                }
              />
              {options.canvasSpill.enabled && (
                <NestedControls>
                  <SliderField
                    id="randomize-bleed"
                    icon={<OpenInFull />}
                    label="Canvas spill"
                    {...RANDOMIZE_LIMITS.canvasSpill}
                    value={options.canvasSpill.bleed}
                    display={`${options.canvasSpill.bleed}%`}
                    onChange={(bleed) => patch("canvasSpill", { bleed })}
                  />
                </NestedControls>
              )}
            </div>
          </OptionGroup>
          <OptionGroup title="Shapes" icon={<Shapes />} open>
            <OptionSwitch
              id="randomize-shape-type"
              label="Shape or blob type"
              icon={<Shapes />}
              tooltip="Switches some layers between regular shapes and blob forms."
              {...switchProps("shapeType")}
            />
            <OptionSwitch
              id="randomize-shape-index"
              label="Randomize shape"
              icon={<Shapes />}
              tooltip="Chooses a different shape variant for each layer."
              {...switchProps("shapeIndex")}
            />
            <OptionSwitch
              id="randomize-blob-contour"
              label="Randomize blob shape"
              icon={<Gesture />}
              tooltip="Randomizes the blob silhouette instead of keeping the same contour."
              {...switchProps("blobContour")}
            />
            <OptionSwitch
              id="randomize-blob-edges"
              label="Blob edge count"
              icon={<Numbers />}
              tooltip="Changes how many edges the blob uses."
              {...switchProps("blobEdges")}
            />
            {options.blobEdges.enabled && (
              <NestedControls>
                <RangeSliderField
                  id="randomize-blob-edges-range"
                  icon={<ArrowRange />}
                  label="Blob edge count"
                  {...rangeProps("blobEdges")}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-blob-smoothness"
              label="Blob smoothness"
              icon={<LineCurve />}
              tooltip="Adjusts how round or faceted the blob edges appear."
              {...switchProps("blobSmoothness")}
            />
            {options.blobSmoothness.enabled && (
              <NestedControls>
                <RangeSliderField
                  id="randomize-blob-smoothness-range"
                  icon={<ArrowRange />}
                  label="Blob smoothness"
                  format={(value) => `${value} ${value === 1 ? "step" : "steps"}`}
                  {...rangeProps("blobSmoothness")}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-size"
              label="Shape size"
              icon={<ZoomOutMap />}
              tooltip="Randomizes the size range for each layer."
              {...switchProps("size")}
            />
            {options.size.enabled && (
              <NestedControls>
                <RangeSliderField
                  id="randomize-size-range"
                  icon={<ArrowRange />}
                  label="Shape size"
                  format={(value) => `${value}%`}
                  {...rangeProps("size")}
                  max={
                    options.canvasSpill.enabled ? RANDOMIZE_LIMITS.size.max : SIZE_MAX_WITHOUT_SPILL
                  }
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-rotation"
              label="Rotation"
              icon={<RotateRight />}
              tooltip="Randomizes each layer’s rotation angle."
              {...switchProps("rotation")}
            />
            {options.rotation.enabled && (
              <NestedControls>
                <SliderField
                  id="randomize-rotation-range"
                  icon={<ArrowRange />}
                  label="Rotation range"
                  {...RANDOMIZE_LIMITS.rotation}
                  value={options.rotation.range}
                  display={`±${options.rotation.range}°`}
                  onChange={(range) => patch("rotation", { range })}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-opacity"
              label="Shape opacity"
              icon={<Opacity />}
              tooltip="Randomizes each layer’s transparency."
              {...switchProps("opacity")}
            />
            {options.opacity.enabled && (
              <NestedControls>
                <RangeSliderField
                  id="randomize-opacity-range"
                  icon={<ArrowRange />}
                  label="Shape opacity"
                  format={(value) => `${value}%`}
                  {...rangeProps("opacity")}
                />
              </NestedControls>
            )}
          </OptionGroup>
          <OptionGroup title="Colors" icon={<Palette />}>
            <OptionSwitch
              id="randomize-hue"
              label="Hue"
              icon={<FormatColorFill />}
              tooltip="Shifts the hue of all colors by a random amount within the range."
              {...switchProps("hue")}
            />
            {options.hue.enabled && (
              <NestedControls>
                <SliderField
                  id="randomize-hue-range"
                  icon={<ArrowRange />}
                  label="Hue variation"
                  {...RANDOMIZE_LIMITS.hue}
                  value={options.hue.range}
                  display={`±${options.hue.range}°`}
                  onChange={(range) => patch("hue", { range })}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-fill"
              label="Fill color"
              icon={<FormatColorFill />}
              tooltip="Randomizes which fill color each shape uses."
              {...switchProps("fill")}
            />
            <OptionSwitch
              id="randomize-overlap-color"
              label="Overlap color"
              icon={<Palette />}
              tooltip="Randomizes the color used where layers overlap."
              {...switchProps("overlapColor")}
            />
          </OptionGroup>
          <OptionGroup title="Background" icon={<Tune />}>
            <OptionSwitch
              id="randomize-pattern"
              label="Pattern selection"
              icon={<Pattern />}
              tooltip="Chooses a different background pattern at random."
              {...switchProps("pattern")}
            />
            <OptionSwitch
              id="randomize-pattern-opacity"
              label="Pattern opacity"
              icon={<Opacity />}
              tooltip="Randomizes how visible the background pattern is."
              {...switchProps("patternOpacity")}
            />
            {options.patternOpacity.enabled && (
              <NestedControls>
                <RangeSliderField
                  id="randomize-pattern-opacity-range"
                  icon={<ArrowRange />}
                  label="Pattern opacity"
                  format={(value) => `${Math.round(value * 100)}%`}
                  {...rangeProps("patternOpacity")}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-pattern-scale"
              label="Pattern scale"
              icon={<ZoomOutMap />}
              tooltip="Randomizes the size of the background pattern tiles."
              {...switchProps("patternScale")}
            />
            {options.patternScale.enabled && (
              <NestedControls>
                <RangeSliderField
                  id="randomize-pattern-scale-range"
                  icon={<ArrowRange />}
                  label="Pattern scale"
                  format={(value) => `${+value.toFixed(1)}×`}
                  {...rangeProps("patternScale")}
                />
              </NestedControls>
            )}
          </OptionGroup>
          <OptionGroup title="Layer order" icon={<Layers />}>
            <OptionSwitch
              id="randomize-layer-order"
              label="Shuffle stacking order"
              icon={<Layers />}
              tooltip="Randomizes which layers appear on top of others."
              {...switchProps("layerOrder")}
            />
          </OptionGroup>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-3 py-3">
        <Button
          variant="filled"
          disabled={
            !count &&
            !options.shapeCount.enabled &&
            !options.hue.enabled &&
            !options.pattern.enabled &&
            !options.patternOpacity.enabled &&
            !options.patternScale.enabled
          }
          onClick={() => randomizeWithOptions(options)}
          className="w-full"
        >
          <Shuffle />
          Randomize
        </Button>
      </div>
    </section>
  );
}

function OptionGroup({
  title,
  icon,
  children,
  open = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <details
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="group"
    >
      <summary className="hover:state-layer-4 flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-1 text-[15px] focus-ring active:state-layer-8 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 font-semibold">{title}</span>
        <span className="flex size-6 shrink-0 items-center justify-center text-on-surface-variant [&>svg]:size-5">
          {icon}
        </span>
        <KeyboardArrowDown
          className={`ease-effect size-5 shrink-0 text-on-surface-variant transition-transform duration-300 ${expanded ? "rotate-180" : "rotate-0"}`}
        />
      </summary>
      <div className="flex flex-col gap-2 pb-2 pl-1">{children}</div>
    </details>
  );
}

function NestedControls({ children }: { children: ReactNode }) {
  return <div className="border-l border-outline-variant pl-3">{children}</div>;
}
