import type { SupportedLanguage } from "./schema";

export type UnitsPreference = "us" | "metric";

export const UNITS_LABELS: Record<UnitsPreference, string> = {
  us: "U.S. Units",
  metric: "Metric",
};

export const UNITS_LABELS_TRANSLATED: Record<SupportedLanguage, Record<UnitsPreference, string>> = {
  en: { us: "U.S. Units", metric: "Metric" },
  ru: { us: "Американские", metric: "Метрическая" },
  es: { us: "Sistema Imperial", metric: "Métrico" },
};

export function getUnitsLabel(units: UnitsPreference, lang: SupportedLanguage = "en"): string {
  return UNITS_LABELS_TRANSLATED[lang]?.[units] || UNITS_LABELS[units];
}

export function lbsToKg(lbs: number): number {
  return Number((lbs * 0.453592).toFixed(2));
}

export function kgToLbs(kg: number): number {
  return Number((kg / 0.453592).toFixed(2));
}

export function inchesToCm(inches: number): number {
  return Number((inches * 2.54).toFixed(2));
}

export function cmToInches(cm: number): number {
  return Number((cm / 2.54).toFixed(2));
}

export function inchesToFeetAndInches(totalInches: number): { feet: number; inches: number } {
  const feet = Math.floor(totalInches / 12);
  const inches = Number((totalInches % 12).toFixed(2));
  return { feet, inches };
}

export function feetAndInchesToInches(feet: number, inches: number): number {
  return feet * 12 + inches;
}

export function formatWeight(weight: number | null | undefined, units: UnitsPreference): string {
  if (weight == null || !isFinite(weight)) return "";
  
  if (units === "metric") {
    // Round to 1 decimal place to avoid floating-point precision artifacts (e.g., 59.99 → 60.0)
    const kg = lbsToKg(weight);
    const rounded = Math.round(kg * 10) / 10;
    // Remove trailing .0 for cleaner display (60.0 → 60)
    const display = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    return `${display} kg`;
  }
  // Round lbs to 1 decimal for consistency
  const rounded = Math.round(weight * 10) / 10;
  const display = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${display} lbs`;
}

export function formatHeight(height: number | null | undefined, units: UnitsPreference): string {
  if (height == null || !isFinite(height)) return "";
  
  if (units === "metric") {
    return `${inchesToCm(height)} cm`;
  }
  
  const { feet, inches } = inchesToFeetAndInches(height);
  return `${feet}'${inches}"`;
}
