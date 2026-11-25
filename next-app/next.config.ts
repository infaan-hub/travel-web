import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The legacy clients call every API path with a trailing slash.
  trailingSlash: true,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "nodemailer", "sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
    authInterrupts: true,
    agentUpgrade: "security",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    localPatterns: [
      { pathname: "/uploads/**" },
      { pathname: "/icons/**" },
      { pathname: "/api/images/**" },
      { pathname: "/api/home-settings/images/**" },
      { pathname: "/*" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
