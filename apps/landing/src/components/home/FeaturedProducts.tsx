import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { ensureCatalog, getBestsellers, getFeatured, getNewArrivals } from "@/lib/catalog";

/** Server half: picks the three product sets the tabs switch between. */
export async function FeaturedProducts() {
  await ensureCatalog();
  const featured = getFeatured(12);

  const sets = [
    { key: "bestsellers", label: "Bestsellers", products: getBestsellers(12) },
    { key: "new", label: "New arrivals", products: getNewArrivals(12) },
    { key: "featured", label: "Featured", products: featured.length ? featured : getBestsellers(12) },
  ]
    .filter((set) => set.products.length > 0)
    // A small live catalogue gives the same pieces for every tab; show each set once.
    .filter((set, index, all) => {
      const key = set.products.map((product) => product.slug).join();
      return all.findIndex((other) => other.products.map((product) => product.slug).join() === key) === index;
    });

  if (sets.length === 0) return null;
  return <FeaturedCarousel sets={sets} />;
}
