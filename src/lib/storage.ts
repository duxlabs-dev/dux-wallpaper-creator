import { canvasSize } from "./formats";
import { sanitizeLayer, type Layer } from "./layer";
import {
  DEFAULT_RANDOMIZE_OPTIONS,
  RANDOMIZE_LIMITS,
  SIZE_MAX_WITHOUT_SPILL,
  type Limit,
  type RandomizeOptions,
} from "./randomize";
import { sanitizePrefs, type Prefs } from "./prefs";
import { clamp } from "./utils";

const KEY = "wallpaper-layout-v1";
const RANDOMIZE_OPTIONS_KEY = "wallpaper-randomize-options-v2";
const fallbackCounters = new Map<string, number>();

export const incrementCounter = (key: string, limit: number) => {
  let count = fallbackCounters.get(key) ?? 0;
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored === null ? Number.NaN : Number(stored);
    if (Number.isFinite(parsed)) count = Math.max(count, parsed);
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

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const sanitizeRandomizeOptions = (raw: Record<string, unknown>): RandomizeOptions => {
  const options = structuredClone(DEFAULT_RANDOMIZE_OPTIONS);
  const limits: Partial<Record<string, Limit>> = RANDOMIZE_LIMITS;
  for (const [key, fallback] of Object.entries(options)) {
    const value = raw[key];
    const limit = limits[key];
    if (typeof fallback === "number") {
      if (limit && isNumber(value))
        (options as unknown as Record<string, number>)[key] = clamp(value, limit.min, limit.max);
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const saved = value as Record<string, unknown>;
    const option = fallback as Record<string, number | boolean>;
    for (const field of Object.keys(option)) {
      const savedField = saved[field];
      if (field === "enabled") {
        if (typeof savedField === "boolean") option.enabled = savedField;
      } else if (limit && isNumber(savedField)) {
        option[field] = clamp(savedField, limit.min, limit.max);
      }
    }
    if (isNumber(option.min) && isNumber(option.max)) option.max = Math.max(option.min, option.max);
  }
  if (!options.canvasSpill.enabled) {
    options.size.min = Math.min(options.size.min, SIZE_MAX_WITHOUT_SPILL);
    options.size.max = Math.min(options.size.max, SIZE_MAX_WITHOUT_SPILL);
  }
  return options;
};

export const loadRandomizeOptions = (): RandomizeOptions => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RANDOMIZE_OPTIONS_KEY) ?? "null");
    return saved && typeof saved === "object"
      ? sanitizeRandomizeOptions(saved as Record<string, unknown>)
      : DEFAULT_RANDOMIZE_OPTIONS;
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
