import { isOverlapColor, isPaletteColor, type OverlapColor, type PaletteColor } from "./palette";
import {
  isBlob,
  isSafeBlobPath,
  isShapeIndex,
  prettyName,
  SHAPES,
  SmoothnessIndex,
} from "./shapes";
import type { Size } from "./formats";
import { clamp, normDeg } from "./utils";

export type ShapeLayer = {
  type: "shape";
  shape: number;
  path?: undefined;
  points?: undefined;
  smoothness?: SmoothnessIndex;
};
export type BlobLayer = {
  type: "blob";
  path: string;
  shape?: undefined;
  points: {
    x: number;
    y: number;
  }[];
  smoothness: SmoothnessIndex;
};

export type ShapeSpec = ShapeLayer | BlobLayer;

export type Layer = {
  id: string;
  type: ShapeSpec["type"];
  shape?: ShapeSpec["shape"];
  path?: ShapeSpec["path"];
  points?: ShapeSpec["points"];
  smoothness?: ShapeSpec["smoothness"];
  size: number;
  x: number;
  y: number;
  rot: number;
  fill: PaletteColor;
  overlap: OverlapColor;
  opacity?: number;
};
export const LAYER_SIZE_PCT = { min: 5, max: 400 } as const;

let nextId = 0;
export const newLayerId = () => `l${Date.now().toString(36)}${(nextId++).toString(36)}`;

export const layerPath = (layer: Pick<Layer, "shape" | "path">) =>
  layer.path ?? SHAPES[layer.shape ?? 0].path;

export const layerName = (layer: Pick<Layer, "type" | "shape" | "path">) =>
  isBlob(layer) ? "Blob" : prettyName(SHAPES[layer.shape ?? 0].name);

export const layerTransform = (layer: Layer) =>
  `translate(${layer.x} ${layer.y}) scale(${layer.size}) rotate(${layer.rot} 0.5 0.5)`;

export const hasOverlap = (layer: Layer, index: number) => index > 0 && layer.overlap !== "none";

const layerSizeBounds = (canvas: Size) => {
  const minDimension = Math.min(canvas.width, canvas.height);
  return {
    min: (LAYER_SIZE_PCT.min / 100) * minDimension,
    max: (LAYER_SIZE_PCT.max / 100) * minDimension,
  };
};

export const clampLayerSize = (size: number, canvas: Size) => {
  const { min, max } = layerSizeBounds(canvas);
  return clamp(size, min, max);
};

export const resizeAroundCenter = (layer: Layer, size: number, canvas: Size): Layer => {
  const centerX = layer.x + layer.size / 2;
  const centerY = layer.y + layer.size / 2;
  const nextSize = clampLayerSize(size, canvas);
  return { ...layer, size: nextSize, x: centerX - nextSize / 2, y: centerY - nextSize / 2 };
};

export const withSpec = (layer: Layer, spec: ShapeSpec): Layer => {
  const next: Layer = { ...layer, ...spec };
  if (isBlob(spec)) {
    delete next.shape;
  } else {
    delete next.path;
    delete next.points;
    delete next.smoothness;
  }
  return next;
};

export const rescaleLayers = (layers: Layer[], fromSize: Size, toSize: Size): Layer[] => {
  if (fromSize.width === toSize.width && fromSize.height === toSize.height) return layers;
  const scaleFactor = Math.sqrt(
    (toSize.width * toSize.height) / (fromSize.width * fromSize.height),
  );
  return layers.map((layer) => {
    const centerX = ((layer.x + layer.size / 2) * toSize.width) / fromSize.width;
    const centerY = ((layer.y + layer.size / 2) * toSize.height) / fromSize.height;
    const newSize = Math.round(layer.size * scaleFactor);
    return {
      ...layer,
      size: newSize,
      x: Math.round(centerX - newSize / 2),
      y: Math.round(centerY - newSize / 2),
    };
  });
};

export const sanitizeLayer = (raw: unknown, canvas: Size): Layer | null => {
  if (!raw || typeof raw !== "object") return null;
  const layer = raw as ShapeSpec & Record<string, unknown>;
  if (isBlob(layer) ? !isSafeBlobPath(layer.path) : !isShapeIndex(layer.shape)) return null;
  if (![layer.size, layer.x, layer.y, layer.rot].every((v) => Number.isFinite(v))) return null;
  const size = clampLayerSize(layer.size as number, canvas);
  if (!isPaletteColor(layer.fill)) return null;
  if (layer.overlap !== undefined && !isOverlapColor(layer.overlap)) return null;
  const opacity = layer.opacity;
  if (
    opacity !== undefined &&
    !(Number.isFinite(opacity) && (opacity as number) >= 0.05 && (opacity as number) <= 1)
  )
    return null;
  const centerX = (layer.x as number) + (layer.size as number) / 2;
  const centerY = (layer.y as number) + (layer.size as number) / 2;
  return {
    id: typeof layer.id === "string" ? layer.id : newLayerId(),
    ...(isBlob(layer)
      ? {
          type: "blob",
          path: layer.path,
          points: layer.points,
          smoothness: layer.smoothness,
        }
      : { type: "shape", shape: layer.shape }),
    size,
    x: centerX - size / 2,
    y: centerY - size / 2,
    rot: normDeg(layer.rot as number),
    fill: layer.fill,
    overlap: (layer.overlap as OverlapColor | undefined) ?? "primary-container",
    ...(opacity !== undefined ? { opacity: opacity as number } : {}),
  };
};
