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

export interface Toggle {
  enabled: boolean;
}
export interface RangeToggle extends Toggle {
  min: number;
  max: number;
}

export interface RandomizeOptions {
  shapeCount: RangeToggle;
  positionX: Toggle;
  positionY: Toggle;
  spreadStrength: number;
  minimumGap: Toggle & { gap: number };
  /** Overlap depth in % of the smaller shape. */
  allowOverlap: RangeToggle;
  limitOverlapCount: RangeToggle;
  /** How far a shape may stick out, in % of its size. */
  canvasSpill: Toggle & { bleed: number };
  shapeType: Toggle;
  shapeIndex: Toggle;
  blobContour: Toggle;
  blobEdges: RangeToggle;
  blobSmoothness: RangeToggle;
  /** Size in % of the shorter canvas side. */
  size: RangeToggle;
  rotation: Toggle & { range: number };
  opacity: RangeToggle;
  fill: Toggle;
  overlapColor: Toggle;
  hue: Toggle & { range: number };
  pattern: Toggle;
  patternOpacity: RangeToggle;
  patternScale: RangeToggle;
  layerOrder: Toggle;
}

export type ToggleKey = {
  [K in keyof RandomizeOptions]: RandomizeOptions[K] extends Toggle ? K : never;
}[keyof RandomizeOptions];

export type RangeKey = {
  [K in keyof RandomizeOptions]: RandomizeOptions[K] extends RangeToggle ? K : never;
}[keyof RandomizeOptions];

export interface Limit {
  min: number;
  max: number;
  step: number;
}

// Slider limits for every numeric setting, also used to sanitize saved options.
export const RANDOMIZE_LIMITS = {
  shapeCount: { min: 0, max: 40, step: 1 },
  spreadStrength: { min: 0, max: 100, step: 5 },
  minimumGap: { min: 0, max: 400, step: 8 },
  allowOverlap: { min: 0, max: 100, step: 1 },
  limitOverlapCount: { min: 0, max: 40, step: 1 },
  canvasSpill: { min: 0, max: 100, step: 5 },
  blobEdges: { min: BLOB_MIN_EDGES, max: BLOB_MAX_EDGES, step: 1 },
  blobSmoothness: { min: 0, max: SMOOTHNESS.length - 1, step: 1 },
  // Above 100% only fits when shapes may spill over the canvas.
  size: { min: 5, max: 200, step: 5 },
  rotation: { min: 0, max: 180, step: 15 },
  opacity: { min: 5, max: 100, step: 5 },
  hue: { min: 0, max: 180, step: 5 },
  patternOpacity: { ...PATTERN_OPACITY, step: 0.02 },
  patternScale: { ...PATTERN_SCALE, step: 0.1 },
} satisfies Partial<Record<keyof RandomizeOptions, Limit>>;

export const SIZE_MAX_WITHOUT_SPILL = 100;

export const DEFAULT_RANDOMIZE_OPTIONS: RandomizeOptions = {
  shapeCount: { enabled: true, min: 3, max: 12 },
  positionX: { enabled: true },
  positionY: { enabled: true },
  spreadStrength: 0,
  minimumGap: { enabled: false, gap: 48 },
  allowOverlap: { enabled: true, min: 0, max: 100 },
  limitOverlapCount: { enabled: false, min: 0, max: 4 },
  canvasSpill: { enabled: false, bleed: 35 },
  shapeType: { enabled: false },
  shapeIndex: { enabled: true },
  blobContour: { enabled: true },
  blobEdges: { enabled: false, min: BLOB_MIN_EDGES, max: BLOB_MAX_EDGES },
  blobSmoothness: { enabled: false, min: 0, max: SMOOTHNESS.length - 1 },
  size: { enabled: true, min: 15, max: 80 },
  rotation: { enabled: true, range: 180 },
  opacity: { enabled: false, min: 15, max: 100 },
  fill: { enabled: true },
  overlapColor: { enabled: true },
  hue: { enabled: true, range: 180 },
  pattern: { enabled: true },
  patternOpacity: { enabled: false, min: PATTERN_OPACITY.min, max: PATTERN_OPACITY.max },
  patternScale: { enabled: false, min: PATTERN_SCALE.min, max: PATTERN_SCALE.max },
  layerOrder: { enabled: false },
};

