import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode catches bugs in development
  reactStrictMode: true,

  // Disable X-Powered-By header for security
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Bundle analyzer can be enabled via ANALYZE=true npm run build
  // Externalize AWS SDK from server bundle to reduce cold starts
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
