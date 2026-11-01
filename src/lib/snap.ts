import type { Size } from "@/lib/formats";
import type { Layer } from "@/lib/layer";

const SNAP_TOLERANCE_MIN = 12;
const SNAP_TOLERANCE_FACTOR = 0.018;

type GuideCandidate = { position: number; guide: number };
type Axis = "x" | "y";

const axisCandidates = (axis: Axis, size: number, extent: number, others: Layer[]) => {
  const start = (layer: Layer) => layer[axis];
  const candidates: GuideCandidate[] = [
    { position: 0, guide: 0 },
    { position: extent - size, guide: extent },
    { position: extent / 2 - size / 2, guide: extent / 2 },
  ];
  for (const other of others) {
    const otherStart = start(other);
    candidates.push(
      { position: otherStart, guide: otherStart },
      { position: otherStart + other.size - size, guide: otherStart + other.size },
      { position: otherStart + other.size / 2 - size / 2, guide: otherStart + other.size / 2 },
      { position: otherStart + other.size, guide: otherStart + other.size },
      { position: otherStart - size, guide: otherStart },
    );
  }
  return candidates;
};

const nearest = (value: number, candidates: GuideCandidate[], tolerance: number) => {
  const candidate = candidates
    .map((target) => ({ ...target, distance: Math.abs(target.position - value) }))
    .filter(({ distance }) => distance <= tolerance)
    .sort((a, b) => a.distance - b.distance)[0];
  return candidate
    ? { position: Math.round(candidate.position), guide: candidate.guide }
    : { position: Math.round(value), guide: null };
};

export const snapPosition = (layer: Layer, x: number, y: number, others: Layer[], canvas: Size) => {
  const tolerance = Math.max(
    SNAP_TOLERANCE_MIN,
    Math.min(canvas.width, canvas.height) * SNAP_TOLERANCE_FACTOR,
  );
  const xResult = nearest(x, axisCandidates("x", layer.size, canvas.width, others), tolerance);
  const yResult = nearest(y, axisCandidates("y", layer.size, canvas.height, others), tolerance);
  return {
    x: xResult.position,
    y: yResult.position,
    guides: {
      vertical: xResult.guide === null ? [] : [xResult.guide],
      horizontal: yResult.guide === null ? [] : [yResult.guide],
    },
  };
};
