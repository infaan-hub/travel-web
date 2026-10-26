import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The legacy clients call every API path with a trailing slash.
  trailingSlash: true,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "nodemailer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
    authInterrupts: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
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
