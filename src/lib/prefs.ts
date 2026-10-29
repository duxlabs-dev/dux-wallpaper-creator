import { isFormatId, type FormatId, type Orientation, type Size } from "./formats";
import {
  DEFAULT_PATTERN,
  isPatternId,
  PATTERN_OPACITY,
  PATTERN_SCALE,
  type PatternId,
} from "./patterns";
import { isSchemeVariant, isSpecVersion, type SchemeVariant, type SpecVersion } from "./theme";
import { clamp, normDeg } from "./utils";

export interface Prefs {
  pattern: PatternId;
  opacity: number;
  hue: number;
  scheme: SchemeVariant;
  spec: SpecVersion;
  patternScale: number;
  format: FormatId;
  orientation: Orientation;
  custom: Size;
}

export const defaultPrefs = (): Prefs => ({
  pattern: DEFAULT_PATTERN,
  opacity: PATTERN_OPACITY.default,
  hue: 0,
  scheme: "tonal-spot",
  spec: "2021",
  patternScale: PATTERN_SCALE.default,
  format: "16:9",
  orientation: "landscape",
  custom: { width: 1920, height: 1080 },
});

export const clampOpacity = (v: number) => clamp(v, PATTERN_OPACITY.min, PATTERN_OPACITY.max);
export const clampScale = (v: number) => clamp(+v.toFixed(2), PATTERN_SCALE.min, PATTERN_SCALE.max);

const migratePattern = (pattern: unknown): PatternId => {
  if (pattern === "none") return "none";
  if (typeof pattern !== "string") return DEFAULT_PATTERN;
  const id = pattern.replace(/^.*\//, "").replace(/\.svg$/, "");
  return isPatternId(id) ? id : DEFAULT_PATTERN;
};

export const sanitizePrefs = (raw: unknown): Prefs => {
  const prefs = defaultPrefs();
  if (!raw || typeof raw !== "object") return prefs;
  const sanitizedPrefs = raw as Record<string, unknown>;
  prefs.pattern = migratePattern(sanitizedPrefs.pattern);
  if (typeof sanitizedPrefs.opacity === "number" && Number.isFinite(sanitizedPrefs.opacity))
    prefs.opacity = clampOpacity(sanitizedPrefs.opacity);
  if (typeof sanitizedPrefs.hue === "number" && Number.isFinite(sanitizedPrefs.hue))
    prefs.hue = normDeg(sanitizedPrefs.hue);
  if (isSchemeVariant(sanitizedPrefs.scheme)) prefs.scheme = sanitizedPrefs.scheme;
  if (isSpecVersion(sanitizedPrefs.spec)) prefs.spec = sanitizedPrefs.spec;
  if (
    typeof sanitizedPrefs.patternScale === "number" &&
    Number.isFinite(sanitizedPrefs.patternScale)
  )
    prefs.patternScale = clampScale(sanitizedPrefs.patternScale);
  if (isFormatId(sanitizedPrefs.format)) prefs.format = sanitizedPrefs.format;
  else if (sanitizedPrefs.format === "9:16") {
    prefs.format = "16:9";
    prefs.orientation = "portrait";
  } else if (sanitizedPrefs.format === "9:20") {
    prefs.format = "custom";
    prefs.custom = { width: 1080, height: 2400 };
  }
  if (sanitizedPrefs.orientation === "portrait") prefs.orientation = "portrait";
  const custom = sanitizedPrefs.custom as Partial<Size> | undefined;
  if (custom && Number.isFinite(custom.width) && Number.isFinite(custom.height))
    prefs.custom = { width: custom.width!, height: custom.height! };
  return prefs;
};
