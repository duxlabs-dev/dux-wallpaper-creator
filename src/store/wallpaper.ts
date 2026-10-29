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
import { createBlob, isBlob, randomBlob, randomShapeIndex, shapeIndex, SHAPES } from "@/lib/shapes";
import { loadSaved, persist } from "@/lib/storage";
import type { SchemeVariant, SpecVersion } from "@/lib/theme";
import { normDeg, pickRandom, rnd } from "@/lib/utils";

export type LayerDirection = number;

export interface FormatPatch {
  format?: FormatId;
  orientation?: Orientation;
  custom?: Size;
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
const randomAxis = (extent: number, size: number) =>
  extent > size ? rnd(-BLEED * size, extent - size + BLEED * size) : (extent - size) / 2;

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

const surpriseLayers = (canvas: Size): Layer[] => {
  const count = 2 + Math.floor(Math.random() * 4);
  return Array.from({ length: count }, (_, index) => {
    const size = randomSize(canvas);
    const fill = randomFill();
    const spec: ShapeSpec =
      Math.random() < 0.25
        ? { type: "blob", ...randomBlob() }
        : { type: "shape", shape: Math.floor(Math.random() * SHAPES.length) };
    return {
      id: newLayerId(),
      ...spec,
      size,
      x: Math.round(randomAxis(canvas.width, size)),
      y: Math.round(randomAxis(canvas.height, size)),
      rot: Math.round(rnd(0, 360)),
      fill,
      overlap: index > 0 && Math.random() < 0.75 ? randomOverlap(fill) : "none",
    };
  });
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

    setScheme: (scheme: SchemeVariant) => commit({ prefs: { ...get().prefs, scheme } }),

    setSpec: (spec: SpecVersion) => commit({ prefs: { ...get().prefs, spec } }),

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

    surprise: () => {
      const { prefs, canvas } = get();
      commit({
        prefs: {
          ...prefs,
          hue: Math.floor(Math.random() * 360),
          pattern: pickRandom(PATTERNS),
          opacity: +rnd(0.06, 0.25).toFixed(2),
        },
        layers: surpriseLayers(canvas),
        activeId: null,
      });
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
