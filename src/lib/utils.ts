import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const decimals = (number: number) => {
  const stringValue = String(number);
  if (stringValue.includes("e-")) return parseInt(stringValue.split("e-")[1], 10);
  return stringValue.split(".")[1]?.length ?? 0;
};

export const normDeg = (degree: number) => ((degree % 360) + 360) % 360;

export const round = (value: number, digits = 3) => +value.toFixed(digits);

export const rnd = (min: number, max: number) => min + Math.random() * (max - min);

export const pickRandom = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];

export const shuffle = <T>(list: readonly T[]): T[] => {
  const shuffled = [...list];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export const camel = (str: string) =>
  str.replace(/-(\w)/g, (_, char: string) => char.toUpperCase());

export const lowerFirst = (str: string) => str[0].toLowerCase() + str.slice(1);
