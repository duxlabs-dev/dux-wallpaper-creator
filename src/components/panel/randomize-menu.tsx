import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { IconButton } from "@/components/ui/icon-button";
import { Slider } from "@/components/ui/slider";
import { BLOB_MAX_EDGES, BLOB_MIN_EDGES, SMOOTHNESS } from "@/lib/shapes";
import { ui, useUi } from "@/store/ui";
import { wallpaper, useWallpaper, type RandomizeOptions } from "@/store/wallpaper";
import {
  ArrowBack,
  Casino,
  Check,
  KeyboardArrowDown,
  Layers,
  OpenInFull,
  Palette,
  RotateRight,
  Shuffle,
  Tune,
} from "material-symbols/rounded";

const DEFAULT_OPTIONS: RandomizeOptions = {
  positionX: true,
  positionY: true,
  shapeCount: false,
  shapeType: false,
  shapeIndex: true,
  blobContour: true,
  blobEdges: false,
  blobSmoothness: false,
  size: true,
  rotation: true,
  opacity: false,
  fill: true,
  overlapColor: true,
  hue: false,
  pattern: false,
  patternOpacity: false,
  patternScale: false,
  layerOrder: false,
  minimumGap: false,
  allowOverlap: false,
  limitOverlapCount: false,
  canvasSpill: false,
  sizeMin: 15,
  sizeMax: 80,
  countMin: 3,
  countMax: 12,
  rotationRange: 180,
  opacityMin: 15,
  opacityMax: 100,
  blobEdgesMin: BLOB_MIN_EDGES,
  blobEdgesMax: BLOB_MAX_EDGES,
  blobSmoothnessMin: 0,
  blobSmoothnessMax: SMOOTHNESS.length - 1,
  hueRange: 180,
  patternOpacityMin: 0.02,
  patternOpacityMax: 0.4,
  patternScaleMin: 0.5,
  patternScaleMax: 8,
  spreadStrength: 0,
  gap: 48,
  overlapMin: 5,
  overlapMax: 25,
  minOverlapCount: 0,
  maxOverlapCount: 4,
  bleed: 35,
};

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