// Random positions tried per shape before settling for the best one found.
const RANDOMIZE_ATTEMPTS = 240;
// Chance that "Shape or blob type" turns a shape into a blob.
const BLOB_RANDOM_CHANCE = 0.3;
// Repair pass: how often every layer may be moved, how often an equally good position is
// remembered, and how often a layer is then moved there to get out of a dead end.
const REPAIR_PASSES = 4;
const EQUAL_POSITION_CHANCE = 0.02;
const EQUAL_MOVE_CHANCE = 0.15;

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

// A new layer for "Shape count": a copy of an existing layer, or a circle if there are none.
const randomizeLayerBase = (canvas: Size, template?: Layer): Layer =>
  template
    ? { ...template, id: newLayerId() }
    : randomPlacement(canvas, { type: "shape", shape: shapeIndex("circle", 0) });

/**
 * Randomizes the enabled properties of every layer, then places the layers so they follow the
 * placement rules (overlap, gap, canvas spill, neighbors) as well as possible.
 * `satisfied` is false when some rule could not be met; the caller shows a toast then.
 */
export const randomizeLayers = (
  layers: Layer[],
  canvas: Size,
  options: RandomizeOptions,
  currentPrefs: Prefs,
): { layers: Layer[]; prefs: Prefs; satisfied: boolean } => {
  type Bounds = { left: number; right: number; top: number; bottom: number };
  const boundsCache = new WeakMap<Layer, Bounds>();
  // Placement candidates are copies of their layer with the same rotation, so they share its extent.
  const extentCache = new WeakMap<Layer, Bounds>();
  // Edges of the rotated outline relative to the layer center, in units of `size`.
  const extentFor = (layer: Layer): Bounds => {
    const cached = extentCache.get(layer);
    if (cached) return cached;
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
    extentCache.set(layer, extent);
    return extent;
  };
  // Bounding box of the layer on the canvas, in px.
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
  // Copy of the layer at a random position on the enabled axes, keeping its outline within the
  // canvas (plus the allowed spill). Positions are rounded inward so they never stick out.
  const withRandomPosition = (layer: Layer): Layer => {
    const extent = extentFor(layer);
    const bleed = options.canvasSpill.enabled ? (options.canvasSpill.bleed / 100) * layer.size : 0;
    const randomStart = (length: number, low: number, high: number, current: number) => {
      const min = Math.ceil(-bleed - layer.size * (low + 0.5));
      const max = Math.floor(length + bleed - layer.size * (high + 0.5));
      return max >= min ? Math.round(rnd(min, max)) : current;
    };
    const candidate = {
      ...layer,
      x: options.positionX.enabled
        ? randomStart(canvas.width, extent.left, extent.right, layer.x)
        : layer.x,
      y: options.positionY.enabled
        ? randomStart(canvas.height, extent.top, extent.bottom, layer.y)
        : layer.y,
    };
    extentCache.set(candidate, extent);
    return candidate;
  };
  // Distance between the bounding boxes of two layers; 0 when they touch or overlap.
  const gapFor = (a: Layer, b: Layer) => {
    const boundsA = boundsFor(a);
    const boundsB = boundsFor(b);
    const dx = Math.max(0, boundsA.left - boundsB.right, boundsB.left - boundsA.right);
    const dy = Math.max(0, boundsA.top - boundsB.bottom, boundsB.top - boundsA.bottom);
    return Math.hypot(dx, dy);
  };
  // How badly a scene breaks the rules; 0 means it follows them all. Scenes are compared by
  // `hard` first (spill, no overlap, gap, max neighbors), then `soft` (overlap depth, min neighbors).
  const scoreScene = (scene: Layer[]) => {
    let hard = 0;
    let soft = 0;
    const bounds = scene.map(boundsFor);
    const overlapCounts = Array<number>(scene.length).fill(0);
    for (let index = 0; index < scene.length; index += 1) {
      const layer = scene[index];
      const layerBounds = bounds[index];
      if (!options.canvasSpill.enabled) {
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
        if (overlap > 0 && !options.allowOverlap.enabled) hard += overlap;
        if (options.allowOverlap.enabled && overlap > 0) {
          const smallerSize = Math.min(layer.size, other.size);
          const minimumOverlap = (smallerSize * options.allowOverlap.min) / 100;
          const maximumOverlap = (smallerSize * options.allowOverlap.max) / 100;
          soft += Math.max(0, minimumOverlap - overlap) + Math.max(0, overlap - maximumOverlap);
        }
        if (options.minimumGap.enabled && overlap === 0)
          hard += Math.max(0, options.minimumGap.gap - gapFor(layer, other));
      }
    }
    // Weighted by size so that breaking the rule with a big shape counts more.
    if (options.limitOverlapCount.enabled) {
      for (let index = 0; index < scene.length; index += 1) {
        const layer = scene[index];
        const count = overlapCounts[index];
        hard += Math.max(0, count - options.limitOverlapCount.max) * layer.size;
        soft += Math.max(0, options.limitOverlapCount.min - count) * layer.size;
      }
    }
    return { hard, soft };
  };

  // Shape count: drop layers from the end, or add copies of existing ones.
  let startingLayers = layers;
  if (options.shapeCount.enabled) {
    const targetCount = Math.round(rnd(options.shapeCount.min, options.shapeCount.max));
    startingLayers = layers.slice(0, targetCount);
    while (startingLayers.length < targetCount) {
      const template = layers.length ? layers[startingLayers.length % layers.length] : undefined;
      startingLayers = [...startingLayers, randomizeLayerBase(canvas, template)];
    }
  }

  // Randomize each layer's own properties, then place it among the layers placed before it.
  const placed: Layer[] = [];
  for (const original of startingLayers) {
    let layer = original;
    const previousShape = isBlob(layer) ? undefined : (layer.shape ?? 0);

    if (options.shapeType.enabled) {
      if (Math.random() < BLOB_RANDOM_CHANCE) {
        if (!isBlob(layer)) layer = withSpec(layer, { type: "blob", ...randomBlob() });
      } else {
        layer = withSpec(layer, { type: "shape", shape: previousShape ?? shapeIndex("circle", 0) });
      }
    }

    if (options.shapeIndex.enabled && !isBlob(layer))
      layer = { ...layer, shape: randomShapeIndex(previousShape) };

    if (
      isBlob(layer) &&
      (options.blobContour.enabled || options.blobEdges.enabled || options.blobSmoothness.enabled)
    ) {
      const edges = options.blobEdges.enabled
        ? Math.round(rnd(options.blobEdges.min, options.blobEdges.max))
        : layer.points.length;
      const smoothness = options.blobSmoothness.enabled
        ? (Math.round(
            rnd(options.blobSmoothness.min, options.blobSmoothness.max),
          ) as SmoothnessIndex)
        : layer.smoothness;
      layer = { ...layer, ...createBlob(edges, smoothness) };
    }

    // Rotation comes before size: how much room a shape needs depends on its rotation.
    if (options.rotation.enabled)
      layer = { ...layer, rot: normDeg(rnd(-options.rotation.range, options.rotation.range)) };
    if (options.size.enabled) {
      const minDimension = Math.min(canvas.width, canvas.height);
      let minSize = (options.size.min / 100) * minDimension;
      let maxSize = (options.size.max / 100) * minDimension;
      // Without spill, cap the size so the shape fits: anywhere on the canvas along an axis that
      // gets a random position, or around its current center along a fixed one. Staying inside
      // wins over the minimum size.
      if (!options.canvasSpill.enabled) {
        const extent = extentFor(layer);
        const centerX = layer.x + layer.size / 2;
        const centerY = layer.y + layer.size / 2;
        const fitWidth = options.positionX.enabled
          ? canvas.width / (extent.right - extent.left)
          : Math.min(centerX / -extent.left, (canvas.width - centerX) / extent.right);
        const fitHeight = options.positionY.enabled
          ? canvas.height / (extent.bottom - extent.top)
          : Math.min(centerY / -extent.top, (canvas.height - centerY) / extent.bottom);
        maxSize = Math.min(maxSize, Math.max(0, fitWidth), Math.max(0, fitHeight));
        minSize = Math.min(minSize, maxSize);
      }
      layer = resizeAroundCenter(layer, Math.floor(rnd(minSize, maxSize)), canvas);
    }
    if (options.opacity.enabled)
      layer = { ...layer, opacity: rnd(options.opacity.min, options.opacity.max) / 100 };
    if (options.fill.enabled) layer = { ...layer, fill: randomFill() };
    if (options.overlapColor.enabled) layer = { ...layer, overlap: randomOverlap(layer.fill) };

    // Try random positions and keep the one that breaks the rules least. With spread, collect
    // several valid positions and take the one furthest from other shapes and the edges.
    if (options.positionX.enabled || options.positionY.enabled) {
      let best = layer;
      let bestScore = { hard: Number.POSITIVE_INFINITY, soft: Number.POSITIVE_INFINITY };
      // 1 valid position at 0% spread, up to all attempts at 100%.
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

  // Repair pass: layers placed early couldn't account for later ones (e.g. min neighbors), so if
  // rules are still broken, move one layer at a time to a better position and keep the best scene.
  let bestScene = [...placed];
  let bestSceneScore = scoreScene(bestScene);
  if (
    (bestSceneScore.hard > 0 || bestSceneScore.soft > 0) &&
    (options.positionX.enabled || options.positionY.enabled)
  ) {
    let workingScore = bestSceneScore;
    const movableIndices = placed.map((_, index) => index);
    for (let pass = 0; pass < REPAIR_PASSES; pass += 1) {
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
            Math.random() < EQUAL_POSITION_CHANCE
          ) {
            // Occasionally remember an equally good position, to get unstuck from a dead end.
            equalCandidate = candidate;
          }
        }
        if (
          bestCandidateScore.hard < workingScore.hard ||
          bestCandidateScore.soft < workingScore.soft
        ) {
          placed[index] = bestCandidate;
          workingScore = bestCandidateScore;
        } else if (equalCandidate && Math.random() < EQUAL_MOVE_CHANCE) {
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

  // Background and colors.
  let prefs = currentPrefs;
  if (options.hue.enabled)
    prefs = { ...prefs, hue: normDeg(prefs.hue + rnd(-options.hue.range, options.hue.range)) };
  if (options.pattern.enabled) prefs = { ...prefs, pattern: pickRandom(PATTERNS) };
  if (options.patternOpacity.enabled)
    prefs = {
      ...prefs,
      opacity: clampOpacity(rnd(options.patternOpacity.min, options.patternOpacity.max)),
    };
  if (options.patternScale.enabled)
    prefs = {
      ...prefs,
      patternScale: clampScale(rnd(options.patternScale.min, options.patternScale.max)),
    };
  // Stacking order doesn't affect the rules, so it's shuffled after placement.
  const randomizedLayers = options.layerOrder.enabled ? shuffle(placed) : placed;
  const finalScore = scoreScene(placed);
  return {
    layers: randomizedLayers,
    prefs,
    satisfied: finalScore.hard === 0 && finalScore.soft === 0,
  };
};
