import { useLayoutEffect, useRef, type RefObject } from "react";

type Box = { x: number; y: number; width: number; height: number; radius: string };

type Flight = { animation: Animation; from: Box; to: Box };

interface FlipOptions {
  selector?: string;
  unfold?: boolean;
}

const cssVariable = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const toMs = (value: string) =>
  value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000 || 0;

// Evaluates an evenly spaced `linear(…)` easing, as used by the motion tokens.
const curveOf = (easing: string) => {
  const points = /^linear\((.*)\)$/.exec(easing)?.[1].split(",").map(Number);
  if (!points?.length || points.some(Number.isNaN)) return (progress: number) => progress;
  return (progress: number) => {
    const position = Math.min(Math.max(progress, 0), 1) * (points.length - 1);
    const index = Math.floor(position);
    const next = points[Math.min(index + 1, points.length - 1)];
    return points[index] + (next - points[index]) * (position - index);
  };
};

const motion = () => {
  const easing = cssVariable("--ease-default-spatial");
  const supported = easing !== "" && CSS.supports("transition-timing-function", easing);
  return {
    duration: toMs(cssVariable("--duration-default-spatial")),
    easing: supported ? easing : "linear",
    curve: curveOf(supported ? easing : ""),
  };
};

const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;

const lerpBox = (from: Box, to: Box, progress: number): Box => ({
  x: lerp(from.x, to.x, progress),
  y: lerp(from.y, to.y, progress),
  width: lerp(from.width, to.width, progress),
  height: lerp(from.height, to.height, progress),
  radius: `${lerp(parseFloat(from.radius) || 0, parseFloat(to.radius) || 0, progress)}px`,
});

// Transitions are paused while measuring, so the radius is the end value rather than the one a
// just-started transition still reports.
const measure = (elements: HTMLElement[], origin: DOMRect) => {
  const transitions = elements.map((element) => element.style.transition);
  for (const element of elements) element.style.transition = "none";
  const boxes = elements.map((element): Box => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - origin.left,
      y: rect.top - origin.top,
      width: rect.width,
      height: rect.height,
      radius: getComputedStyle(element).borderRadius,
    };
  });
  elements.forEach((element, index) => (element.style.transition = transitions[index]));
  return boxes;
};

const keyframesFor = (from: Box, to: Box, fadeIn: boolean): Keyframe[] | undefined => {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const resized = from.width !== to.width || from.height !== to.height || from.radius !== to.radius;
  if (!dx && !dy && !resized) return undefined;
  const size = (box: Box) =>
    resized
      ? {
          width: `${box.width}px`,
          height: `${box.height}px`,
          borderRadius: box.radius,
          flex: "none",
        }
      : {};
  return [
    { translate: `${dx}px ${dy}px`, ...(fadeIn && { opacity: 0 }), ...size(from) },
    { translate: "0 0", ...size(to) },
  ];
};

export function useFlip(
  container: RefObject<HTMLElement | null>,
  key: unknown,
  { selector = "button", unfold = false }: FlipOptions = {},
) {
  const previous = useRef(new Map<HTMLElement, Box>());
  const flights = useRef(new Map<HTMLElement, Flight>());

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const { duration, easing, curve } = motion();

    // An interrupted animation continues from where it is now. Running animations also distort
    // the measured layout, so they end before measuring.
    const current = new Map<HTMLElement, Box>();
    for (const [element, { animation, from, to }] of flights.current) {
      if (animation.playState === "running" && duration > 0) {
        const progress = Number(animation.currentTime ?? 0) / duration;
        current.set(element, lerpBox(from, to, curve(progress)));
      }
      animation.cancel();
    }
    flights.current.clear();

    const elements = [...root.querySelectorAll<HTMLElement>(selector)].filter(
      (element) => element.getClientRects().length > 0,
    );
    const boxes = measure(elements, root.getBoundingClientRect());
    const before = previous.current;
    previous.current = new Map(elements.map((element, index) => [element, boxes[index]]));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    elements.forEach((element, index) => {
      const last = before.get(element);
      if (!last) return;
      const to = boxes[index];
      const visible = current.get(element);
      const fromFirst = !visible && unfold && index > 0;
      const from =
        visible ??
        (fromFirst ? { ...boxes[0], width: to.width, height: to.height, radius: to.radius } : last);
      const keyframes = keyframesFor(from, to, fromFirst);
      if (!keyframes) return;
      flights.current.set(element, {
        animation: element.animate(keyframes, { duration, easing }),
        from,
        to,
      });
    });
  }, [container, key, selector, unfold]);
}
