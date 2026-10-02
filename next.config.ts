import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "sharp",
    "@napi-rs/canvas",
    "@imgly/background-removal-node",
    "onnxruntime-node",
    "liquidjs",
  ],
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
};

export default nextConfig;
