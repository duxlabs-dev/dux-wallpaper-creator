import { newLayerId, resizeAroundCenter, withSpec, type Layer, type ShapeSpec } from "@/lib/layer";
import { randomFill, randomOverlap } from "@/lib/palette";
import { PATTERN_OPACITY, PATTERN_SCALE, PATTERNS } from "@/lib/patterns";
import { clampOpacity, clampScale, type Prefs } from "@/lib/prefs";
import {
  BLOB_MAX_EDGES,
  BLOB_MIN_EDGES,
  createBlob,
  isBlob,
  randomBlob,
  randomShapeIndex,
  SHAPES,
  shapeIndex,
  SMOOTHNESS,
  type SmoothnessIndex,
} from "@/lib/shapes";
import type { Size } from "@/lib/formats";
import { normDeg, pickRandom, rnd, shuffle } from "@/lib/utils";

export interface RandomizeOptions {
  positionX: boolean;
  positionY: boolean;
  shapeCount: boolean;
  shapeType: boolean;
  shapeIndex: boolean;
  blobContour: boolean;
  blobEdges: boolean;
  blobSmoothness: boolean;
  size: boolean;
  rotation: boolean;
  opacity: boolean;
  fill: boolean;
  overlapColor: boolean;
  hue: boolean;
  pattern: boolean;
  patternOpacity: boolean;
  patternScale: boolean;
  layerOrder: boolean;
  minimumGap: boolean;
  allowOverlap: boolean;
  limitOverlapCount: boolean;
  canvasSpill: boolean;
  sizeMin: number;
  sizeMax: number;
  countMin: number;
  countMax: number;
  rotationRange: number;
  opacityMin: number;
  opacityMax: number;
  blobEdgesMin: number;
  blobEdgesMax: number;
  blobSmoothnessMin: number;
  blobSmoothnessMax: number;
  hueRange: number;
  patternOpacityMin: number;
  patternOpacityMax: number;
  patternScaleMin: number;
  patternScaleMax: number;
  spreadStrength: number;
  gap: number;
  overlapMin: number;
  overlapMax: number;
  minOverlapCount: number;
  maxOverlapCount: number;
  bleed: number;
}

export const DEFAULT_RANDOMIZE_OPTIONS: RandomizeOptions = {
  positionX: true,
  positionY: true,
  shapeCount: true,
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
  hue: true,
  pattern: true,
  patternOpacity: false,
  patternScale: false,
  layerOrder: false,
  minimumGap: false,
  allowOverlap: true,
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
  patternOpacityMin: PATTERN_OPACITY.min,
  patternOpacityMax: PATTERN_OPACITY.max,
  patternScaleMin: PATTERN_SCALE.min,
  patternScaleMax: PATTERN_SCALE.max,
  spreadStrength: 0,
  gap: 48,
  overlapMin: 0,
  overlapMax: 100,
  minOverlapCount: 0,
  maxOverlapCount: 4,
  bleed: 35,
};

const RANDOMIZE_ATTEMPTS = 240;
const BLOB_RANDOM_CHANCE = 0.3;

const randomSize = (canvas: Size) =>
  Math.round(rnd(400, 860) * (Math.min(canvas.width, canvas.height) / 1080));

export const randomPlacement = (canvas: Size, spec: ShapeSpec): Layer => {
  const size = randomSize(canvas);
  const fill = randomFill();
  return {
    id: newLayerId(),
    ...spec,
    size,
    x: Math.round(canvas.width / 2 - size / 2),
    y: Math.round(canvas.height / 2 - size / 2),
    rot: 0,
    fill,
    overlap: randomOverlap(fill),
  };
};

const randomizeLayerBase = (canvas: Size, template?: Layer): Layer =>
  template
    ? { ...template, id: newLayerId() }
    : randomPlacement(canvas, { type: "shape", shape: shapeIndex("circle", 0) });

