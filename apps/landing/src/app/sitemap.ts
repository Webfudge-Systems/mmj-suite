import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { categories, metalCounters } from "@/data/categories";
import { collections } from "@/data/collections";
import { journalPosts } from "@/data/journal";
import { getProducts } from "@/lib/catalog";

const staticPaths = [
  "/",
  "/shop",
  "/collections",
  "/search",
  "/about",
  "/contact",
  "/stores",
  "/gold-rate",
  "/gold-savings-scheme",
  "/journal",
  "/faq",
  "/shipping-returns",
  "/privacy",
  "/terms",
];

const occasions = ["bridal", "festive", "daily", "gifting", "mens"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pages = [
    ...staticPaths,
    ...metalCounters.map((counter) => `/shop/${counter.slug}`),
    ...categories.map((category) => `/shop/${category.slug}`),
    ...occasions.map((occasion) => `/shop/${occasion}`),
    ...collections.map((collection) => `/collections/${collection.slug}`),
    ...getProducts().map((product) => `/products/${product.slug}`),
    ...journalPosts.map((post) => `/journal/${post.slug}`),
  ];

  return pages.map((path) => ({
    url: `${site.url}${path}`,
    lastModified,
  }));
}
