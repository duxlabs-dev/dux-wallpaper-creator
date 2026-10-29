import {
  argbFromHex,
  argbFromRgb,
  blueFromArgb,
  DynamicScheme,
  greenFromArgb,
  Hct,
  MaterialDynamicColors,
  redFromArgb,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
  TonalPalette,
  Variant,
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

// Same scheme types as dux-shell (matugen's scheme-* names).
const SCHEMES = {
  "tonal-spot": SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  neutral: SchemeNeutral,
  content: SchemeContent,
  fidelity: SchemeFidelity,
  monochrome: SchemeMonochrome,
  rainbow: SchemeRainbow,
  "fruit-salad": SchemeFruitSalad,
};

export type SchemeVariant = keyof typeof SCHEMES;
export const SCHEME_VARIANTS = Object.keys(SCHEMES) as SchemeVariant[];
export const isSchemeVariant = (value: unknown): value is SchemeVariant =>
  typeof value === "string" && Object.hasOwn(SCHEMES, value);

export const SPEC_VERSIONS = ["2021", "2025", "dms"] as const;
export type SpecVersion = (typeof SPEC_VERSIONS)[number];
export const isSpecVersion = (value: unknown): value is SpecVersion =>
  SPEC_VERSIONS.includes(value as SpecVersion);

// The library only has 2025 rules for these; the others stay 2021, also
// under DMS.
export const specChangesScheme = (variant: SchemeVariant) =>
  variant === "tonal-spot" ||
  variant === "vibrant" ||
  variant === "expressive" ||
  variant === "neutral";

export interface SchemeOptions {
  variant: SchemeVariant;
  spec: SpecVersion;
}

// DMS, as in dux-shell (core/internal/matugen/spec.go): the 2025 palettes with
// Tonal Spot's neutral surfaces, and raised accent chroma for these variants,
// running the tone rules of `rules`.
const DMS_PALETTES: Partial<
  Record<SchemeVariant, { rules: Variant; primary: number; secondary: number; tertiary: number }>
> = {
  "tonal-spot": { rules: Variant.VIBRANT, primary: 40, secondary: 28, tertiary: 36 },
  expressive: { rules: Variant.TONAL_SPOT, primary: 48, secondary: 40, tertiary: 48 },
  neutral: { rules: Variant.NEUTRAL, primary: 20, secondary: 12, tertiary: 28 },
};

const dmsScheme = (seed: Hct, dark: boolean, variant: SchemeVariant) => {
  if (!specChangesScheme(variant)) return new SCHEMES[variant](seed, dark, 0, "2021");
  const neutral = new SchemeTonalSpot(seed, dark, 0, "2025");
  const own = new SCHEMES[variant](seed, dark, 0, "2025");
  const recipe = DMS_PALETTES[variant];
  const base = {
    sourceColorHct: seed,
    contrastLevel: 0,
    isDark: dark,
    specVersion: "2025" as const,
    neutralPalette: neutral.neutralPalette,
    neutralVariantPalette: neutral.neutralVariantPalette,
  };
  if (!recipe) return new DynamicScheme({ ...base, variant: own.variant });
  // 2025 Expressive dropped the rotated secondary and tertiary hues; they are its identity.
  const hues = variant === "expressive" ? new SchemeExpressive(seed, dark, 0, "2021") : own;
  return new DynamicScheme({
    ...base,
    variant: recipe.rules,
    primaryPalette: TonalPalette.fromHueAndChroma(own.primaryPalette.hue, recipe.primary),
    secondaryPalette: TonalPalette.fromHueAndChroma(hues.secondaryPalette.hue, recipe.secondary),
    tertiaryPalette: TonalPalette.fromHueAndChroma(hues.tertiaryPalette.hue, recipe.tertiary),
  });
};

const scheme = (dark: boolean, hue: number, { variant, spec }: SchemeOptions) => {
  const seed = Hct.from(BASE_HUE + hue, 36, 50);
  return spec === "dms"
    ? dmsScheme(seed, dark, variant)
    : new SCHEMES[variant](seed, dark, 0, spec);
};

export const toHct = ([r, g, b]: Rgb) => Hct.fromInt(argbFromRgb(r, g, b));

export const shiftedTokens = (dark: boolean, hue: number, options: SchemeOptions): TokenMap => {
  const colorScheme = scheme(dark, hue, options);
  const tokenMap = {} as TokenMap;
  for (const name of TOKENS) tokenMap[name] = argbToRgb(COLORS[name].getArgb(colorScheme));
  return tokenMap;
};

export const tokenCssVar = (name: Token | "black") => `--md-sys-color-${name}`;

export const hueGradient = (dark: boolean, options: SchemeOptions) => {
  const stops: string[] = [];
  for (let i = 0; i <= 36; i++) {
    const hueValue = i * 10;
    const argb = COLORS.primary.getArgb(scheme(dark, hueValue - BASE_HUE, options));
    stops.push(`${rgbCss(argbToRgb(argb))} ${(hueValue / 3.6).toFixed(2)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
};
