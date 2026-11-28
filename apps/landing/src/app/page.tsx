import { Hero } from "@/components/home/Hero";
import { StyleExplorer } from "@/components/home/StyleExplorer";
import { PromoPair } from "@/components/home/PromoPair";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { StoryMosaic } from "@/components/home/StoryMosaic";
import { RateStrip } from "@/components/home/RateStrip";
import { Reviews } from "@/components/home/Reviews";
import { StoreLocator } from "@/components/home/StoreLocator";
import { Experience } from "@/components/home/Experience";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StyleExplorer />
      <PromoPair />
      <FeaturedProducts />
      <ShopTheLook />
      <StoryMosaic />
      <RateStrip />
      <Reviews />
      <StoreLocator />
      <Experience />
    </>
  );
}