export function RandomizeMenu({ mini = false }: { mini?: boolean } = {}) {
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
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const backButton = useRef<HTMLButtonElement>(null);
  const allOptions = useRef<HTMLInputElement>(null);
  const open = useUi((state) => state.randomizeOpen);
  const enabledCount = SWITCH_KEYS.filter((key) => options[key]).length;
  const allEnabled = enabledCount === SWITCH_KEYS.length;
  const someEnabled = enabledCount > 0 && !allEnabled;

  useEffect(() => {
    if (open) backButton.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (allOptions.current) allOptions.current.indeterminate = someEnabled;
  }, [someEnabled]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      ui.setRandomizeOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const setOption = <K extends keyof RandomizeOptions>(key: K, value: RandomizeOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const setAllSwitches = (value: boolean) =>
    setOptions((current) => ({
      ...current,
      positionX: value,
      positionY: value,
      shapeCount: value,
      shapeType: value,
      shapeIndex: value,
      blobContour: value,
      blobEdges: value,
      blobSmoothness: value,
      size: value,
      rotation: value,
      opacity: value,
      fill: value,
      overlapColor: value,
      hue: value,
      pattern: value,
      patternOpacity: value,
      patternScale: value,
      layerOrder: value,
      minimumGap: value,
      allowOverlap: value,
      limitOverlapCount: value,
      canvasSpill: value,
      sizeMin: value ? current.sizeMin : Math.min(current.sizeMin, 100),
      sizeMax: value ? current.sizeMax : Math.min(current.sizeMax, 100),
    }));

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
      <header className="flex items-center gap-2 border-b border-outline-variant px-1 pb-2">
        <IconButton
          ref={backButton}
          label="Back (Esc)"
          aria-keyshortcuts="Escape"
          onClick={() => ui.setRandomizeOpen(false)}
        >
          <ArrowBack />
        </IconButton>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2 className="m-0 flex-1 text-base font-semibold">Randomize</h2>
          <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:state-layer-8">
            <input
              ref={allOptions}
              type="checkbox"
              aria-label="Select all randomization options"
              aria-checked={someEnabled ? "mixed" : allEnabled}
              checked={allEnabled}
              onChange={() => setAllSwitches(!allEnabled)}
              className="peer absolute size-5 cursor-pointer opacity-0"
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none flex size-[18px] items-center justify-center rounded-[4px] border-2 transition-colors ${allEnabled || someEnabled ? "border-primary bg-primary text-on-primary" : "border-on-surface-variant text-transparent"} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary`}
            >
              {someEnabled ? (
                <span className="h-0.5 w-2.5 rounded-full bg-current" />
              ) : (
                allEnabled && <Check aria-hidden="true" className="size-3.5" />
              )}
            </span>
          </label>
        </div>
      </header>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          <OptionGroup title="Placement" icon={<Layers />} open>
            <OptionSwitch
              id="randomize-shape-count"
              label="Shape count"
              checked={options.shapeCount}
              onChange={(value) => setOption("shapeCount", value)}
            />
            {options.shapeCount && (
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
            )}
            <OptionSwitch
              id="randomize-position-x"
              label="Horizontal position"
              checked={options.positionX}
              onChange={(value) => setOption("positionX", value)}
            />
            <OptionSwitch
              id="randomize-position-y"
              label="Vertical position"
              checked={options.positionY}
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
              onChange={(value) => setOption("spreadStrength", value)}
            />
            <OptionSwitch
              id="randomize-min-gap"
              label="Keep a minimum gap"
              checked={options.minimumGap}
              onChange={(value) => setOption("minimumGap", value)}
            />
            {options.minimumGap && (
              <SliderField
                id="randomize-gap"
                icon={<Layers />}
                label="Minimum gap"
                value={options.gap}
                min={0}
                max={400}
                step={8}
                display={`${options.gap} px`}
                onChange={(value) => setOption("gap", value)}
              />
            )}
            <OptionSwitch
              id="randomize-overlap"
              label="Allow overlap"
              checked={options.allowOverlap}
              onChange={(value) => setOption("allowOverlap", value)}
            />
            {options.allowOverlap && (
              <>
                <SliderField
                  id="randomize-overlap-min"
                  icon={<Layers />}
                  label="Minimum overlap depth (when overlapping)"
                  value={options.overlapMin}
                  min={0}
                  max={100}
                  step={1}
                  display={`${options.overlapMin}%`}
                  description="Only applies to shapes that overlap; it does not force overlap."
                  onChange={(value) => setOption("overlapMin", Math.min(value, options.overlapMax))}
                />
                <SliderField
                  id="randomize-overlap-max"
                  icon={<Layers />}
                  label="Maximum overlap (% of smaller shape)"
                  value={options.overlapMax}
                  min={0}
                  max={100}
                  step={1}
                  display={`${options.overlapMax}%`}
                  onChange={(value) => setOption("overlapMax", Math.max(value, options.overlapMin))}
                />
              </>
            )}
            <OptionSwitch
              id="randomize-overlap-count"
              label="Limit overlapping neighbors"
              checked={options.limitOverlapCount}
              onChange={(value) => setOption("limitOverlapCount", value)}
            />
            {options.limitOverlapCount && (
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
            )}
            <OptionSwitch
              id="randomize-spill"
              label="Allow shapes beyond canvas"
              checked={options.canvasSpill}
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
              <SliderField
                id="randomize-bleed"
                icon={<Tune />}
                label="Canvas spill"
                value={options.bleed}
                min={0}
                max={100}
                step={5}
                display={`${options.bleed}%`}
                onChange={(value) => setOption("bleed", value)}
              />
            )}
          </OptionGroup>
          <OptionGroup title="Shapes" icon={<OpenInFull />} open>
            <OptionSwitch
              id="randomize-shape-type"
              label="Shape or blob type"
              checked={options.shapeType}
              onChange={(value) => setOption("shapeType", value)}
            />
            <OptionSwitch
              id="randomize-shape-index"
              label="Randomize shape"
              checked={options.shapeIndex}
              onChange={(value) => setOption("shapeIndex", value)}
            />
            <OptionSwitch
              id="randomize-blob-contour"
              label="Randomize blob shape"
              checked={options.blobContour}
              onChange={(value) => setOption("blobContour", value)}
            />
            <OptionSwitch
              id="randomize-blob-edges"
              label="Blob edge count"
              checked={options.blobEdges}
              onChange={(value) => setOption("blobEdges", value)}
            />
            {options.blobEdges && (
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
            )}
            <OptionSwitch
              id="randomize-blob-smoothness"
              label="Blob smoothness"
              checked={options.blobSmoothness}
              onChange={(value) => setOption("blobSmoothness", value)}
            />
            {options.blobSmoothness && (
              <RangeFields
                prefix="blob-smoothness"
                label="Blob smoothness"
                minValue={options.blobSmoothnessMin}
                maxValue={options.blobSmoothnessMax}
                min={0}
                max={SMOOTHNESS.length - 1}
                step={1}
                display=" step"
                setMin={(value) => setOption("blobSmoothnessMin", value)}
                setMax={(value) => setOption("blobSmoothnessMax", value)}
              />
            )}
            <OptionSwitch
              id="randomize-size"
              label="Shape size"
              checked={options.size}
              onChange={(value) => setOption("size", value)}
            />
            {options.size && (
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
            )}
            <OptionSwitch
              id="randomize-rotation"
              label="Rotation"
              checked={options.rotation}
              onChange={(value) => setOption("rotation", value)}
            />
            {options.rotation && (
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
            )}
            <OptionSwitch
              id="randomize-opacity"
              label="Shape opacity"
              checked={options.opacity}
              onChange={(value) => setOption("opacity", value)}
            />
            {options.opacity && (
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
            )}
          </OptionGroup>
          <OptionGroup title="Colors" icon={<Palette />}>
            <OptionSwitch
              id="randomize-hue"
              label="Hue"
              checked={options.hue}
              onChange={(value) => setOption("hue", value)}
            />
            {options.hue && (
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
            )}
            <OptionSwitch
              id="randomize-fill"
              label="Fill color"
              checked={options.fill}
              onChange={(value) => setOption("fill", value)}
            />
            <OptionSwitch
              id="randomize-overlap-color"
              label="Overlap color"
              checked={options.overlapColor}
              onChange={(value) => setOption("overlapColor", value)}
            />
          </OptionGroup>
          <OptionGroup title="Background" icon={<Tune />}>
            <OptionSwitch
              id="randomize-pattern"
              label="Pattern selection"
              checked={options.pattern}
              onChange={(value) => setOption("pattern", value)}
            />
            <OptionSwitch
              id="randomize-pattern-opacity"
              label="Pattern opacity"
              checked={options.patternOpacity}
              onChange={(value) => setOption("patternOpacity", value)}
            />
            {options.patternOpacity && (
              <RangeFields
                prefix="pattern-opacity"
                label="Pattern opacity"
                minValue={options.patternOpacityMin}
                maxValue={options.patternOpacityMax}
                min={0.02}
                max={0.4}
                step={0.02}
                display="%"
                setMin={(value) => setOption("patternOpacityMin", value)}
                setMax={(value) => setOption("patternOpacityMax", value)}
              />
            )}
            <OptionSwitch
              id="randomize-pattern-scale"
              label="Pattern scale"
              checked={options.patternScale}
              onChange={(value) => setOption("patternScale", value)}
            />
            {options.patternScale && (
              <RangeFields
                prefix="pattern-scale"
                label="Pattern scale"
                minValue={options.patternScaleMin}
                maxValue={options.patternScaleMax}
                min={0.5}
                max={8}
                step={0.1}
                display="×"
                setMin={(value) => setOption("patternScaleMin", value)}
                setMax={(value) => setOption("patternScaleMax", value)}
              />
            )}
          </OptionGroup>
          <OptionGroup title="Layer order" icon={<Layers />}>
            <OptionSwitch
              id="randomize-layer-order"
              label="Shuffle stacking order"
              checked={options.layerOrder}
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

function OptionSwitch({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span id={`${id}-label`} className="text-sm">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`group relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 p-0 focus-ring transition-[background-color,border-color] duration-300 ease-effect ${checked ? "border-primary bg-primary" : "border-outline-variant bg-surface-container-high"}`}
      >
        <span
          className={`absolute top-1/2 left-[6px] inline-flex shrink-0 -translate-y-1/2 items-center justify-center rounded-full transition-[width,height,background-color,translate] duration-300 ease-spring active:size-7 ${checked ? "size-6 translate-x-3 bg-on-primary text-primary" : "size-4 bg-on-surface-variant text-transparent"}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-surface/10 opacity-0 transition-opacity group-hover:opacity-100"
          />
          {checked && <Check aria-hidden="true" className="size-4" />}
        </span>
      </button>
    </div>
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
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-1 text-[15px] focus-ring hover:state-layer-8 active:state-layer-12 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 font-semibold">{title}</span>
        <span className="flex size-6 shrink-0 items-center justify-center text-on-surface-variant [&>svg]:size-5">
          {icon}
        </span>
        <KeyboardArrowDown
          className={`size-5 shrink-0 text-on-surface-variant transition-transform duration-300 ease-effect ${expanded ? "rotate-180" : "rotate-0"}`}
        />
      </summary>
      <div className="flex flex-col gap-2 pb-2 pl-1">{children}</div>
    </details>
  );
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
  setMin: (value: number) => void;
  setMax: (value: number) => void;
}) {
  const formatted = (value: number) => {
    const displayedValue = +(value * displayFactor).toFixed(2);
    const suffix =
      display.trim() === "step" ? (displayedValue === 1 ? " step" : " steps") : display;
    return `${displayedValue}${suffix}`;
  };
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

function SliderField({
  id,
  icon,
  label,
  value,
  min,
  max,
  step,
  display,
  description,
  onChange,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  description?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 pl-2">
      <FieldLabel icon={icon} htmlFor={id} value={display}>
        {label}
      </FieldLabel>
      <Slider
        id={id}
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
      {description && <span className="pl-7 text-xs text-on-surface-variant">{description}</span>}
    </div>
  );
}
