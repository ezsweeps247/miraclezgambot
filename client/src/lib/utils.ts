import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format credits to SC amount
 * @param credits - The amount in SC (already converted from backend)
 * @param showCurrency - Whether to show the SC symbol (default: true)
 * @returns Formatted SC string like "10.00 SC"
 */
export function formatCredits(credits: number, showCurrency: boolean = true): string {
  // Backend already returns values in SC, 1:1 USD conversion
  const sc = Number(credits) || 0;
  // Ensure sc is a valid number
  if (isNaN(sc)) {
    return showCurrency ? "0.00 SC" : "0.00";
  }
  return showCurrency ? `${sc.toFixed(2)} SC` : sc.toFixed(2);
}

/**
 * Format large SC amounts with K/M suffixes
 * @param credits - The amount in SC (already converted from backend)
 * @returns Formatted string like "1.5K SC" or "2.3M SC"
 */
export function formatCreditsCompact(credits: number): string {
  // Backend already returns values in SC, 1:1 USD conversion
  const sc = Number(credits) || 0;
  // Ensure sc is a valid number
  if (isNaN(sc)) {
    return "0.00 SC";
  }
  if (sc >= 1000000) {
    return `${(sc / 1000000).toFixed(2)}M SC`;
  } else if (sc >= 1000) {
    return `${(sc / 1000).toFixed(2)}K SC`;
  }
  return `${sc.toFixed(2)} SC`;
}
