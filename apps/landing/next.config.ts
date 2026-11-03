import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@webfudge/config", "@webfudge/utils"],
};

export default nextConfig;
