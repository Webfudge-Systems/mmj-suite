/** Two initials for a customer's avatar, ignoring a "Demo –" prefix. */
export function initials(name: string) {
  const parts = name.replace(/^Demo\s*[–-]\s*/, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}
