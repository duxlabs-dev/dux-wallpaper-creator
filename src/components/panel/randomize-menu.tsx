import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { type Range } from "@/components/ui/range-slider";
import {
  formatRange,
  RangeSliderField,
  type RangeFormat,
} from "@/components/ui/range-slider-field";
import { SliderField } from "@/components/ui/slider-field";
import { SubpageHeader } from "@/components/ui/subpage-header";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { ui, useUi } from "@/store/ui";
import { useWallpaper } from "@/store/wallpaper";
import {
  Casino,
  DragPan,
  Palette,
  Shapes,
  Shuffle,
  Stacks,
  Texture,
} from "material-symbols/rounded";
import { KeyboardArrowDown } from "material-symbols/rounded/500";

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

const GROUP_KEYS = {
  placement: [
    "shapeCount",
    "positionX",
    "positionY",
    "minimumGap",
    "allowOverlap",
    "limitOverlapCount",
    "canvasSpill",
  ],
  shapes: [
    "shapeType",
    "shapeIndex",
    "blobContour",
    "blobEdges",
    "blobSmoothness",
    "size",
    "rotation",
    "opacity",
  ],
  colors: ["hue", "fill", "overlapColor"],
  background: ["pattern", "patternOpacity", "patternScale"],
} satisfies Record<string, readonly ToggleKey[]>;

// Nested sliders only show while their option is on, i.e. on a selected segment.
const SELECTED_INACTIVE_TRACK = "var(--color-surface-bright)";

const plural = (singular: string, several: string) => (count: number) =>
  count === 1 ? singular : several;

const RANGE_FORMATS: Record<RangeKey, RangeFormat> = {
  shapeCount: { unit: plural(" shape", " shapes") },
  allowOverlap: { unit: "%" },
  limitOverlapCount: { unit: plural(" neighbor", " neighbors") },
  blobEdges: { unit: " edges" },
  blobSmoothness: { unit: plural(" step", " steps") },
  size: { unit: "%" },
  opacity: { unit: "%" },
  patternOpacity: { format: (value) => String(Math.round(value * 100)), unit: "%" },
  patternScale: { format: (value) => String(+value.toFixed(1)), unit: "×" },
};

