const TIME_ZONE = "Asia/Kolkata";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹5,08,698.98, with Indian digit grouping. */
export function formatINR(amount: number): string {
  return rupees.format(amount);
}

/** ₹5,08,699, for prices shown to customers. */
export function formatRupees(amount: number): string {
  return wholeRupees.format(amount);
}

/** 40.250 g. Jewellery weights are always shown to the milligram. */
export function formatWeight(grams: number): string {
  return `${grams.toFixed(3)} g`;
}

/** +₹85.00 or −₹18.00. */
export function formatChange(amount: number): string {
  if (amount === 0) return formatINR(0);
  const sign = amount > 0 ? "+" : "−";
  return `${sign}${formatINR(Math.abs(amount))}`;
}

/** +1.25% or −0.40%. */
export function formatPercent(value: number, digits = 2): string {
  if (value === 0) return `${(0).toFixed(digits)}%`;
  const sign = value > 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** 2 Nov 2026, 9:05 am, in India time whatever the device's zone. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** 2 Nov 2026, in India time. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
