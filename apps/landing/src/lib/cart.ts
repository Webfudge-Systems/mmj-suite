import type { CartLine, Product } from "@/types";
import { getProductBySlug } from "@/lib/catalog";
import { shippingFor } from "@/lib/pricing";

export type ResolvedLine = CartLine & { product: Product };

export function resolveLines(lines: CartLine[]): ResolvedLine[] {
  return lines.flatMap((line) => {
    const product = getProductBySlug(line.slug);
    return product ? [{ ...line, product }] : [];
  });
}

export function cartTotals(lines: ResolvedLine[]) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
  const saving = lines.reduce((sum, line) => {
    const was = line.product.compareAtPrice;
    return was ? sum + (was - line.product.price) * line.quantity : sum;
  }, 0);
  const shipping = shippingFor(subtotal);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  /** Gross weight across the order, which is what the insurer needs. */
  const grossWeight = lines.reduce(
    (sum, line) => sum + line.product.grossWeight * line.quantity,
    0,
  );

  return { subtotal, saving, shipping, total: subtotal + shipping, count, grossWeight };
}
