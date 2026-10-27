import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { IconButton } from "@/components/ui/icon-button";
import { Slider } from "@/components/ui/slider";
import { ariaKeyshortcuts, keyLabel } from "@/lib/shortcut-keys";
import { BLOB_MAX_EDGES, BLOB_MIN_EDGES, SMOOTHNESS } from "@/lib/shapes";
import { ui, useUi } from "@/store/ui";
import { wallpaper, useWallpaper, type RandomizeOptions } from "@/store/wallpaper";
import {
  Casino,
  Check,
  Close,
  ExpandCircleDown,
  ExpandCircleRight,
  Layers,
  OpenInFull,
  Palette,
  RotateRight,
  Search,
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
  spread: false,
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
  spreadStrength: 60,
  gap: 48,
  overlapMin: 24,
  overlapMax: 120,
  minOverlapCount: 0,
  maxOverlapCount: 4,
  bleed: 35,
};

const SearchContext = createContext("");

export function RandomizeMenu({ mini = false }: { mini?: boolean } = {}) {
  const open = useUi((state) => state.randomizeOpen);
  const aligning = useUi((state) => state.aligning);
  const button = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) button.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);
  return (
    <IconButton
      ref={button}
      label={`Randomize (${keyLabel("Shift+R")})`}
      aria-keyshortcuts={ariaKeyshortcuts("Shift+R")}
      aria-controls="panel-randomize"
      aria-expanded={open}
      variant="tonal"
      className={mini ? "size-12 rounded-[14px]" : "size-12 rounded-3xl"}
      onClick={() => {
        if (aligning) {
          wallpaper.cancelAlignment();
          ui.setAligning(false);
        }
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
  const firstSwitch = useRef<HTMLButtonElement>(null);
  const open = useUi((state) => state.randomizeOpen);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTerm = search.trim().toLowerCase();

  useEffect(() => {
    if (open) firstSwitch.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus({ preventScroll: true });
  }, [searchOpen]);

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
      minimumGap: false,
      allowOverlap: value,
      limitOverlapCount: false,
      spread: false,
      canvasSpill: value,
    }));

  const randomize = () => {
    const satisfied = wallpaper.randomizeLayers(options);
    if (!satisfied) ui.showToast("Some shapes could not meet the requested spacing");
  };

  return (
    <section
      id="panel-randomize"
      aria-label="Randomize options"
      className="flex min-h-0 flex-1 flex-col text-sm text-on-surface"
    >
      <header className="flex flex-col gap-2 px-2 py-2">
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-1 text-base font-semibold">Randomize</h2>
          <IconButton
            label={searchOpen ? "Close randomize search" : "Search randomize settings"}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setSearch("");
            }}
          >
            <Search />
          </IconButton>
          <IconButton
            label="Done with randomize options"
            onClick={() => ui.setRandomizeOpen(false)}
          >
            <Check />
          </IconButton>
        </div>
        {searchOpen && (
          <label className="flex h-10 items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 focus-within:outline-2 focus-within:outline-primary">
            <Search className="size-5 shrink-0 text-on-surface-variant" />
            <input
              ref={searchInput}
              type="search"
              value={search}
              aria-label="Search randomize settings"
              placeholder="Search settings"
              onChange={(event) => setSearch(event.currentTarget.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
            />
          </label>
        )}
      </header>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <SearchContext.Provider value={searchTerm}>
          <div className="flex flex-col gap-2">
            <OptionGroup
              title="Placement"
              icon={<Layers />}
              open
              searchText="shape count horizontal position vertical position spread shapes out spread strength minimum gap allow overlap minimum overlap maximum overlap overlapping neighbors canvas spill beyond canvas"
            >
              <OptionSwitch
                id="randomize-shape-count"
                label="Shape count"
                checked={options.shapeCount}
                onChange={(value) => setOption("shapeCount", value)}
                buttonRef={firstSwitch}
              />
              {options.shapeCount && (
                <RangeFields
                  prefix="shape-count"
                  label="Shape count"
                  minValue={options.countMin}
                  maxValue={options.countMax}
                  min={1}
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
              <OptionSwitch
                id="randomize-spread"
                label="Spread shapes out"
                checked={options.spread}
                onChange={(value) => setOption("spread", value)}
              />
              {options.spread && (
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
              )}
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
                    label="Minimum overlap"
                    value={options.overlapMin}
                    min={0}
                    max={options.overlapMax}
                    step={8}
                    display={`${options.overlapMin} px`}
                    onChange={(value) => setOption("overlapMin", value)}
                  />
                  <SliderField
                    id="randomize-overlap-max"
                    icon={<Layers />}
                    label="Maximum overlap"
                    value={options.overlapMax}
                    min={options.overlapMin}
                    max={20000}
                    step={8}
                    display={`${options.overlapMax} px`}
                    onChange={(value) => setOption("overlapMax", value)}
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
              )}
              <OptionSwitch
                id="randomize-spill"
                label="Allow shapes beyond canvas"
                checked={options.canvasSpill}
                onChange={(value) => setOption("canvasSpill", value)}
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
            <OptionGroup
              title="Shapes"
              icon={<OpenInFull />}
              open
              searchText="shape type shape blob design contour edge count smoothness shape size rotation opacity smallest largest minimum maximum"
            >
              <OptionSwitch
                id="randomize-shape-type"
                label="Shape or blob type"
                checked={options.shapeType}
                onChange={(value) => setOption("shapeType", value)}
              />
              <OptionSwitch
                id="randomize-shape-index"
                label="Shape design"
                checked={options.shapeIndex}
                onChange={(value) => setOption("shapeIndex", value)}
              />
              <OptionSwitch
                id="randomize-blob-contour"
                label="Blob contour"
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
                  max={200}
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
            <OptionGroup title="Colors" icon={<Palette />} searchText="fill color overlap color">
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
            <OptionGroup
              title="Background"
              icon={<Tune />}
              searchText="background hue pattern selection pattern opacity pattern scale hue variation"
            >
              <OptionSwitch
                id="randomize-hue"
                label="Background hue"
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
            <OptionGroup title="Layer order" icon={<Layers />} searchText="layer order stacking">
              <OptionSwitch
                id="randomize-layer-order"
                label="Shuffle stacking order"
                checked={options.layerOrder}
                onChange={(value) => setOption("layerOrder", value)}
              />
            </OptionGroup>
          </div>
        </SearchContext.Provider>
      </div>
      <div className="flex flex-col gap-2 border-t border-outline-variant px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            aria-label="Enable all randomization settings"
            title="Turn on every randomization switch"
            onClick={() => setAllSwitches(true)}
            className="w-full"
          >
            <Check />
            Enable all
          </Button>
          <Button
            aria-label="Disable all randomization settings"
            title="Turn off every switch"
            onClick={() => setAllSwitches(false)}
            className="w-full"
          >
            <Close />
            Disable all
          </Button>
        </div>
        <Button disabled={!count && !options.shapeCount} onClick={randomize} className="w-full">
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
  buttonRef,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const search = useContext(SearchContext);
  if (search && !label.toLowerCase().includes(search)) return null;
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span id={`${id}-label`} className="text-sm">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border p-[3px] focus-ring transition-[background-color,border-color] duration-300 ease-effect ${checked ? "justify-end border-primary bg-primary" : "justify-start border-outline-variant bg-surface-container-high"}`}
      >
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-full transition-[width,height,background-color] duration-300 ease-spring ${checked ? "size-6 bg-on-primary text-primary" : "size-4 bg-on-surface-variant text-transparent"}`}
        >
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
  searchText,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  open?: boolean;
  searchText: string;
}) {
  const search = useContext(SearchContext);
  const [expanded, setExpanded] = useState(open);
  if (search && !searchText.includes(search)) return null;
  return (
    <details
      open={Boolean(search) || expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="group border-t border-outline-variant pt-2 first:border-0 first:pt-0"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold focus-ring [&::-webkit-details-marker]:hidden">
        <span className="text-on-surface-variant [&>svg]:size-5">{icon}</span>
        <span className="flex-1">{title}</span>
        {expanded ? (
          <ExpandCircleDown className="size-5 text-on-surface-variant" />
        ) : (
          <ExpandCircleRight className="size-5 text-on-surface-variant" />
        )}
      </summary>
      <div className="flex flex-col gap-1 pb-2 pl-1">{children}</div>
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
        max={maxValue}
        step={step}
        display={formatted(minValue)}
        onChange={setMin}
      />
      <SliderField
        id={`${prefix}-max`}
        icon={<Tune />}
        label={`Maximum ${label.toLowerCase()}`}
        value={maxValue}
        min={minValue}
        max={max}
        step={step}
        display={formatted(maxValue)}
        onChange={setMax}
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
  onChange: (value: number) => void;
}) {
  const search = useContext(SearchContext);
  if (search && !label.toLowerCase().includes(search)) return null;
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
    </div>
  );
}
