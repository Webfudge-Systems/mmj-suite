/**
 * Hits every route against a running dev server and reports the status plus the
 * first error line, so a broken page cannot slip past a clean type-check.
 * Usage: node scripts/smoke.mjs [extra routes...]
 */
const base = process.env.SMOKE_BASE ?? "http://localhost:3100";

const routes = [
  "/",
  "/shop",
  "/shop?metal=diamond&sort=price-desc",
  "/shop?page=2",
  "/shop/gold",
  "/shop/diamond",
  "/shop/silver",
  "/shop/platinum",
  "/shop/bullion",
  "/shop/rings",
  "/shop/earrings",
  "/shop/necklaces",
  "/shop/bangles",
  "/shop/mangalsutra",
  "/shop/chains",
  "/shop/pendants",
  "/shop/bracelets",
  "/shop/nosepins",
  "/shop/anklets",
  "/shop/coins",
  "/shop/bridal",
  "/shop/festive",
  "/shop/daily",
  "/shop/gifting",
  "/shop/mens",
  "/collections",
  "/collections/bridal-vault",
  "/collections/temple-tradition",
  "/collections/everyday-light",
  "/collections/solitaire-house",
  "/collections/mens-line",
  "/collections/festive-bloom",
  "/search",
  "/search?q=jhumka",
  "/search?q=zzzznothing",
  "/products/kalyani-temple-necklace",
  "/products/anaya-solitaire-ring",
  "/products/tulsi-daily-mangalsutra",
  "/products/ghungroo-payal",
  "/products/fine-gold-bar-10g",
  "/products/platinum-couple-bands",
  "/cart",
  "/checkout",
  "/checkout/success",
  "/wishlist",
  "/account",
  "/about",
  "/contact",
  "/stores",
  "/gold-rate",
  "/gold-savings-scheme",
  "/journal",
  "/journal/how-to-read-a-jewellers-estimate",
  "/faq",
  "/shipping-returns",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  ...process.argv.slice(2),
];

let failed = 0;

for (const route of routes) {
  try {
    const response = await fetch(`${base}${route}`);
    const body = await response.text();
    const broken = response.status >= 400;
    if (broken) failed += 1;

    const hint = broken
      ? (body.match(/"message":"([^"]+)|Error: ([^\n<]+)/) ?? []).slice(1).find(Boolean)
      : "";

    console.log(`${broken ? "FAIL" : "ok  "} ${response.status}  ${route}${hint ? `  ${hint}` : ""}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ---  ${route}  ${error.message}`);
  }
}

console.log(`\n${routes.length - failed}/${routes.length} routes ok`);
process.exit(failed > 0 ? 1 : 0);
