import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@meridian/domain",
    "@meridian/event-store",
    "@meridian/graph",
    "@meridian/intelligence",
  ],
};

export default nextConfig;
