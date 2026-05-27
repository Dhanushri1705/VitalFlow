/**
 * Parse AI recommendation text for a duration (e.g. "for 21 days", "30-day plan").
 * Returns null if no duration found.
 */
export function parseDurationDays(text: string): number | null {
  if (!text) return null;
  const patterns = [
    /(\d+)\s*[- ]?\s*days?/i,
    /for\s+(\d+)\s+days?/i,
    /next\s+(\d+)\s+days?/i,
    /over\s+(\d+)\s+days?/i,
    /(\d+)\s+day\s+plan/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > 0 && n <= 365) return n;
    }
  }
  return null;
}

/**
 * Extract a short title from an AI recommendation (first sentence/line, max 80 chars).
 */
export function shortTitle(text: string, max = 80): string {
  const firstLine = text.split(/[.\n]/)[0]?.trim() ?? text;
  return firstLine.length > max ? firstLine.slice(0, max - 1) + "…" : firstLine;
}
