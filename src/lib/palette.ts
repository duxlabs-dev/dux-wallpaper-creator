export const PALETTE = [
  "primary",
  "secondary",
  "tertiary",
  "primary-container",
  "secondary-container",
  "tertiary-container",
  "inverse-primary",
  "black",
] as const;

export type PaletteColor = (typeof PALETTE)[number];
export type OverlapColor = "none" | PaletteColor;

export const OVERLAP_OPTIONS: readonly OverlapColor[] = ["none", ...PALETTE];

export const isPaletteColor = (value: unknown): value is PaletteColor =>
  PALETTE.includes(value as PaletteColor);

export const isOverlapColor = (value: unknown): value is OverlapColor =>
  OVERLAP_OPTIONS.includes(value as OverlapColor);

export const cssColor = (name: PaletteColor) => `var(--md-sys-color-${name})`;

// Content color for icons on a palette color. inverse-primary has no on-role
// of its own; inverse-surface is the opposite tone in both themes.
const ON_COLORS: Record<PaletteColor, string> = {
  primary: "var(--md-sys-color-on-primary)",
  secondary: "var(--md-sys-color-on-secondary)",
  tertiary: "var(--md-sys-color-on-tertiary)",
  "primary-container": "var(--md-sys-color-on-primary-container)",
  "secondary-container": "var(--md-sys-color-on-secondary-container)",
  "tertiary-container": "var(--md-sys-color-on-tertiary-container)",
  "inverse-primary": "var(--md-sys-color-inverse-surface)",
  black: "rgb(255 255 255)",
};

export const cssOnColor = (name: PaletteColor) => ON_COLORS[name];

export const randomFill = (): PaletteColor => PALETTE[Math.floor(Math.random() * PALETTE.length)];

export const randomOverlap = (fill: PaletteColor): OverlapColor => {
  const opts = PALETTE.filter((color) => color !== fill && color !== "black");
  return opts[Math.floor(Math.random() * opts.length)];
};
