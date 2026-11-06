import type { Size } from "./formats";
import { newLayerId, sanitizeLayer, type Layer } from "./layer";
import { isPaletteColor, OVERLAP_OPTIONS, PALETTE, type OverlapColor } from "./palette";
import { isPatternId, type PatternId } from "./patterns";
import {
  BLOB_MAX_EDGES,
  BLOB_MIN_EDGES,
  createBlobPath,
  isBlob,
  SHAPES,
  SMOOTHNESS,
  type SmoothnessIndex,
} from "./shapes";
import { camel, lowerFirst, normDeg, round } from "./utils";
import { clampOpacity } from "./prefs";
import { isSchemeVariant, isSpecVersion, type SchemeVariant, type SpecVersion } from "./theme";

export interface LayoutColors {
  dark: boolean;
  hue: number;
  scheme: SchemeVariant;
  spec: SpecVersion;
}

export interface LayoutFile extends Partial<LayoutColors> {
  layers: Layer[];
  pattern?: PatternId;
  strength?: number;
  skipped: number;
}

export const serializeLayout = (
  layers: Layer[],
  canvas: Size,
  pattern: PatternId,
  strength: number,
  colors?: LayoutColors,
) => {
  const minDimension = Math.min(canvas.width, canvas.height);
  const rows = layers.map((layer, index) => {
    const object: Record<string, unknown> = {};
    if (isBlob(layer)) {
      object.shape = "blob";
      object.path = layer.path;
      object.points = layer.points.map((point) => ({ x: round(point.x, 4), y: round(point.y, 4) }));
      object.smoothness = layer.smoothness;
    } else {
      object.shape = lowerFirst(SHAPES[layer.shape ?? 0].name);
    }
    object.x = round((layer.x + layer.size / 2) / canvas.width);
    object.y = round((layer.y + layer.size / 2) / canvas.height);
    object.size = round(layer.size / minDimension);
    const rotationValue = normDeg(layer.rot);
    object.rotation = round(rotationValue > 180 ? rotationValue - 360 : rotationValue, 1);
    object.fill = camel(layer.fill);
    if (index > 0 && layer.overlap !== "none") object.overlap = camel(layer.overlap);
    if (layer.opacity !== undefined) object.opacity = round(layer.opacity, 2);
    return "    " + JSON.stringify(object);
  });
  const layersText = rows.length ? `[\n${rows.join(",\n")}\n  ]` : "[]";
  const colorsText = colors
    ? `,\n  "theme": "${colors.dark ? "dark" : "light"}",\n  "hue": ${round(normDeg(colors.hue), 2)},\n  "scheme": ${JSON.stringify(colors.scheme)},\n  "spec": ${JSON.stringify(colors.spec)}`
    : "";
  return `{\n  "layers": ${layersText},\n  "pattern": ${JSON.stringify(pattern)},\n  "strength": ${round(strength, 2)}${colorsText}\n}\n`;
};

export type ParseResult = { ok: true; layout: LayoutFile } | { ok: false; error: string };

const isSmoothness = (value: unknown): value is SmoothnessIndex =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < SMOOTHNESS.length;

const isPoints = (value: unknown): value is { x: number; y: number }[] =>
  Array.isArray(value) &&
  value.length >= BLOB_MIN_EDGES &&
  value.length <= BLOB_MAX_EDGES &&
  value.every((position) => position && Number.isFinite(position.x) && Number.isFinite(position.y));

const blobFields = (record: Record<string, unknown>) => {
  const smoothness = isSmoothness(record.smoothness) ? record.smoothness : 0;
  if (isPoints(record.points)) {
    return { points: record.points, smoothness, d: createBlobPath(record.points, smoothness) };
  }
  return { d: record.path };
};

export const parseLayout = (text: string, canvas: Size): ParseResult => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!data || typeof data !== "object" || !Array.isArray((data as { layers?: unknown }).layers)) {
    return { ok: false, error: "No layout found in that file." };
  }
  const file = data as {
    layers: unknown[];
    pattern?: unknown;
    strength?: unknown;
    theme?: unknown;
    hue?: unknown;
    scheme?: unknown;
    spec?: unknown;
  };
  const minDimension = Math.min(canvas.width, canvas.height);
  const layers: Layer[] = [];
  for (const rawLayer of file.layers) {
    if (!rawLayer || typeof rawLayer !== "object") continue;
    const raw = rawLayer as Record<string, unknown>;
    const size = Number(raw.size) * minDimension;
    const candidate: Record<string, unknown> = {
      id: newLayerId(),
      size,
      x: Number(raw.x) * canvas.width - size / 2,
      y: Number(raw.y) * canvas.height - size / 2,
      rot: normDeg(Number(raw.rotation) || 0),
      fill: PALETTE.find((color) => camel(color) === raw.fill),
      overlap:
        OVERLAP_OPTIONS.find((color) => camel(color) === raw.overlap) ?? ("none" as OverlapColor),
    };
    if (raw.shape === "blob") Object.assign(candidate, blobFields(raw));
    else candidate.shape = SHAPES.findIndex((shape) => lowerFirst(shape.name) === raw.shape);
    if (raw.opacity !== undefined) candidate.opacity = raw.opacity;
    if (!isPaletteColor(candidate.fill)) continue;
    const layer = sanitizeLayer(candidate, canvas);
    if (layer) layers.push(layer);
  }
  if (!layers.length && file.layers.length) {
    return { ok: false, error: "None of the shapes in that file could be read." };
  }
  const layout: LayoutFile = { layers, skipped: file.layers.length - layers.length };
  if (isPatternId(file.pattern)) layout.pattern = file.pattern;
  if (typeof file.strength === "number" && Number.isFinite(file.strength))
    layout.strength = clampOpacity(file.strength);
  if (file.theme === "dark" || file.theme === "light") layout.dark = file.theme === "dark";
  if (typeof file.hue === "number" && Number.isFinite(file.hue))
    layout.hue = round(normDeg(file.hue), 2);
  if (isSchemeVariant(file.scheme)) layout.scheme = file.scheme;
  if (isSpecVersion(file.spec)) layout.spec = file.spec;
  return { ok: true, layout };
};

export const installLink = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `dms://wallpaper/install/${base64}`;
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
};
