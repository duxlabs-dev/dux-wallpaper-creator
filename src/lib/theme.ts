import {
  argbFromHex,
  argbFromRgb,
  blueFromArgb,
  greenFromArgb,
  Hct,
  MaterialDynamicColors,
  redFromArgb,
  SchemeTonalSpot,
  type DynamicColor,
} from "@material/material-color-utilities";
import { rgbCss, type Rgb } from "./color";

export const TOKENS = [
  "primary",
  "on-primary",
  "primary-container",
  "on-primary-container",
  "secondary",
  "on-secondary",
  "secondary-container",
  "on-secondary-container",
  "tertiary",
  "on-tertiary",
  "tertiary-container",
  "on-tertiary-container",
  "surface",
  "surface-container-low",
  "surface-container",
  "surface-container-high",
  "surface-container-highest",
  "on-surface",
  "on-surface-variant",
  "outline",
  "outline-variant",
  "inverse-surface",
  "inverse-on-surface",
  "inverse-primary",
  "error",
  "error-container",
  "on-error-container",
] as const;

export type Token = (typeof TOKENS)[number];
export type TokenMap = Record<Token, Rgb>;

const COLORS: Record<Token, DynamicColor> = {
  primary: MaterialDynamicColors.primary,
  "on-primary": MaterialDynamicColors.onPrimary,
  "primary-container": MaterialDynamicColors.primaryContainer,
  "on-primary-container": MaterialDynamicColors.onPrimaryContainer,
  secondary: MaterialDynamicColors.secondary,
  "on-secondary": MaterialDynamicColors.onSecondary,
  "secondary-container": MaterialDynamicColors.secondaryContainer,
  "on-secondary-container": MaterialDynamicColors.onSecondaryContainer,
  tertiary: MaterialDynamicColors.tertiary,
  "on-tertiary": MaterialDynamicColors.onTertiary,
  "tertiary-container": MaterialDynamicColors.tertiaryContainer,
  "on-tertiary-container": MaterialDynamicColors.onTertiaryContainer,
  surface: MaterialDynamicColors.surface,
  "surface-container-low": MaterialDynamicColors.surfaceContainerLow,
  "surface-container": MaterialDynamicColors.surfaceContainer,
  "surface-container-high": MaterialDynamicColors.surfaceContainerHigh,
  "surface-container-highest": MaterialDynamicColors.surfaceContainerHighest,
  "on-surface": MaterialDynamicColors.onSurface,
  "on-surface-variant": MaterialDynamicColors.onSurfaceVariant,
  outline: MaterialDynamicColors.outline,
  "outline-variant": MaterialDynamicColors.outlineVariant,
  "inverse-surface": MaterialDynamicColors.inverseSurface,
  "inverse-on-surface": MaterialDynamicColors.inverseOnSurface,
  "inverse-primary": MaterialDynamicColors.inversePrimary,
  error: MaterialDynamicColors.error,
  "error-container": MaterialDynamicColors.errorContainer,
  "on-error-container": MaterialDynamicColors.onErrorContainer,
};

// default hue
export const BASE_HUE = Hct.fromInt(argbFromHex("#4c662b")).hue;

const argbToRgb = (argb: number): Rgb => [
  redFromArgb(argb),
  greenFromArgb(argb),
  blueFromArgb(argb),
];

const scheme = (dark: boolean, hue: number) =>
  new SchemeTonalSpot(Hct.from(BASE_HUE + hue, 36, 50), dark, 0, "2021");

export const toHct = ([r, g, b]: Rgb) => Hct.fromInt(argbFromRgb(r, g, b));

export const shiftedTokens = (dark: boolean, hue: number): TokenMap => {
  const colorScheme = scheme(dark, hue);
  const tokenMap = {} as TokenMap;
  for (const name of TOKENS) tokenMap[name] = argbToRgb(COLORS[name].getArgb(colorScheme));
  return tokenMap;
};

export const tokenCssVar = (name: Token | "black") => `--md-sys-color-${name}`;

export const hueGradient = (dark: boolean) => {
  const stops: string[] = [];
  for (let i = 0; i <= 36; i++) {
    const hueValue = i * 10;
    const argb = COLORS.primary.getArgb(scheme(dark, hueValue - BASE_HUE));
    stops.push(`${rgbCss(argbToRgb(argb))} ${(hueValue / 3.6).toFixed(2)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
};
