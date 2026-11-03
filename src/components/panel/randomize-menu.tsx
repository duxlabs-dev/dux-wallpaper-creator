import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { SliderField } from "@/components/ui/slider-field";
import { SubpageHeader } from "@/components/ui/subpage-header";
import { Switch as OptionSwitch } from "@/components/ui/switch";
import { BLOB_MAX_EDGES, BLOB_MIN_EDGES, SMOOTHNESS } from "@/lib/shapes";
import { PATTERN_OPACITY, PATTERN_SCALE } from "@/lib/patterns";
import type { RandomizeOptions } from "@/lib/randomize";
import {
  loadRandomizeOptions,
  persistRandomizeOptions,
  subscribeToRandomizeOptionsReset,
} from "@/lib/storage";
import { DEFAULT_RANDOMIZE_OPTIONS } from "@/lib/randomize";
import { ui, useUi } from "@/store/ui";
import { wallpaper, useWallpaper } from "@/store/wallpaper";
import {
  Casino,
  Distance,
  FilterAlt,
  KeyboardArrowDown,
  Layers,
  Numbers,
  OpenInFull,
  Palette,
  RotateRight,
  Shuffle,
  SwapHoriz,
  SwapVert,
  Tune,
} from "material-symbols/rounded";

const SWITCH_KEYS = [
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
  "minimumGap",
  "allowOverlap",
  "limitOverlapCount",
  "canvasSpill",
] as const satisfies readonly (keyof RandomizeOptions)[];

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
] as const satisfies readonly (keyof RandomizeOptions)[];

