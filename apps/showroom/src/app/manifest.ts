import type { MetadataRoute } from "next";

/** Lets the tablets install the showroom as a full-screen app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MMJ Showroom",
    short_name: "MMJ Showroom",
    description: "The Mukund Maid Jewellers collection, for the showroom floor.",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#071c52",
    theme_color: "#071c52",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
