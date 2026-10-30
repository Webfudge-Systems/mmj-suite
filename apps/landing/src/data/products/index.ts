import type { ProductSeed } from "@/types";
import { goldSeeds } from "@/data/products/gold";
import { diamondSeeds } from "@/data/products/diamond";
import { bullionSeeds, platinumSeeds, silverSeeds } from "@/data/products/silver";

export const productSeeds: ProductSeed[] = [
  ...goldSeeds,
  ...diamondSeeds,
  ...silverSeeds,
  ...platinumSeeds,
  ...bullionSeeds,
];