export function RandomizeButton({ mini }: { mini: boolean }) {
  const open = useUi((state) => state.randomizeOpen);
  const button = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) button.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);
  return (
    <IconButton
      ref={button}
      label="Randomize"
      title="Open randomize options"
      aria-controls="panel-randomize"
      aria-expanded={open}
      variant="tonal"
      className={mini ? "size-12 rounded-[14px]" : "size-12 rounded-3xl"}
      onClick={() => {
        ui.setRandomizeOpen(true);
      }}
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
  const enabledCount = SELECT_ALL_RANDOMIZE_KEYS.filter((key) => options[key]).length;
  const allEnabled = enabledCount === SELECT_ALL_RANDOMIZE_KEYS.length;
  const someEnabled = enabledCount > 0 && !allEnabled;

  useEffect(() => {
    if (open) backButton.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => persistRandomizeOptions(options), [options]);

  useEffect(
    () => subscribeToRandomizeOptionsReset(() => setOptions({ ...DEFAULT_RANDOMIZE_OPTIONS })),
    [],
  );

  const setOption = <K extends keyof RandomizeOptions>(key: K, value: RandomizeOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const setAllSwitches = (value: boolean) =>
    setOptions((current) => {
      const next = { ...current };
      if (value) {
        for (const key of SWITCH_KEYS) next[key] = false;
        for (const key of SELECT_ALL_RANDOMIZE_KEYS) next[key] = true;
      } else {
        for (const key of SWITCH_KEYS) next[key] = false;
        next.sizeMin = Math.min(next.sizeMin, 100);
        next.sizeMax = Math.min(next.sizeMax, 100);
      }
      return next;
    });

  const randomize = () => {
    const satisfied = wallpaper.randomizeLayers(options);
    if (!satisfied) ui.showToast("Some shapes could not meet the requested placement rules");
  };

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
                checked={options.shapeCount}
                icon={<Numbers />}
                onChange={(value) => setOption("shapeCount", value)}
              />
              {options.shapeCount && (
                <NestedControls>
                  <RangeFields
                    prefix="shape-count"
                    label="Shape count"
                    minValue={options.countMin}
                    maxValue={options.countMax}
                    min={0}
                    max={40}
                    step={1}
                    display=""
                    setMin={(value) => setOption("countMin", value)}
                    setMax={(value) => setOption("countMax", value)}
                  />
                </NestedControls>
              )}
            </div>
            <OptionSwitch
              id="randomize-position-x"
              label="Horizontal position"
              checked={options.positionX}
              icon={<SwapHoriz />}
              tooltip="Randomizes each layer’s horizontal offset within the canvas."
              onChange={(value) => setOption("positionX", value)}
            />
            <OptionSwitch
              id="randomize-position-y"
              label="Vertical position"
              checked={options.positionY}
              icon={<SwapVert />}
              tooltip="Randomizes each layer’s vertical offset within the canvas."
              onChange={(value) => setOption("positionY", value)}
            />
            <SliderField
              id="randomize-spread-strength"
              icon={<Shuffle />}
              label="Spread strength"
              value={options.spreadStrength}
              min={0}
              max={100}
              step={5}
              display={`${options.spreadStrength}%`}
              tooltip="Controls how dispersed the shapes spread across the canvas."
              onChange={(value) => setOption("spreadStrength", value)}
            />
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-min-gap"
                label="Keep a minimum gap"
                checked={options.minimumGap}
                icon={<Distance />}
                tooltip="Keeps shapes separated by a minimum distance to avoid overlap and crowding."
                onChange={(value) => setOption("minimumGap", value)}
              />
              {options.minimumGap && (
                <NestedControls>
                  <SliderField
                    id="randomize-gap"
                    icon={<Distance />}
                    label="Minimum gap"
                    value={options.gap}
                    min={0}
                    max={400}
                    step={8}
                    display={`${options.gap} px`}
                    onChange={(value) => setOption("gap", value)}
                  />
                </NestedControls>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-overlap"
                label="Allow overlap"
                checked={options.allowOverlap}
                icon={<Layers />}
                tooltip="Allows shapes to overlap instead of staying separate."
                onChange={(value) => setOption("allowOverlap", value)}
              />
              {options.allowOverlap && (
                <NestedControls>
                  <>
                    <SliderField
                      id="randomize-overlap-min"
                      icon={<Layers />}
                      label="Minimum overlap depth"
                      value={options.overlapMin}
                      min={0}
                      max={100}
                      step={1}
                      display={`${options.overlapMin}%`}
                      tooltip="Only applies to shapes that overlap; it does not force overlap."
                      onChange={(value) => setOption("overlapMin", Math.min(value, options.overlapMax))}
                    />
                    <SliderField
                      id="randomize-overlap-max"
                      icon={<Layers />}
                      label="Maximum overlap"
                      value={options.overlapMax}
                      min={0}
                      max={100}
                      step={1}
                      display={`${options.overlapMax}%`}
                      tooltip="Caps how much one shape can overlap another."
                      onChange={(value) => setOption("overlapMax", Math.max(value, options.overlapMin))}
                    />
                  </>
                </NestedControls>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-overlap-count"
                label="Limit overlapping neighbors"
                checked={options.limitOverlapCount}
                icon={<FilterAlt />}
                tooltip="Caps how many neighboring shapes can overlap each layer."
                onChange={(value) => setOption("limitOverlapCount", value)}
              />
              {options.limitOverlapCount && (
                <NestedControls>
                  <>
                    <RangeFields
                      prefix="overlap-count"
                      label="Overlapping neighbors"
                      minValue={options.minOverlapCount}
                      maxValue={options.maxOverlapCount}
                      min={0}
                      max={40}
                      step={1}
                      display=""
                      setMin={(value) => setOption("minOverlapCount", value)}
                      setMax={(value) => setOption("maxOverlapCount", value)}
                    />
                    {!options.allowOverlap && options.minOverlapCount > 0 && (
                      <p role="status" className="m-0 text-xs text-on-surface-variant">
                        Minimum neighbors requires overlap; no-overlap takes priority.
                      </p>
                    )}
                  </>
                </NestedControls>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <OptionSwitch
                id="randomize-spill"
                label="Allow shapes beyond canvas"
                checked={options.canvasSpill}
                icon={<OpenInFull />}
                tooltip="Lets shapes extend outside the canvas instead of staying fully within bounds."
                onChange={(value) =>
                  setOptions((current) => ({
                    ...current,
                    canvasSpill: value,
                    ...(!value
                      ? {
                          sizeMin: Math.min(current.sizeMin, 100),
                          sizeMax: Math.min(current.sizeMax, 100),
                        }
                      : {}),
                  }))
                }
              />
              {options.canvasSpill && (
                <NestedControls>
                  <SliderField
                    id="randomize-bleed"
                    icon={<OpenInFull />}
                    label="Canvas spill"
                    value={options.bleed}
                    min={0}
                    max={100}
                    step={5}
                    display={`${options.bleed}%`}
                    onChange={(value) => setOption("bleed", value)}
                  />
                </NestedControls>
              )}
            </div>
          </OptionGroup>
          <OptionGroup title="Shapes" icon={<OpenInFull />} open>
            <OptionSwitch
              id="randomize-shape-type"
              label="Shape or blob type"
              checked={options.shapeType}
              tooltip="Switches some layers between regular shapes and blob forms."
              onChange={(value) => setOption("shapeType", value)}
            />
            <OptionSwitch
              id="randomize-shape-index"
              label="Randomize shape"
              checked={options.shapeIndex}
              tooltip="Chooses a different shape variant for each layer."
              onChange={(value) => setOption("shapeIndex", value)}
            />
            <OptionSwitch
              id="randomize-blob-contour"
              label="Randomize blob shape"
              checked={options.blobContour}
              tooltip="Randomizes the blob silhouette instead of keeping the same contour."
              onChange={(value) => setOption("blobContour", value)}
            />
            <OptionSwitch
              id="randomize-blob-edges"
              label="Blob edge count"
              checked={options.blobEdges}
              tooltip="Changes how many edges the blob uses."
              onChange={(value) => setOption("blobEdges", value)}
            />
            {options.blobEdges && (
              <NestedControls>
                <RangeFields
                  prefix="blob-edges"
                  label="Blob edge count"
                  minValue={options.blobEdgesMin}
                  maxValue={options.blobEdgesMax}
                  min={BLOB_MIN_EDGES}
                  max={BLOB_MAX_EDGES}
                  step={1}
                  display=""
                  setMin={(value) => setOption("blobEdgesMin", value)}
                  setMax={(value) => setOption("blobEdgesMax", value)}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-blob-smoothness"
              label="Blob smoothness"
              checked={options.blobSmoothness}
              tooltip="Adjusts how round or faceted the blob edges appear."
              onChange={(value) => setOption("blobSmoothness", value)}
            />
            {options.blobSmoothness && (
              <NestedControls>
                <RangeFields
                  prefix="blob-smoothness"
                  label="Blob smoothness"
                  minValue={options.blobSmoothnessMin}
                  maxValue={options.blobSmoothnessMax}
                  min={0}
                  max={SMOOTHNESS.length - 1}
                  step={1}
                  display=" step"
                  formatValue={(value) => `${value}${value === 1 ? " step" : " steps"}`}
                  setMin={(value) => setOption("blobSmoothnessMin", value)}
                  setMax={(value) => setOption("blobSmoothnessMax", value)}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-size"
              label="Shape size"
              checked={options.size}
              tooltip="Randomizes the size range for each layer."
              onChange={(value) => setOption("size", value)}
            />
            {options.size && (
              <NestedControls>
                <RangeFields
                  prefix="size"
                  label="Shape size"
                  minValue={options.sizeMin}
                  maxValue={options.sizeMax}
                  min={5}
                  max={options.canvasSpill ? 200 : 100}
                  step={5}
                  display="%"
                  setMin={(value) => setOption("sizeMin", value)}
                  setMax={(value) => setOption("sizeMax", value)}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-rotation"
              label="Rotation"
              checked={options.rotation}
              tooltip="Randomizes each layer’s rotation angle."
              onChange={(value) => setOption("rotation", value)}
            />
            {options.rotation && (
              <NestedControls>
                <SliderField
                  id="randomize-rotation-range"
                  icon={<RotateRight />}
                  label="Rotation range"
                  value={options.rotationRange}
                  min={0}
                  max={180}
                  step={15}
                  display={`±${options.rotationRange}°`}
                  onChange={(value) => setOption("rotationRange", value)}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-opacity"
              label="Shape opacity"
              checked={options.opacity}
              tooltip="Randomizes each layer’s transparency."
              onChange={(value) => setOption("opacity", value)}
            />
            {options.opacity && (
              <NestedControls>
                <RangeFields
                  prefix="opacity"
                  label="Shape opacity"
                  minValue={options.opacityMin}
                  maxValue={options.opacityMax}
                  min={5}
                  max={100}
                  step={5}
                  display="%"
                  setMin={(value) => setOption("opacityMin", value)}
                  setMax={(value) => setOption("opacityMax", value)}
                />
              </NestedControls>
            )}
          </OptionGroup>
          <OptionGroup title="Colors" icon={<Palette />}>
            <OptionSwitch
              id="randomize-hue"
              label="Hue"
              checked={options.hue}
              tooltip="Shifts each layer’s hue within a range."
              onChange={(value) => setOption("hue", value)}
            />
            {options.hue && (
              <NestedControls>
                <SliderField
                  id="randomize-hue-range"
                  icon={<Tune />}
                  label="Hue variation"
                  value={options.hueRange}
                  min={0}
                  max={180}
                  step={5}
                  display={`±${options.hueRange}°`}
                  onChange={(value) => setOption("hueRange", value)}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-fill"
              label="Fill color"
              checked={options.fill}
              tooltip="Randomizes which fill color each shape uses."
              onChange={(value) => setOption("fill", value)}
            />
            <OptionSwitch
              id="randomize-overlap-color"
              label="Overlap color"
              checked={options.overlapColor}
              tooltip="Randomizes the color used where layers overlap."
              onChange={(value) => setOption("overlapColor", value)}
            />
          </OptionGroup>
          <OptionGroup title="Background" icon={<Tune />}>
            <OptionSwitch
              id="randomize-pattern"
              label="Pattern selection"
              checked={options.pattern}
              tooltip="Chooses a different background pattern at random."
              onChange={(value) => setOption("pattern", value)}
            />
            <OptionSwitch
              id="randomize-pattern-opacity"
              label="Pattern opacity"
              checked={options.patternOpacity}
              tooltip="Randomizes how visible the background pattern is."
              onChange={(value) => setOption("patternOpacity", value)}
            />
            {options.patternOpacity && (
              <NestedControls>
                <RangeFields
                  prefix="pattern-opacity"
                  label="Pattern opacity"
                  minValue={options.patternOpacityMin}
                  maxValue={options.patternOpacityMax}
                  min={PATTERN_OPACITY.min}
                  max={PATTERN_OPACITY.max}
                  step={0.02}
                  display="%"
                  displayFactor={100}
                  setMin={(value) => setOption("patternOpacityMin", value)}
                  setMax={(value) => setOption("patternOpacityMax", value)}
                />
              </NestedControls>
            )}
            <OptionSwitch
              id="randomize-pattern-scale"
              label="Pattern scale"
              checked={options.patternScale}
              tooltip="Randomizes the size of the background pattern tiles."
              onChange={(value) => setOption("patternScale", value)}
            />
            {options.patternScale && (
              <NestedControls>
                <RangeFields
                  prefix="pattern-scale"
                  label="Pattern scale"
                  minValue={options.patternScaleMin}
                  maxValue={options.patternScaleMax}
                  min={PATTERN_SCALE.min}
                  max={PATTERN_SCALE.max}
                  step={0.1}
                  display="×"
                  setMin={(value) => setOption("patternScaleMin", value)}
                  setMax={(value) => setOption("patternScaleMax", value)}
                />
              </NestedControls>
            )}
          </OptionGroup>
          <OptionGroup title="Layer order" icon={<Layers />}>
            <OptionSwitch
              id="randomize-layer-order"
              label="Shuffle stacking order"
              checked={options.layerOrder}
              tooltip="Randomizes which layers appear on top of others."
              onChange={(value) => setOption("layerOrder", value)}
            />
          </OptionGroup>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-3 py-3">
        <Button
          variant="filled"
          disabled={!count && !options.shapeCount}
          onClick={randomize}
          className="w-full"
        >
          <Shuffle />
          Randomize selected
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

function RangeFields({
  prefix,
  label,
  minValue,
  maxValue,
  min,
  max,
  step,
  display,
  displayFactor = 1,
  formatValue,
  setMin,
  setMax,
}: {
  prefix: string;
  label: string;
  minValue: number;
  maxValue: number;
  min: number;
  max: number;
  step: number;
  display: string;
  displayFactor?: number;
  formatValue?: (value: number) => string;
  setMin: (value: number) => void;
  setMax: (value: number) => void;
}) {
  const formatted = (value: number) =>
    formatValue?.(value) ?? `${+(value * displayFactor).toFixed(2)}${display}`;
  return (
    <>
      <SliderField
        id={`${prefix}-min`}
        icon={<Tune />}
        label={`Minimum ${label.toLowerCase()}`}
        value={minValue}
        min={min}
        max={max}
        step={step}
        display={formatted(minValue)}
        onChange={(value) => setMin(Math.min(value, maxValue))}
      />
      <SliderField
        id={`${prefix}-max`}
        icon={<Tune />}
        label={`Maximum ${label.toLowerCase()}`}
        value={maxValue}
        min={min}
        max={max}
        step={step}
        display={formatted(maxValue)}
        onChange={(value) => setMax(Math.max(value, minValue))}
      />
    </>
  );
}
