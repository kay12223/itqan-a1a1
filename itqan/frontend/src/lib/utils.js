import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a 24-hour "HH:MM" string to Egyptian 12-hour format "H:MM ص/م".
 * Safe to call with null/undefined — returns "—" in that case.
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return "—";
  try {
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h < 12 ? "ص" : "م";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return timeStr;
  }
}
