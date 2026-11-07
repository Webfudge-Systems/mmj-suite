import { twMerge } from "tailwind-merge";

/** Joins class names, skipping empty ones. Later classes win over conflicting earlier ones. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
