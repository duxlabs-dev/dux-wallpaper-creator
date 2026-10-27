import { createStore, shallow } from "@tanstack/store";
import { useSelector } from "@tanstack/react-store";
import { canvasSize, clampPx, type FormatId, type Orientation, type Size } from "@/lib/formats";
import {
  newLayerId,
  rescaleLayers,
  resizeAroundCenter,
  type Layer,
  type ShapeSpec,
} from "@/lib/layer";
import type { LayoutFile } from "@/lib/layout-file";
import {
  OVERLAP_OPTIONS,
  PALETTE,
  randomFill,
  randomOverlap,
  type OverlapColor,
  type PaletteColor,
} from "@/lib/palette";
import { DEFAULT_PATTERN, PATTERNS, type PatternId } from "@/lib/patterns";
import { clampOpacity, clampScale, defaultPrefs, type Prefs } from "@/lib/prefs";
import {
  createBlob,
  isBlob,
  randomBlob,
  randomShapeIndex,
  shapeIndex,
  type SmoothnessIndex,
} from "@/lib/shapes";
import { loadSaved, persist } from "@/lib/storage";
import { normDeg, pickRandom, rnd } from "@/lib/utils";

export type LayerDirection = number;

export interface FormatPatch {
  format?: FormatId;
  orientation?: Orientation;
  custom?: Size;
}

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
  spread: boolean;
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

