export type UnitsPreference = "us" | "metric";

export const UNITS_LABELS: Record<UnitsPreference, string> = {
  us: "U.S. Units",
  metric: "Metric",
};

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
    return `${lbsToKg(weight)} kg`;
  }
  return `${weight} lbs`;
}

export function formatHeight(height: number | null | undefined, units: UnitsPreference): string {
  if (height == null || !isFinite(height)) return "";
  
  if (units === "metric") {
    return `${inchesToCm(height)} cm`;
  }
  
  const { feet, inches } = inchesToFeetAndInches(height);
  return `${feet}'${inches}"`;
}
