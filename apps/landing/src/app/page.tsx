import { Hero } from "@/components/home/Hero";
import { Bestsellers } from "@/components/home/Bestsellers";
import { Categories } from "@/components/home/Categories";
import { CraftBand } from "@/components/home/CraftBand";
import { NewCollection } from "@/components/home/NewCollection";
import { Reviews } from "@/components/home/Reviews";
import { ClosingCta } from "@/components/home/ClosingCta";
import { GalleryStrip } from "@/components/home/GalleryStrip";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Bestsellers />
      <Categories />
      <CraftBand />
      <NewCollection />
      <Reviews />
      <ClosingCta />
      <GalleryStrip />
    </>
  );
}
