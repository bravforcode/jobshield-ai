import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatThb(n: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)} THB`;
}

export function formatPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