export function RandomizeButton({ mini }: { mini: boolean }) {
  const open = useUi((state) => state.randomizeOpen);
  return (
    <IconButton
      data-flip
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
    ...RANGE_FORMATS[key],
    value: [options[key].min, options[key].max] as Range,
    onChange: ([min, max]: Range) => patch(key, { min, max }),
  });

  const switchValue = (key: ToggleKey, text: string) => (options[key].enabled ? text : undefined);

  const rangeText = (key: RangeKey) =>
    formatRange([options[key].min, options[key].max], RANGE_FORMATS[key]);

  const capSizeWithoutSpill = (size: RangeToggle) => ({
    ...size,
    min: Math.min(size.min, SIZE_MAX_WITHOUT_SPILL),
    max: Math.min(size.max, SIZE_MAX_WITHOUT_SPILL),
  });

  const selectionOf = (keys: readonly ToggleKey[]) => {
    const counted = keys.filter((key) =>
      (SELECT_ALL_RANDOMIZE_KEYS as readonly ToggleKey[]).includes(key),
    );
    const on = counted.filter((key) => options[key].enabled).length;
    return {
      checked: on === counted.length,
      indeterminate: on > 0 && on < counted.length,
      onChange: (value: boolean) => setSwitches(keys, value),
    };
  };

  const setSwitches = (keys: readonly ToggleKey[], value: boolean) =>
    setOptions((current) => {
      const next = { ...current };
      for (const key of keys)
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
          <Checkbox label="Select all randomization options" {...selectionOf(SWITCH_KEYS)} />
        }
      />
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto py-3">
        <div className="flex flex-col gap-3">
          <OptionGroup
            title="Placement"
            icon={<DragPan />}
            selection={selectionOf(GROUP_KEYS.placement)}
            open
          >
            <OptionSegment selected={options.shapeCount.enabled}>
              <OptionSwitch
                id="randomize-shape-count"
                label="Shape count"
                value={switchValue("shapeCount", rangeText("shapeCount"))}
                {...switchProps("shapeCount")}
              />
              {options.shapeCount.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-shape-count-range"
                    label="Shape count"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("shapeCount")}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.positionX.enabled}>
              <OptionSwitch
                id="randomize-position-x"
                label="Horizontal position"
                tooltip="Randomizes each layer’s horizontal offset within the canvas."
                {...switchProps("positionX")}
              />
            </OptionSegment>
            <OptionSegment selected={options.positionY.enabled}>
              <OptionSwitch
                id="randomize-position-y"
                label="Vertical position"
                tooltip="Randomizes each layer’s vertical offset within the canvas."
                {...switchProps("positionY")}
              />
            </OptionSegment>
            <OptionSegment>
              <SliderField
                id="randomize-spread-strength"
                className="py-2"
                label="Spread strength"
                {...RANDOMIZE_LIMITS.spreadStrength}
                value={options.spreadStrength}
                display={`${options.spreadStrength}%`}
                tooltip="Controls how dispersed the shapes spread across the canvas."
                onChange={(spreadStrength) =>
                  setOptions((current) => ({ ...current, spreadStrength }))
                }
              />
            </OptionSegment>
            <OptionSegment selected={options.minimumGap.enabled}>
              <OptionSwitch
                id="randomize-min-gap"
                label="Keep a minimum gap"
                tooltip="Keeps shapes separated by a minimum distance to avoid overlap and crowding."
                value={switchValue("minimumGap", `${options.minimumGap.gap} px`)}
                {...switchProps("minimumGap")}
              />
              {options.minimumGap.enabled && (
                <NestedControls>
                  <SliderField
                    id="randomize-gap"
                    label="Minimum gap"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...RANDOMIZE_LIMITS.minimumGap}
                    value={options.minimumGap.gap}
                    display={`${options.minimumGap.gap} px`}
                    onChange={(gap) => patch("minimumGap", { gap })}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.allowOverlap.enabled}>
              <OptionSwitch
                id="randomize-overlap"
                label="Allow overlap"
                tooltip="Allows shapes to overlap instead of staying separate. The depth is how far they may overlap, in % of the smaller shape; it doesn’t force them to overlap."
                value={switchValue("allowOverlap", `${rangeText("allowOverlap")} overlap depth`)}
                {...switchProps("allowOverlap")}
              />
              {options.allowOverlap.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-overlap-depth"
                    label="Overlap depth"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("allowOverlap")}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.limitOverlapCount.enabled}>
              <OptionSwitch
                id="randomize-overlap-count"
                label="Limit overlapping neighbors"
                tooltip="Caps how many neighboring shapes can overlap each layer."
                value={switchValue("limitOverlapCount", rangeText("limitOverlapCount"))}
                {...switchProps("limitOverlapCount")}
              />
              {options.limitOverlapCount.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-overlap-count-range"
                    label="Overlapping neighbors"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("limitOverlapCount")}
                  />
                  {!options.allowOverlap.enabled && options.limitOverlapCount.min > 0 && (
                    <p role="status" className="m-0 text-xs text-on-surface-variant">
                      Minimum neighbors requires overlap; no-overlap takes priority.
                    </p>
                  )}
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.canvasSpill.enabled}>
              <OptionSwitch
                id="randomize-spill"
                label="Allow shapes beyond canvas"
                tooltip="Lets shapes extend outside the canvas instead of staying fully within bounds."
                value={switchValue("canvasSpill", `${options.canvasSpill.bleed}% canvas spill`)}
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
                    label="Canvas spill"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...RANDOMIZE_LIMITS.canvasSpill}
                    value={options.canvasSpill.bleed}
                    display={`${options.canvasSpill.bleed}%`}
                    onChange={(bleed) => patch("canvasSpill", { bleed })}
                  />
                </NestedControls>
              )}
            </OptionSegment>
          </OptionGroup>
          <OptionGroup title="Shapes" icon={<Shapes />} selection={selectionOf(GROUP_KEYS.shapes)}>
            <OptionSegment selected={options.shapeType.enabled}>
              <OptionSwitch
                id="randomize-shape-type"
                label="Shape or blob type"
                tooltip="Switches some layers between regular shapes and blob forms."
                {...switchProps("shapeType")}
              />
            </OptionSegment>
            <OptionSegment selected={options.shapeIndex.enabled}>
              <OptionSwitch
                id="randomize-shape-index"
                label="Randomize shape"
                tooltip="Chooses a different shape variant for each layer."
                {...switchProps("shapeIndex")}
              />
            </OptionSegment>
            <OptionSegment selected={options.blobContour.enabled}>
              <OptionSwitch
                id="randomize-blob-contour"
                label="Randomize blob shape"
                tooltip="Randomizes the blob silhouette instead of keeping the same contour."
                {...switchProps("blobContour")}
              />
            </OptionSegment>
            <OptionSegment selected={options.blobEdges.enabled}>
              <OptionSwitch
                id="randomize-blob-edges"
                label="Blob edge count"
                tooltip="Changes how many edges the blob uses."
                value={switchValue("blobEdges", rangeText("blobEdges"))}
                {...switchProps("blobEdges")}
              />
              {options.blobEdges.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-blob-edges-range"
                    label="Blob edge count"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("blobEdges")}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.blobSmoothness.enabled}>
              <OptionSwitch
                id="randomize-blob-smoothness"
                label="Blob smoothness"
                tooltip="Adjusts how round or faceted the blob edges appear."
                value={switchValue("blobSmoothness", rangeText("blobSmoothness"))}
                {...switchProps("blobSmoothness")}
              />
              {options.blobSmoothness.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-blob-smoothness-range"
                    label="Blob smoothness"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("blobSmoothness")}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.size.enabled}>
              <OptionSwitch
                id="randomize-size"
                label="Shape size"
                tooltip="Randomizes the size range for each layer."
                value={switchValue("size", rangeText("size"))}
                {...switchProps("size")}
              />
              {options.size.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-size-range"
                    label="Shape size"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("size")}
                    max={
                      options.canvasSpill.enabled
                        ? RANDOMIZE_LIMITS.size.max
                        : SIZE_MAX_WITHOUT_SPILL
                    }
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.rotation.enabled}>
              <OptionSwitch
                id="randomize-rotation"
                label="Rotation"
                tooltip="Randomizes each layer’s rotation angle."
                value={switchValue("rotation", `±${options.rotation.range}°`)}
                {...switchProps("rotation")}
              />
              {options.rotation.enabled && (
                <NestedControls>
                  <SliderField
                    id="randomize-rotation-range"
                    label="Rotation range"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...RANDOMIZE_LIMITS.rotation}
                    value={options.rotation.range}
                    display={`±${options.rotation.range}°`}
                    onChange={(range) => patch("rotation", { range })}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.opacity.enabled}>
              <OptionSwitch
                id="randomize-opacity"
                label="Shape opacity"
                tooltip="Randomizes each layer’s transparency."
                value={switchValue("opacity", rangeText("opacity"))}
                {...switchProps("opacity")}
              />
              {options.opacity.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-opacity-range"
                    label="Shape opacity"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("opacity")}
                  />
                </NestedControls>
              )}
            </OptionSegment>
          </OptionGroup>
          <OptionGroup title="Colors" icon={<Palette />} selection={selectionOf(GROUP_KEYS.colors)}>
            <OptionSegment selected={options.hue.enabled}>
              <OptionSwitch
                id="randomize-hue"
                label="Hue"
                tooltip="Shifts the hue of all colors by a random amount within the range."
                value={switchValue("hue", `±${options.hue.range}°`)}
                {...switchProps("hue")}
              />
              {options.hue.enabled && (
                <NestedControls>
                  <SliderField
                    id="randomize-hue-range"
                    label="Hue variation"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...RANDOMIZE_LIMITS.hue}
                    value={options.hue.range}
                    display={`±${options.hue.range}°`}
                    onChange={(range) => patch("hue", { range })}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.fill.enabled}>
              <OptionSwitch
                id="randomize-fill"
                label="Fill color"
                tooltip="Randomizes which fill color each shape uses."
                {...switchProps("fill")}
              />
            </OptionSegment>
            <OptionSegment selected={options.overlapColor.enabled}>
              <OptionSwitch
                id="randomize-overlap-color"
                label="Overlap color"
                tooltip="Randomizes the color used where layers overlap."
                {...switchProps("overlapColor")}
              />
            </OptionSegment>
          </OptionGroup>
          <OptionGroup
            title="Background"
            icon={<Texture />}
            selection={selectionOf(GROUP_KEYS.background)}
          >
            <OptionSegment selected={options.pattern.enabled}>
              <OptionSwitch
                id="randomize-pattern"
                label="Pattern selection"
                tooltip="Chooses a different background pattern at random."
                {...switchProps("pattern")}
              />
            </OptionSegment>
            <OptionSegment selected={options.patternOpacity.enabled}>
              <OptionSwitch
                id="randomize-pattern-opacity"
                label="Pattern opacity"
                tooltip="Randomizes how visible the background pattern is."
                value={switchValue("patternOpacity", rangeText("patternOpacity"))}
                {...switchProps("patternOpacity")}
              />
              {options.patternOpacity.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-pattern-opacity-range"
                    label="Pattern opacity"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("patternOpacity")}
                  />
                </NestedControls>
              )}
            </OptionSegment>
            <OptionSegment selected={options.patternScale.enabled}>
              <OptionSwitch
                id="randomize-pattern-scale"
                label="Pattern scale"
                tooltip="Randomizes the size of the background pattern tiles."
                value={switchValue("patternScale", rangeText("patternScale"))}
                {...switchProps("patternScale")}
              />
              {options.patternScale.enabled && (
                <NestedControls>
                  <RangeSliderField
                    id="randomize-pattern-scale-range"
                    label="Pattern scale"
                    showHeader={false}
                    inactiveTrackColor={SELECTED_INACTIVE_TRACK}
                    {...rangeProps("patternScale")}
                  />
                </NestedControls>
              )}
            </OptionSegment>
          </OptionGroup>
          <OptionGroup title="Layer order" icon={<Stacks />}>
            <OptionSegment selected={options.layerOrder.enabled}>
              <OptionSwitch
                id="randomize-layer-order"
                label="Shuffle stacking order"
                tooltip="Randomizes which layers appear on top of others."
                {...switchProps("layerOrder")}
              />
            </OptionSegment>
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
  selection,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  open?: boolean;
  selection?: { checked: boolean; indeterminate: boolean; onChange: (value: boolean) => void };
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div className="relative">
      <details
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
        className="group details-animated"
      >
        {/* When closing, the corners wait for the content to collapse. */}
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl bg-surface-bright px-4 text-base text-on-surface focus-ring-inset [transition:border-radius_var(--duration-fast-spatial)_var(--ease-fast-spatial)_150ms,box-shadow_var(--duration-default-effects)_var(--ease-default-effects)] group-open:rounded-b-[4px] group-open:[transition-delay:0ms] hover:state-layer-8 active:rounded-2xl active:state-layer-10 group-open:active:rounded-2xl [&::-webkit-details-marker]:hidden">
          <span className="flex size-5 shrink-0 items-center justify-center text-on-surface-variant [&>svg]:size-5">
            {icon}
          </span>
          <span className="flex-1 font-semibold">{title}</span>
          {/* Room for the checkbox, kept outside the summary so it doesn't toggle the section. */}
          {selection && <span aria-hidden="true" className="w-9 shrink-0" />}
          <span
            className={cn(
              "flex h-10 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-(--duration-default-effects) ease-(--ease-default-effects)",
              expanded && "bg-surface-container",
            )}
          >
            <KeyboardArrowDown
              className={cn(
                "size-5 transition-transform duration-(--duration-fast-spatial) ease-(--ease-fast-spatial)",
                expanded && "rotate-180",
              )}
            />
          </span>
        </summary>
        <div className="flex flex-col gap-0.5 pt-0.5">{children}</div>
      </details>
      {selection && (
        <div className="absolute top-1 right-12">
          <Checkbox label={`Select all in ${title}`} {...selection} />
        </div>
      )}
    </div>
  );
}