export interface WallpaperState {
  layers: Layer[];
  prefs: Prefs;
  canvas: Size;
  dark: boolean;
  activeId: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

type Snapshot = Pick<WallpaperState, "layers" | "prefs">;

const HISTORY_LIMIT = 100;
const BURST_MS = 600;

const defaultLayers = (): Layer[] => [
  {
    id: newLayerId(),
    type: "shape",
    shape: shapeIndex("flower", 28),
    size: 560,
    x: -120,
    y: -170,
    rot: 0,
    fill: "tertiary-container",
    overlap: "primary-container",
  },
  {
    id: newLayerId(),
    type: "shape",
    shape: shapeIndex("circle", 0),
    size: 1100,
    x: 1000,
    y: 380,
    rot: 0,
    fill: "primary",
    overlap: "secondary-container",
  },
  {
    id: newLayerId(),
    type: "shape",
    shape: shapeIndex("burst", 24),
    size: 620,
    x: 650,
    y: 230,
    rot: 18,
    fill: "tertiary",
    overlap: "primary-container",
  },
];

const initialState = (): WallpaperState => {
  const saved = loadSaved();
  const prefs = saved?.prefs ?? defaultPrefs();
  return {
    layers: saved?.layers ?? defaultLayers(),
    prefs,
    canvas: canvasSize(prefs.format, prefs.orientation, prefs.custom),
    dark: saved?.dark ?? true,
    activeId: null,
    canUndo: false,
    canRedo: false,
  };
};

const withCanvas = (prefs: Prefs) => ({
  prefs,
  canvas: canvasSize(prefs.format, prefs.orientation, prefs.custom),
});

const randomSize = (canvas: Size) =>
  Math.round(rnd(400, 860) * (Math.min(canvas.width, canvas.height) / 1080));

/* How many percent a shape may hang over the canvas edge */
const BLEED = 0.35;

/** Where a `size`-wide box lands at random along one axis of the canvas.
 * The axis is extended by `BLEED` to allow shapes hanging off the canvas. */
const randomAxis = (extent: number, size: number, bleed = BLEED) => {
  const min = -bleed * size;
  const max = extent - size + bleed * size;
  return max >= min ? rnd(min, max) : (extent - size) / 2;
};

const randomPlacement = (canvas: Size, spec: ShapeSpec): Layer => {
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

const randomizeLayerBase = (canvas: Size, template?: Layer): Layer => {
  if (template) return { ...template, id: newLayerId() };

  const size = Math.round(Math.min(canvas.width, canvas.height) * 0.4);
  return {
    id: newLayerId(),
    type: "shape",
    shape: shapeIndex("circle", 0),
    size,
    x: Math.round(canvas.width / 2 - size / 2),
    y: Math.round(canvas.height / 2 - size / 2),
    rot: 0,
    fill: PALETTE[0],
    overlap: OVERLAP_OPTIONS[0],
  };
};

const snapPosition = (layer: Layer, x: number, y: number, others: Layer[], canvas: Size) => {
  const tolerance = Math.max(12, Math.min(canvas.width, canvas.height) * 0.018);
  const nearest = (value: number, candidates: { position: number; guide: number }[]) => {
    const candidate = candidates
      .map((target) => ({ ...target, distance: Math.abs(target.position - value) }))
      .filter(({ distance }) => distance <= tolerance)
      .sort((a, b) => a.distance - b.distance)[0];
    return candidate
      ? { position: Math.round(candidate.position), guide: candidate.guide }
      : { position: Math.round(value), guide: null };
  };
  const xCandidates = [
    { position: 0, guide: 0 },
    { position: canvas.width - layer.size, guide: canvas.width },
    { position: canvas.width / 2 - layer.size / 2, guide: canvas.width / 2 },
  ];
  const yCandidates = [
    { position: 0, guide: 0 },
    { position: canvas.height - layer.size, guide: canvas.height },
    { position: canvas.height / 2 - layer.size / 2, guide: canvas.height / 2 },
  ];
  for (const other of others) {
    xCandidates.push(
      { position: other.x, guide: other.x },
      { position: other.x + other.size - layer.size, guide: other.x + other.size },
      { position: other.x + other.size / 2 - layer.size / 2, guide: other.x + other.size / 2 },
      { position: other.x + other.size, guide: other.x + other.size },
      { position: other.x - layer.size, guide: other.x },
    );
    yCandidates.push(
      { position: other.y, guide: other.y },
      { position: other.y + other.size - layer.size, guide: other.y + other.size },
      { position: other.y + other.size / 2 - layer.size / 2, guide: other.y + other.size / 2 },
      { position: other.y + other.size, guide: other.y + other.size },
      { position: other.y - layer.size, guide: other.y },
    );
  }
  const xResult = nearest(x, xCandidates);
  const yResult = nearest(y, yCandidates);
  return {
    x: xResult.position,
    y: yResult.position,
    guides: {
      vertical: xResult.guide === null ? [] : [xResult.guide],
      horizontal: yResult.guide === null ? [] : [yResult.guide],
    },
  };
};

const randomizeLayers = (
  layers: Layer[],
  canvas: Size,
  options: RandomizeOptions,
  currentPrefs: Prefs,
): { layers: Layer[]; prefs: Prefs; satisfied: boolean } => {
  const gapFor = (a: Layer, b: Layer) => {
    const dx = Math.max(0, Math.abs(a.x + a.size / 2 - b.x - b.size / 2) - (a.size + b.size) / 2);
    const dy = Math.max(0, Math.abs(a.y + a.size / 2 - b.y - b.size / 2) - (a.size + b.size) / 2);
    return Math.hypot(dx, dy);
  };
  const overlapFor = (a: Layer, b: Layer) =>
    Math.min(
      (a.size + b.size) / 2 - Math.abs(a.x + a.size / 2 - b.x - b.size / 2),
      (a.size + b.size) / 2 - Math.abs(a.y + a.size / 2 - b.y - b.size / 2),
    );
  const overlapCountFor = (candidate: Layer, placed: Layer[]) =>
    placed.reduce((count, other) => count + Number(overlapFor(candidate, other) > 0), 0);
  const penalty = (candidate: Layer, placed: Layer[]) => {
    const pairPenalty = placed.reduce((total, other) => {
      const overlap = Math.max(0, overlapFor(candidate, other));
      const gapPenalty =
        options.minimumGap && overlap === 0
          ? Math.max(0, options.gap - gapFor(candidate, other))
          : 0;
      const overlapPenalty = options.allowOverlap
        ? overlap > 0
          ? Math.max(0, options.overlapMin - overlap) + Math.max(0, overlap - options.overlapMax)
          : 0
        : overlap;
      return total + gapPenalty + overlapPenalty;
    }, 0);
    const overlapCount = options.limitOverlapCount ? overlapCountFor(candidate, placed) : 0;
    const overlapCountPenalty = options.limitOverlapCount
      ? Math.max(0, options.minOverlapCount - overlapCount) +
        Math.max(0, overlapCount - options.maxOverlapCount)
      : 0;
    return pairPenalty + overlapCountPenalty * candidate.size;
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
      if (Math.random() < 0.3) {
        if (!isBlob(layer)) {
          layer = { ...layer, type: "blob", ...randomBlob() };
          delete layer.shape;
        }
      } else {
        layer = {
          ...layer,
          type: "shape",
          shape: previousShape ?? shapeIndex("circle", 0),
        };
        delete layer.path;
        delete layer.points;
        delete layer.smoothness;
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

    if (options.size) {
      const minDimension = Math.min(canvas.width, canvas.height);
      const size = Math.round(
        rnd((options.sizeMin / 100) * minDimension, (options.sizeMax / 100) * minDimension),
      );
      layer = {
        ...layer,
        size,
        x: layer.x + (layer.size - size) / 2,
        y: layer.y + (layer.size - size) / 2,
      };
    }
    if (options.rotation)
      layer = { ...layer, rot: normDeg(rnd(-options.rotationRange, options.rotationRange)) };
    if (options.opacity)
      layer = { ...layer, opacity: rnd(options.opacityMin, options.opacityMax) / 100 };
    if (options.fill) layer = { ...layer, fill: randomFill() };
    if (options.overlapColor) layer = { ...layer, overlap: randomOverlap(layer.fill) };

    if (options.positionX || options.positionY) {
      let best = layer;
      let bestPenalty = Number.POSITIVE_INFINITY;
      let bestSpread = Number.NEGATIVE_INFINITY;
      const attempts = options.spread ? 24 + options.spreadStrength * 3 : 240;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const candidate = {
          ...layer,
          x: options.positionX
            ? Math.round(
                randomAxis(canvas.width, layer.size, options.canvasSpill ? options.bleed / 100 : 0),
              )
            : layer.x,
          y: options.positionY
            ? Math.round(
                randomAxis(
                  canvas.height,
                  layer.size,
                  options.canvasSpill ? options.bleed / 100 : 0,
                ),
              )
            : layer.y,
        };
        const candidatePenalty = penalty(candidate, placed);
        const candidateSpread = placed.length
          ? Math.min(...placed.map((other) => gapFor(candidate, other)))
          : Number.POSITIVE_INFINITY;
        if (
          candidatePenalty < bestPenalty ||
          (options.spread && candidatePenalty === bestPenalty && candidateSpread > bestSpread)
        ) {
          best = candidate;
          bestPenalty = candidatePenalty;
          bestSpread = candidateSpread;
        }
        if (candidatePenalty === 0 && !options.spread) break;
      }
      layer = best;
    }
    placed.push(layer);
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
  let randomizedLayers = placed;
  if (options.layerOrder) {
    randomizedLayers = [...placed];
    for (let index = randomizedLayers.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [randomizedLayers[index], randomizedLayers[swapIndex]] = [
        randomizedLayers[swapIndex],
        randomizedLayers[index],
      ];
    }
  }
  const satisfied =
    (!options.positionX && !options.positionY) ||
    placed.every((layer, index) => penalty(layer, placed.slice(0, index)) === 0);
  return {
    layers: randomizedLayers,
    prefs,
    satisfied,
  };
};

const signatureOf = ({ layers, prefs }: Snapshot) => {
  const shapes = layers
    .map((layer) => (layer.shape ?? "") + (layer.path ? "b" + layer.path.length : ""))
    .join(",");
  return `${layers.length}|${shapes}|${prefs.pattern}|${prefs.format}|${prefs.orientation}`;
};

const snapshotOf = ({ layers, prefs }: Snapshot) => JSON.stringify({ layers, prefs });

export const wallpaperStore = createStore(initialState(), ({ setState, get }) => {
  const undoStack: string[] = [];
  const redoStack: string[] = [];
  let lastPattern: PatternId | null = null;
  let lastSnap = snapshotOf(get());
  let lastSignature = signatureOf(get());
  let lastChange = 0;
  let restoring = false;
  let alignmentSnapshot: Layer[] | null = null;

  const patch = (partial: Partial<WallpaperState>) => setState((prev) => ({ ...prev, ...partial }));

  const historyFlags = () =>
    patch({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });

  const track = () => {
    if (restoring) return;
    const current = snapshotOf(get());
    if (current === lastSnap) return;
    const now = performance.now();
    const signature = signatureOf(get());
    if (now - lastChange > BURST_MS || signature !== lastSignature) {
      undoStack.push(lastSnap);
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    }
    lastChange = now;
    lastSignature = signature;
    lastSnap = current;
    redoStack.length = 0;
    historyFlags();
  };

  const rememberPattern = () => {
    const { pattern } = get().prefs;
    if (pattern !== "none") lastPattern = pattern;
  };

  const commit = (partial: Partial<WallpaperState>) => {
    patch(partial);
    rememberPattern();
    track();
  };

  const active = () => {
    const { layers, activeId } = get();
    return layers.find((layer) => layer.id === activeId) ?? null;
  };

  const updateActive = (fn: (layer: Layer) => Layer, transient = false) => {
    const layer = active();
    if (!layer) return;
    const next = fn(layer);
    const layers = get().layers.map((existing) => (existing.id === layer.id ? next : existing));
    if (transient) patch({ layers });
    else commit({ layers });
  };

  const restore = (raw: string) => {
    const snap = JSON.parse(raw) as Snapshot;
    restoring = true;
    try {
      patch({ layers: snap.layers, ...withCanvas(snap.prefs), activeId: null });
    } finally {
      restoring = false;
    }
    lastSnap = snapshotOf(get());
    lastSignature = signatureOf(get());
    lastChange = 0;
    rememberPattern();
    historyFlags();
  };

  const replaceActiveShape = (spec: ShapeSpec) =>
    updateActive((layer) => {
      const next: Layer = { ...layer, ...spec };
      if (isBlob(spec)) {
        delete next.shape;
      } else {
        delete next.path;
        delete next.points;
        delete next.smoothness;
      }
      return next;
    });

  const addLayer = (spec: ShapeSpec) => {
    const layer = randomPlacement(get().canvas, spec);
    commit({ layers: [...get().layers, layer], activeId: layer.id });
  };

  const setPattern = (pattern: PatternId) => commit({ prefs: { ...get().prefs, pattern } });

  return {
    select: (id: string | null) => patch({ activeId: id }),

    stepActive: (direction: 1 | -1) => {
      const { layers, activeId } = get();
      if (!layers.length) return;
      const activeIndex = layers.findIndex((layer) => layer.id === activeId);
      const nextIndex =
        activeIndex < 0
          ? direction < 0
            ? layers.length - 1
            : 0
          : (activeIndex + direction + layers.length) % layers.length;
      patch({ activeId: layers[nextIndex].id });
    },

    addLayer,
    replaceActiveShape,

    beginAlignment: () => {
      if (alignmentSnapshot) return;
      alignmentSnapshot = get().layers;
    },

    confirmAlignment: () => {
      if (!alignmentSnapshot) return;
      alignmentSnapshot = null;
      commit({ layers: get().layers });
    },

    cancelAlignment: () => {
      if (!alignmentSnapshot) return;
      const layers = alignmentSnapshot;
      alignmentSnapshot = null;
      patch({ layers });
    },

    snapActiveTo: (proposedX: number, proposedY: number, transient = false) => {
      const { layers, activeId, canvas } = get();
      const activeLayer = layers.find((layer) => layer.id === activeId);
      if (!activeLayer) return;
      const { x, y, guides } = snapPosition(
        activeLayer,
        proposedX,
        proposedY,
        layers.filter((layer) => layer.id !== activeId),
        canvas,
      );
      updateActive((layer) => ({ ...layer, x, y }), transient);
      return guides;
    },

    randomizeLayers: (options: RandomizeOptions) => {
      const result = randomizeLayers(get().layers, get().canvas, options, get().prefs);
      commit({ layers: result.layers, prefs: result.prefs });
      return result.satisfied;
    },

    duplicateActive: () => {
      const { layers, activeId } = get();
      const activeIndex = layers.findIndex((layer) => layer.id === activeId);
      if (activeIndex < 0) return;
      const sourceLayer = layers[activeIndex];
      const copy: Layer = {
        ...sourceLayer,
        id: newLayerId(),
        x: sourceLayer.x + sourceLayer.size * 0.25,
        y: sourceLayer.y + sourceLayer.size * 0.125,
      };
      const nextLayers = [...layers];
      nextLayers.splice(activeIndex + 1, 0, copy);
      commit({ layers: nextLayers, activeId: copy.id });
    },

    shuffleActive: () => {
      const layer = active();
      if (!layer) return;
      replaceActiveShape(
        isBlob(layer)
          ? { type: "blob", ...createBlob(layer.points.length, layer.smoothness) }
          : { type: "shape", shape: randomShapeIndex(layer.shape) },
      );
    },

    patchActive: (fields: Partial<Omit<Layer, "id">>, transient = false) =>
      updateActive((layer) => ({ ...layer, ...fields }), transient),

    moveActiveBy: (deltaX: number, dleltaY: number, transient = false) =>
      updateActive((layer) => ({ ...layer, x: layer.x + deltaX, y: layer.y + dleltaY }), transient),

    resizeActive: (size: number) =>
      updateActive((layer) => resizeAroundCenter(layer, size, get().canvas)),

    setActiveFill: (fill: PaletteColor) => updateActive((layer) => ({ ...layer, fill })),

    cycleActiveFill: (direction: 1 | -1 = 1) =>
      updateActive((layer) => ({
        ...layer,
        fill: PALETTE[(PALETTE.indexOf(layer.fill) + direction + PALETTE.length) % PALETTE.length],
      })),

    setActiveOverlap: (overlap: OverlapColor) => updateActive((layer) => ({ ...layer, overlap })),

    cycleActiveOverlap: (direction: 1 | -1) =>
      updateActive((layer) => {
        const overlapIndex = OVERLAP_OPTIONS.indexOf(layer.overlap);
        return {
          ...layer,
          overlap:
            OVERLAP_OPTIONS[
              (overlapIndex + direction + OVERLAP_OPTIONS.length) % OVERLAP_OPTIONS.length
            ],
        };
      }),

    reorderActive: (direction: LayerDirection) => {
      const { layers, activeId } = get();
      const activeIndex = layers.findIndex((layer) => layer.id === activeId);
      if (activeIndex < 0) return;
      const targetIndex =
        direction === Infinity
          ? layers.length - 1
          : direction === -Infinity
            ? 0
            : Math.min(layers.length - 1, Math.max(0, activeIndex + direction));
      if (targetIndex === activeIndex) return;
      const nextLayers = [...layers];
      const [movedLayer] = nextLayers.splice(activeIndex, 1);
      nextLayers.splice(targetIndex, 0, movedLayer);
      commit({ layers: nextLayers });
    },

    deleteActive: () => {
      const { layers, activeId } = get();
      if (!activeId) return;
      commit({ layers: layers.filter((layer) => layer.id !== activeId), activeId: null });
    },

    clearAll: () =>
      commit({ layers: [], activeId: null, prefs: { ...get().prefs, pattern: "none" } }),

    setDark: (dark: boolean) => patch({ dark }),

    setHue: (hue: number) => commit({ prefs: { ...get().prefs, hue: normDeg(hue) } }),

    setPattern,

    togglePattern: () => {
      const { pattern } = get().prefs;
      setPattern(pattern === "none" ? (lastPattern ?? DEFAULT_PATTERN) : "none");
    },

    cyclePattern: (direction: 1 | -1) => {
      const patternIndex = PATTERNS.indexOf(get().prefs.pattern);
      setPattern(PATTERNS[(patternIndex + direction + PATTERNS.length) % PATTERNS.length]);
    },

    setPatternOpacity: (opacity: number) =>
      commit({ prefs: { ...get().prefs, opacity: clampOpacity(opacity) } }),

    setPatternScale: (scale: number) =>
      commit({ prefs: { ...get().prefs, patternScale: clampScale(scale) } }),

    setFormat: (fields: FormatPatch) => {
      const { prefs, canvas, layers } = get();
      const next: Prefs = { ...prefs, ...fields };
      if (fields.custom)
        next.custom = {
          width: clampPx(fields.custom.width),
          height: clampPx(fields.custom.height),
        };
      if (next.format === "custom" && prefs.format !== "custom" && !fields.custom)
        next.custom = { ...canvas };
      const nextCanvas = withCanvas(next);
      commit({ ...nextCanvas, layers: rescaleLayers(layers, canvas, nextCanvas.canvas) });
    },

    importLayout: (layout: LayoutFile) => {
      const prefs = { ...get().prefs };
      if (layout.pattern) prefs.pattern = layout.pattern;
      if (layout.strength !== undefined) prefs.opacity = layout.strength;
      commit({ layers: layout.layers, activeId: null, prefs });
    },

    undo: () => {
      if (!undoStack.length) return;
      redoStack.push(snapshotOf(get()));
      restore(undoStack.pop()!);
    },

    redo: () => {
      if (!redoStack.length) return;
      undoStack.push(snapshotOf(get()));
      restore(redoStack.pop()!);
    },
  };
});

export const wallpaper = wallpaperStore.actions;

export const useWallpaper = <T>(selector: (s: WallpaperState) => T) =>
  useSelector(wallpaperStore, selector, { compare: shallow });

export const selectActive = (state: WallpaperState) =>
  state.layers.find((layer) => layer.id === state.activeId) ?? null;
export const selectActiveIndex = (state: WallpaperState) =>
  state.layers.findIndex((layer) => layer.id === state.activeId);

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastPersisted: Snapshot & { dark: boolean } = wallpaperStore.state;
wallpaperStore.subscribe((state) => {
  const changed =
    state.layers !== lastPersisted.layers ||
    state.prefs !== lastPersisted.prefs ||
    state.dark !== lastPersisted.dark;
  if (!changed) return;
  lastPersisted = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(
    () => persist({ layers: state.layers, prefs: state.prefs, dark: state.dark }),
    250,
  );
});
