import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: [
    "@webfudge/auth",
    "@webfudge/config",
    "@webfudge/hooks",
    "@webfudge/ui",
    "@webfudge/utils",
  ],
};

export default nextConfig;
