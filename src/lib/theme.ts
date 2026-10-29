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
  "primary-container",
  "secondary",
  "secondary-container",
  "tertiary",
  "tertiary-container",
  "surface",
  "on-surface",
  "inverse-primary",
] as const;

export type Token = (typeof TOKENS)[number];
export type TokenMap = Record<Token, Rgb>;

const COLORS: Record<Token, DynamicColor> = {
  primary: MaterialDynamicColors.primary,
  "primary-container": MaterialDynamicColors.primaryContainer,
  secondary: MaterialDynamicColors.secondary,
  "secondary-container": MaterialDynamicColors.secondaryContainer,
  tertiary: MaterialDynamicColors.tertiary,
  "tertiary-container": MaterialDynamicColors.tertiaryContainer,
  surface: MaterialDynamicColors.surface,
  "on-surface": MaterialDynamicColors.onSurface,
  "inverse-primary": MaterialDynamicColors.inversePrimary,
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
