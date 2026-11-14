import type { NextConfig } from "next";

/** Product photos are served by the backend, so the image optimiser must be allowed to fetch them. */
const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1337");

const nextConfig: NextConfig = {
  images: {
    // Only for local development, where the backend runs on localhost; production fetches from the public API.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      { protocol: api.protocol.replace(":", "") as "http" | "https", hostname: api.hostname, port: api.port, pathname: "/uploads/**" },
      { protocol: "https", hostname: "api.mukundmaidjewellers.in", pathname: "/uploads/**" },
    ],
  },
  devIndicators: false,
  transpilePackages: ["@webfudge/config", "@webfudge/utils"],
};

export default nextConfig;
