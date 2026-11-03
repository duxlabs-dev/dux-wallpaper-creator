export type Rgb = [number, number, number];

export const hexToRgb = (text: string): Rgb | null => {
  const m = text
    .trim()
    .replace(/^#/, "")
    .match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16)) as Rgb;
};

export const rgbToHex = ([r, g, b]: Rgb) =>
  "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");

export const rgbCss = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;
