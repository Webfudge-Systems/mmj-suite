import type { MetadataRoute } from "next";
import { site } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart", "/checkout", "/account", "/wishlist"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