function OptionSegment({
  selected = false,
  children,
}: {
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[4px] bg-surface-bright px-4 text-on-surface [transition:border-radius_var(--duration-fast-spatial)_var(--ease-fast-spatial),background-color_var(--duration-default-effects)_var(--ease-default-effects),box-shadow_var(--duration-default-effects)_var(--ease-default-effects)] last:rounded-b-2xl",
        "has-[[data-slot=row]:active]:rounded-2xl has-[[data-slot=row]:active]:state-layer-10 has-[[data-slot=row]:hover]:state-layer-8",
        "has-[[role=switch]:focus-visible]:rounded-2xl has-[[role=switch]:focus-visible]:outline-3 has-[[role=switch]:focus-visible]:-outline-offset-3 has-[[role=switch]:focus-visible]:outline-secondary [&_[role=switch]:focus-visible]:outline-none",
        selected &&
          "rounded-2xl bg-secondary-container text-on-secondary-container **:data-[slot=supporting]:text-on-secondary-container",
      )}
    >
      {children}
    </div>
  );
}

// Full-width rows, so the ripple covers the whole segment.
function OptionSwitch(props: ComponentProps<typeof Switch>) {
  return <Switch {...props} className="-mx-4 px-4" />;
}

function NestedControls({ children }: { children: ReactNode }) {
  return <div className="pb-3">{children}</div>;
}
