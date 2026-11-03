import { canvasSize } from "./formats";
import { sanitizeLayer, type Layer } from "./layer";
import { DEFAULT_RANDOMIZE_OPTIONS, type RandomizeOptions } from "./randomize";
import { PATTERN_OPACITY, PATTERN_SCALE } from "./patterns";
import { sanitizePrefs, type Prefs } from "./prefs";
import { BLOB_MAX_EDGES, BLOB_MIN_EDGES, SMOOTHNESS } from "./shapes";
import { clamp } from "./utils";

const KEY = "wallpaper-layout-v1";
const RANDOMIZE_OPTIONS_KEY = "wallpaper-randomize-options-v1";
const RANDOMIZE_OPTIONS_RESET_EVENT = "wallpaper-randomize-options-reset";
const fallbackCounters = new Map<string, number>();
const PREVIOUS_RANDOMIZE_DEFAULTS: RandomizeOptions = {
  ...DEFAULT_RANDOMIZE_OPTIONS,
  shapeCount: false,
  hue: false,
  pattern: false,
  allowOverlap: false,
  overlapMin: 5,
  overlapMax: 25,
};

export const incrementCounter = (key: string, limit: number, legacyKey?: string) => {
  let count = fallbackCounters.get(key) ?? 0;
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored === null ? Number.NaN : Number(stored);
    if (Number.isFinite(parsed)) count = Math.max(count, parsed);
    else if (stored === null && legacyKey && localStorage.getItem(legacyKey) === "true")
      count = Math.max(count, 1);
  } catch {
    // Keep the in-memory count when storage is unavailable.
  }
  if (count >= limit) return false;
  const next = count + 1;
  fallbackCounters.set(key, next);
  try {
    localStorage.setItem(key, String(next));
  } catch {
    // The in-memory count still limits this session.
  }
  return true;
};

export interface SavedState {
  layers: Layer[];
  prefs: Prefs;
  dark: boolean;
}

const randomizeNumberRanges: Partial<Record<keyof RandomizeOptions, [number, number]>> = {
  sizeMin: [5, 200],
  sizeMax: [5, 200],
  countMin: [0, 40],
  countMax: [0, 40],
  rotationRange: [0, 180],
  opacityMin: [5, 100],
  opacityMax: [5, 100],
  blobEdgesMin: [BLOB_MIN_EDGES, BLOB_MAX_EDGES],
  blobEdgesMax: [BLOB_MIN_EDGES, BLOB_MAX_EDGES],
  blobSmoothnessMin: [0, SMOOTHNESS.length - 1],
  blobSmoothnessMax: [0, SMOOTHNESS.length - 1],
  hueRange: [0, 180],
  patternOpacityMin: [PATTERN_OPACITY.min, PATTERN_OPACITY.max],
  patternOpacityMax: [PATTERN_OPACITY.min, PATTERN_OPACITY.max],
  patternScaleMin: [PATTERN_SCALE.min, PATTERN_SCALE.max],
  patternScaleMax: [PATTERN_SCALE.min, PATTERN_SCALE.max],
  spreadStrength: [0, 100],
  gap: [0, 400],
  overlapMin: [0, 100],
  overlapMax: [0, 100],
  minOverlapCount: [0, 40],
  maxOverlapCount: [0, 40],
  bleed: [0, 100],
};

export const loadRandomizeOptions = (): RandomizeOptions => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RANDOMIZE_OPTIONS_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return DEFAULT_RANDOMIZE_OPTIONS;
    const raw = saved as Record<string, unknown>;
    const isPreviousDefault = (
      Object.keys(PREVIOUS_RANDOMIZE_DEFAULTS) as (keyof RandomizeOptions)[]
    ).every((key) => raw[key] === PREVIOUS_RANDOMIZE_DEFAULTS[key]);
    const options = { ...DEFAULT_RANDOMIZE_OPTIONS };
    for (const key of Object.keys(options) as (keyof RandomizeOptions)[]) {
      const value = isPreviousDefault ? undefined : raw[key];
      if (typeof options[key] === "boolean" && typeof value === "boolean")
        options[key] = value as never;
      const range = randomizeNumberRanges[key];
      if (range && typeof value === "number" && Number.isFinite(value))
        options[key] = clamp(value, ...range) as never;
    }
    if (!options.canvasSpill) {
      options.sizeMin = Math.min(options.sizeMin, 100);
      options.sizeMax = Math.min(options.sizeMax, 100);
    }
    options.sizeMax = Math.max(options.sizeMin, options.sizeMax);
    options.countMax = Math.max(options.countMin, options.countMax);
    options.opacityMax = Math.max(options.opacityMin, options.opacityMax);
    options.blobEdgesMax = Math.max(options.blobEdgesMin, options.blobEdgesMax);
    options.blobSmoothnessMax = Math.max(options.blobSmoothnessMin, options.blobSmoothnessMax);
    options.patternOpacityMax = Math.max(options.patternOpacityMin, options.patternOpacityMax);
    options.patternScaleMax = Math.max(options.patternScaleMin, options.patternScaleMax);
    options.overlapMax = Math.max(options.overlapMin, options.overlapMax);
    options.maxOverlapCount = Math.max(options.minOverlapCount, options.maxOverlapCount);
    return options;
  } catch {
    return DEFAULT_RANDOMIZE_OPTIONS;
  }
};

export const persistRandomizeOptions = (options: RandomizeOptions) => {
  try {
    localStorage.setItem(RANDOMIZE_OPTIONS_KEY, JSON.stringify(options));
  } catch {
    // Randomizer preferences remain available for the current session.
  }
};

export const resetRandomizeOptions = () => {
  persistRandomizeOptions(DEFAULT_RANDOMIZE_OPTIONS);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(RANDOMIZE_OPTIONS_RESET_EVENT));
};

export const subscribeToRandomizeOptionsReset = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const listener = () => callback();
  window.addEventListener(RANDOMIZE_OPTIONS_RESET_EVENT, listener);
  return () => window.removeEventListener(RANDOMIZE_OPTIONS_RESET_EVENT, listener);
};

const migrateLegacyColors = (raw: Record<string, unknown>) => {
  if (raw.fill === "surface") raw.fill = "primary-container";
  if (raw.overlap === "surface") raw.overlap = "none";
  return raw;
};

export const loadSaved = (): SavedState | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!saved || !Array.isArray(saved.layers)) return null;
    const prefs = sanitizePrefs(saved.prefs);
    const canvas = canvasSize(prefs.format, prefs.orientation, prefs.custom);
    const layers = (saved.layers as unknown[])
      .map((layer) =>
        layer && typeof layer === "object"
          ? sanitizeLayer(migrateLegacyColors(layer as Record<string, unknown>), canvas)
          : null,
      )
      .filter((layer): layer is Layer => layer !== null);
    return { layers, prefs, dark: saved.dark !== false };
  } catch {
    return null;
  }
};

export const persist = (state: SavedState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
};
