import type { NextConfig } from "next";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET ?? "https://superadmin-api.yaadro.online"
).replace(/\/$/, "");

const dmsApiProxyTarget = (
  process.env.DMS_API_PROXY_TARGET ?? "http://localhost:3001"
).replace(/\/$/, "");

const tunnelHost =
  process.env.NEXT_PUBLIC_TUNNEL_HOST ?? "superadmin.yaadro.online";

const nextConfig: NextConfig = {
  // Allow Next.js dev assets/HMR when accessed via the Cloudflare tunnel hostname
  allowedDevOrigins: [tunnelHost],

  async rewrites() {
    return {
      // Local App Router routes (e.g. /api/search) win first;
      // everything else under /api proxies to admin-api.
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${apiProxyTarget}/api/:path*`,
        },
        {
          source: "/health",
          destination: `${apiProxyTarget}/health`,
        },
        {
          source: "/dms-api/:path*",
          destination: `${dmsApiProxyTarget}/dms-api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
