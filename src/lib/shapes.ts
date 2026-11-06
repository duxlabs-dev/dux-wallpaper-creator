import { MaterialShapes, roundedPolygonToPath } from "material-shapes-ts";
import { BlobLayer, ShapeSpec } from "./layer";

export interface LibraryShape {
  name: string;
  path: string;
  outline: readonly Point[];
}

const OUTLINE_SAMPLES_PER_CURVE = 16;

export const BLOB_MIN_EDGES = 3;
export const BLOB_MAX_EDGES = 15;
export const SHAPES: readonly LibraryShape[] = MaterialShapes.all().map((shape) => ({
  name: shape.name,
  path: roundedPolygonToPath(shape.polygon).toSvgPathData(),
  outline: shape.polygon.cubics.flatMap((cubic) =>
    Array.from({ length: OUTLINE_SAMPLES_PER_CURVE }, (_, index) =>
      cubic.pointOnCurve(index / OUTLINE_SAMPLES_PER_CURVE),
    ),
  ),
}));

export const shapeIndex = (name: string, fallback: number) => {
  const index = SHAPES.findIndex((shape) => shape.name.toLowerCase() === name.toLowerCase());
  return index >= 0 ? index : fallback;
};

export const isShapeIndex = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < SHAPES.length;

export const prettyName = (name: string) =>
  name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/(.+) (\d+)(.+)/, "$2-$3 $1");

export const randomShapeIndex = (avoid?: number) => {
  if (SHAPES.length < 2) return 0;
  let shapeIndexValue: number;
  do shapeIndexValue = Math.floor(Math.random() * SHAPES.length);
  while (shapeIndexValue === avoid);
  return shapeIndexValue;
};

const f = (value: number) => +value.toFixed(4);

export const SMOOTHNESS = [
  { roundness: 0 },
  { roundness: 0.3 },
  { roundness: 0.55 },
  { roundness: 0.8 },
  { roundness: 0.9 },
] as const;

export type SmoothnessIndex = 0 | 1 | 2 | 3 | 4;

const TENSION = 1 / 6;
const MAX_HANDLE_RATIO = 0.5;

const clampVec = (vectorX: number, vectorY: number, maxLen: number): [number, number] => {
  const len = Math.hypot(vectorX, vectorY);
  if (len === 0 || len <= maxLen) return [vectorX, vectorY];
  const s = maxLen / len;
  return [vectorX * s, vectorY * s];
};

type Point = { x: number; y: number };

// pulls points towards a circle
const roundPoints = (points: Point[], roundness: number): Point[] => {
  if (roundness === 0) return points;

  const CENTER = 0.5;
  const pointCount = points.length;

  const polarPoints = points.map((point) => ({
    angle: Math.atan2(point.y - CENTER, point.x - CENTER),
    radius: Math.hypot(point.x - CENTER, point.y - CENTER),
  }));

  const averageRadius = polarPoints.reduce((sum, p) => sum + p.radius, 0) / pointCount;

  return polarPoints.map(({ angle, radius }, index) => {
    const idealAngle = (index / pointCount) * Math.PI * 2;

    const angleOffset = Math.atan2(Math.sin(angle - idealAngle), Math.cos(angle - idealAngle));

    const newAngle = idealAngle + angleOffset * (1 - roundness);
    const newRadius = radius + (averageRadius - radius) * roundness;

    return {
      x: CENTER + Math.cos(newAngle) * newRadius,
      y: CENTER + Math.sin(newAngle) * newRadius,
    };
  });
};

export const createBlobPath = (
  rawPoints: Exclude<ShapeSpec["points"], undefined>,
  smoothness: SmoothnessIndex,
) => {
  const points = roundPoints(rawPoints, SMOOTHNESS[smoothness].roundness);
  const pointCount = points.length;
  let pathData = `M${f(points[0].x)} ${f(points[0].y)}`;

  for (let i = 0; i < pointCount; i++) {
    const point0 = points[(i - 1 + pointCount) % pointCount];
    const point1 = points[i];
    const point2 = points[(i + 1) % pointCount];
    const point3 = points[(i + 2) % pointCount];

    const maxHandleLength = Math.hypot(point2.x - point1.x, point2.y - point1.y) * MAX_HANDLE_RATIO;

    const [handle1X, handle1Y] = clampVec(
      (point2.x - point0.x) * TENSION,
      (point2.y - point0.y) * TENSION,
      maxHandleLength,
    );
    const [handle2X, handle2Y] = clampVec(
      (point3.x - point1.x) * TENSION,
      (point3.y - point1.y) * TENSION,
      maxHandleLength,
    );

    pathData += `C${f(point1.x + handle1X)} ${f(point1.y + handle1Y)} ${f(point2.x - handle2X)} ${f(
      point2.y - handle2Y,
    )} ${f(point2.x)} ${f(point2.y)}`;
  }

  return pathData + "Z";
};

export const createBlob = (pointCount: number, smoothness: SmoothnessIndex) => {
  const jitter = ((Math.PI * 2) / pointCount) * 0.7;
  const points: ShapeSpec["points"] = Array.from({ length: pointCount }, (_, index) => {
    const angle = (index / pointCount) * Math.PI * 2 + (Math.random() - 0.5) * jitter;
    const radius = 0.15 + Math.random() * 0.35;
    return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
  });
  const pathData = createBlobPath(points, smoothness);
  return { points, smoothness, path: pathData };
};
export const randomBlob = () => {
  const pointCount =
    BLOB_MIN_EDGES + Math.floor(Math.random() * (BLOB_MAX_EDGES - BLOB_MIN_EDGES + 1));
  const smoothness = Math.floor(Math.random() * 5) as SmoothnessIndex;

  return createBlob(pointCount, smoothness);
};

export const isBlob = <T extends { type: ShapeSpec["type"] }>(shape: T): shape is T & BlobLayer =>
  shape.type === "blob";

const SAFE_PATH = /^[MCLZ0-9eE.,\s+-]+$/;

export const isSafeBlobPath = (path: unknown): path is string =>
  typeof path === "string" && path.length < 4000 && SAFE_PATH.test(path);
