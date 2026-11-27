/** How an estimate's state reads on the list and its own page. */
export const ESTIMATE_STATUS = {
  open: { label: "Waiting", tone: "gold" },
  billed: { label: "Billed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

/** "4 min", "1 h 20 min", "2 days". */
export function waited(from: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(from)) / 60000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  const days = Math.floor(minutes / (60 * 24));
  return `${days} ${days === 1 ? "day" : "days"}`;
}
