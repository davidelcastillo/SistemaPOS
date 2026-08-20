import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional class names and resolves Tailwind conflicts.
 * Standard cn() helper used across the app (buttons, comboboxes, forms).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}