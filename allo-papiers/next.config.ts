import type { NextConfig } from "next";

// La politique de sécurité du contenu (CSP, avec nonce) est définie dans src/proxy.ts.

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  turbopack: { root: import.meta.dirname },
  reactStrictMode: true,
  serverExternalPackages: ["postgres"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  async redirects() {
    // allo-papiers.fr (avec tiret) → allopapiers.fr, si les deux domaines pointent sur ce projet.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?allo-papiers\\.fr" }],
        destination: "https://allopapiers.fr/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.allopapiers\\.fr" }],
        destination: "https://allopapiers.fr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