export const randomizeLayers = (
  layers: Layer[],
  canvas: Size,
  options: RandomizeOptions,
  currentPrefs: Prefs,
): { layers: Layer[]; prefs: Prefs; satisfied: boolean } => {
  type Bounds = { left: number; right: number; top: number; bottom: number };
  const boundsCache = new WeakMap<Layer, Bounds>();
  // Edges of the rotated outline relative to the layer center, in units of `size`.
  const extentFor = (layer: Layer): Bounds => {
    const outline = isBlob(layer) ? layer.points : SHAPES[layer.shape ?? 0].outline;
    const angle = (layer.rot * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const extent = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const point of outline) {
      const x = point.x - 0.5;
      const y = point.y - 0.5;
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      extent.left = Math.min(extent.left, rotatedX);
      extent.right = Math.max(extent.right, rotatedX);
      extent.top = Math.min(extent.top, rotatedY);
      extent.bottom = Math.max(extent.bottom, rotatedY);
    }
    return extent;
  };
  const boundsFor = (layer: Layer) => {
    const cached = boundsCache.get(layer);
    if (cached) return cached;
    const extent = extentFor(layer);
    const centerX = layer.x + layer.size / 2;
    const centerY = layer.y + layer.size / 2;
    const bounds = {
      left: centerX + layer.size * extent.left,
      right: centerX + layer.size * extent.right,
      top: centerY + layer.size * extent.top,
      bottom: centerY + layer.size * extent.bottom,
    };
    boundsCache.set(layer, bounds);
    return bounds;
  };
  const withRandomPosition = (layer: Layer): Layer => {
    const extent = extentFor(layer);
    const bleed = options.canvasSpill ? (options.bleed / 100) * layer.size : 0;
    const randomStart = (length: number, low: number, high: number, current: number) => {
      const min = Math.ceil(-bleed - layer.size * (low + 0.5));
      const max = Math.floor(length + bleed - layer.size * (high + 0.5));
      return max >= min ? Math.round(rnd(min, max)) : current;
    };
    return {
      ...layer,
      x: options.positionX
        ? randomStart(canvas.width, extent.left, extent.right, layer.x)
        : layer.x,
      y: options.positionY
        ? randomStart(canvas.height, extent.top, extent.bottom, layer.y)
        : layer.y,
    };
  };
  const gapFor = (a: Layer, b: Layer) => {
    const boundsA = boundsFor(a);
    const boundsB = boundsFor(b);
    const dx = Math.max(0, boundsA.left - boundsB.right, boundsB.left - boundsA.right);
    const dy = Math.max(0, boundsA.top - boundsB.bottom, boundsB.top - boundsA.bottom);
    return Math.hypot(dx, dy);
  };
  const scoreScene = (scene: Layer[]) => {
    let hard = 0;
    let soft = 0;
    const bounds = scene.map(boundsFor);
    const overlapCounts = Array<number>(scene.length).fill(0);
    for (let index = 0; index < scene.length; index += 1) {
      const layer = scene[index];
      const layerBounds = bounds[index];
      if (!options.canvasSpill) {
        hard += Math.max(0, -layerBounds.left) + Math.max(0, layerBounds.right - canvas.width);
        hard += Math.max(0, -layerBounds.top) + Math.max(0, layerBounds.bottom - canvas.height);
      }
      for (let otherIndex = index + 1; otherIndex < scene.length; otherIndex += 1) {
        const other = scene[otherIndex];
        const otherBounds = bounds[otherIndex];
        const overlap = Math.max(
          0,
          Math.min(
            layerBounds.right - otherBounds.left,
            otherBounds.right - layerBounds.left,
            layerBounds.bottom - otherBounds.top,
            otherBounds.bottom - layerBounds.top,
          ),
        );
        if (overlap > 0) {
          overlapCounts[index] += 1;
          overlapCounts[otherIndex] += 1;
        }
        if (overlap > 0 && !options.allowOverlap) hard += overlap;
        if (options.allowOverlap && overlap > 0) {
          const smallerSize = Math.min(layer.size, other.size);
          const minimumOverlap = (smallerSize * options.overlapMin) / 100;
          const maximumOverlap = (smallerSize * options.overlapMax) / 100;
          soft += Math.max(0, minimumOverlap - overlap) + Math.max(0, overlap - maximumOverlap);
        }
        if (options.minimumGap && overlap === 0)
          hard += Math.max(0, options.gap - gapFor(layer, other));
      }
    }
    if (options.limitOverlapCount) {
      for (let index = 0; index < scene.length; index += 1) {
        const layer = scene[index];
        const count = overlapCounts[index];
        hard += Math.max(0, count - options.maxOverlapCount) * layer.size;
        soft += Math.max(0, options.minOverlapCount - count) * layer.size;
      }
    }
    return { hard, soft };
  };

  let startingLayers = layers;
  if (options.shapeCount) {
    const targetCount = Math.round(rnd(options.countMin, options.countMax));
    startingLayers = layers.slice(0, targetCount);
    while (startingLayers.length < targetCount) {
      const template = layers.length ? layers[startingLayers.length % layers.length] : undefined;
      startingLayers = [...startingLayers, randomizeLayerBase(canvas, template)];
    }
  }

  const placed: Layer[] = [];
  for (const original of startingLayers) {
    let layer = original;
    const previousShape = isBlob(layer) ? undefined : (layer.shape ?? 0);

    if (options.shapeType) {
      if (Math.random() < BLOB_RANDOM_CHANCE) {
        if (!isBlob(layer)) layer = withSpec(layer, { type: "blob", ...randomBlob() });
      } else {
        layer = withSpec(layer, { type: "shape", shape: previousShape ?? shapeIndex("circle", 0) });
      }
    }

    if (options.shapeIndex && !isBlob(layer))
      layer = { ...layer, shape: randomShapeIndex(previousShape) };

    if (isBlob(layer) && (options.blobContour || options.blobEdges || options.blobSmoothness)) {
      const edges = options.blobEdges
        ? Math.round(rnd(options.blobEdgesMin, options.blobEdgesMax))
        : layer.points.length;
      const smoothness = options.blobSmoothness
        ? (Math.round(rnd(options.blobSmoothnessMin, options.blobSmoothnessMax)) as SmoothnessIndex)
        : layer.smoothness;
      layer = { ...layer, ...createBlob(edges, smoothness) };
    }

    if (options.rotation)
      layer = { ...layer, rot: normDeg(rnd(-options.rotationRange, options.rotationRange)) };
    if (options.size) {
      const minDimension = Math.min(canvas.width, canvas.height);
      let minSize = (options.sizeMin / 100) * minDimension;
      let maxSize = (options.sizeMax / 100) * minDimension;
      if (!options.canvasSpill) {
        const extent = extentFor(layer);
        const centerX = layer.x + layer.size / 2;
        const centerY = layer.y + layer.size / 2;
        const fitWidth = options.positionX
          ? canvas.width / (extent.right - extent.left)
          : Math.min(centerX / -extent.left, (canvas.width - centerX) / extent.right);
        const fitHeight = options.positionY
          ? canvas.height / (extent.bottom - extent.top)
          : Math.min(centerY / -extent.top, (canvas.height - centerY) / extent.bottom);
        maxSize = Math.min(maxSize, Math.max(0, fitWidth), Math.max(0, fitHeight));
        minSize = Math.min(minSize, maxSize);
      }
      layer = resizeAroundCenter(layer, Math.floor(rnd(minSize, maxSize)), canvas);
    }
    if (options.opacity)
      layer = { ...layer, opacity: rnd(options.opacityMin, options.opacityMax) / 100 };
    if (options.fill) layer = { ...layer, fill: randomFill() };
    if (options.overlapColor) layer = { ...layer, overlap: randomOverlap(layer.fill) };

    if (options.positionX || options.positionY) {
      let best = layer;
      let bestScore = { hard: Number.POSITIVE_INFINITY, soft: Number.POSITIVE_INFINITY };
      const candidatesToCompare =
        options.spreadStrength > 0
          ? Math.max(1, Math.ceil(RANDOMIZE_ATTEMPTS ** (options.spreadStrength / 100)))
          : 1;
      const validCandidates: { layer: Layer; spread: number }[] = [];
      for (let attempt = 0; attempt < RANDOMIZE_ATTEMPTS; attempt += 1) {
        const candidate = withRandomPosition(layer);
        const candidateScore = scoreScene([...placed, candidate]);
        const bounds = boundsFor(candidate);
        const candidateSpread = Math.min(
          bounds.left,
          canvas.width - bounds.right,
          bounds.top,
          canvas.height - bounds.bottom,
          ...placed.map((other) => gapFor(candidate, other)),
        );
        if (
          candidateScore.hard < bestScore.hard ||
          (candidateScore.hard === bestScore.hard && candidateScore.soft < bestScore.soft)
        ) {
          best = candidate;
          bestScore = candidateScore;
        }
        if (candidateScore.hard === 0 && candidateScore.soft === 0) {
          validCandidates.push({ layer: candidate, spread: candidateSpread });
          if (validCandidates.length >= candidatesToCompare) break;
        }
      }
      if (validCandidates.length) {
        best = validCandidates.reduce((current, candidate) =>
          candidate.spread > current.spread ? candidate : current,
        ).layer;
      }
      layer = best;
    }
    placed.push(layer);
  }

  let bestScene = [...placed];
  let bestSceneScore = scoreScene(bestScene);
  if (
    (bestSceneScore.hard > 0 || bestSceneScore.soft > 0) &&
    (options.positionX || options.positionY)
  ) {
    let workingScore = bestSceneScore;
    const movableIndices = placed.map((_, index) => index);
    for (let pass = 0; pass < 4; pass += 1) {
      for (const index of shuffle(movableIndices)) {
        const layer = placed[index];
        let bestCandidate = layer;
        let bestCandidateScore = workingScore;
        let equalCandidate: Layer | undefined;
        for (let attempt = 0; attempt < RANDOMIZE_ATTEMPTS; attempt += 1) {
          const candidate = withRandomPosition(layer);
          const candidateScene = [...placed];
          candidateScene[index] = candidate;
          const candidateScore = scoreScene(candidateScene);
          if (
            candidateScore.hard < bestCandidateScore.hard ||
            (candidateScore.hard === bestCandidateScore.hard &&
              candidateScore.soft < bestCandidateScore.soft)
          ) {
            bestCandidate = candidate;
            bestCandidateScore = candidateScore;
          } else if (
            candidateScore.hard === workingScore.hard &&
            candidateScore.soft === workingScore.soft &&
            Math.random() < 0.02
          ) {
            equalCandidate = candidate;
          }
        }
        if (
          bestCandidateScore.hard < workingScore.hard ||
          bestCandidateScore.soft < workingScore.soft
        ) {
          placed[index] = bestCandidate;
          workingScore = bestCandidateScore;
        } else if (equalCandidate && Math.random() < 0.15) {
          placed[index] = equalCandidate;
        }
        if (
          workingScore.hard < bestSceneScore.hard ||
          (workingScore.hard === bestSceneScore.hard && workingScore.soft < bestSceneScore.soft)
        ) {
          bestScene = [...placed];
          bestSceneScore = workingScore;
        }
        if (bestSceneScore.hard === 0 && bestSceneScore.soft === 0) break;
      }
      if (bestSceneScore.hard === 0 && bestSceneScore.soft === 0) break;
    }
    placed.splice(0, placed.length, ...bestScene);
  }

  let prefs = currentPrefs;
  if (options.hue)
    prefs = { ...prefs, hue: normDeg(prefs.hue + rnd(-options.hueRange, options.hueRange)) };
  if (options.pattern) prefs = { ...prefs, pattern: pickRandom(PATTERNS) };
  if (options.patternOpacity)
    prefs = {
      ...prefs,
      opacity: clampOpacity(rnd(options.patternOpacityMin, options.patternOpacityMax)),
    };
  if (options.patternScale)
    prefs = {
      ...prefs,
      patternScale: clampScale(rnd(options.patternScaleMin, options.patternScaleMax)),
    };
  const randomizedLayers = options.layerOrder ? shuffle(placed) : placed;
  const finalScore = scoreScene(placed);
  return {
    layers: randomizedLayers,
    prefs,
    satisfied: finalScore.hard === 0 && finalScore.soft === 0,
  };
};
