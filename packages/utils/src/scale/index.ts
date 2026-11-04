/**
 * Reads the weight from one line sent by a weighing scale, such as
 * "  12.345 g" or "ST,GS,+0012.345g". Returns grams to the milligram, or null.
 */
export function parseScaleLine(line: string): number | null {
  const match = line.match(/([+-]?\d+(?:\.\d+)?)\s*(?:g|gm|grams)?\b/i);
  if (!match) return null;
  const grams = Number(match[1]);
  return Number.isFinite(grams) && grams >= 0 ? Math.round(grams * 1000) / 1000 : null;
}
