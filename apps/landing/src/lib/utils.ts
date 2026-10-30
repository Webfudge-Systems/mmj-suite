export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number) {
  return inr.format(Math.round(amount));
}

const inrRate = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Per-gram rates keep paise; ornament totals do not. */
export function formatRate(amount: number) {
  return inrRate.format(amount);
}

/** Weights are quoted to three decimals across the Indian jewellery trade. */
export function formatWeight(grams: number) {
  return `${grams.toFixed(3)} g`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
