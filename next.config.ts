import type { NextConfig } from "next";

/** Normalize origins from env (Vercel/Windows often store `https:\\host`). */
function normalizeOrigin(value: string, fallback: string) {
  const raw = (value || fallback).trim();
  const withSlashes = raw.replace(/\\/g, "/");
  const withProtocol = withSlashes.replace(
    /^(https?):\/(?!\/)/i,
    "$1://",
  );
  return withProtocol.replace(/\/$/, "");
}

const apiProxyTarget = normalizeOrigin(
  process.env.API_PROXY_TARGET ?? "",
  "https://superadmin-api.yaadro.ae",
);

const dmsApiProxyTarget = normalizeOrigin(
  process.env.DMS_API_PROXY_TARGET ?? "",
  "http://localhost:3001",
);

const tunnelHost =
  process.env.NEXT_PUBLIC_TUNNEL_HOST ?? "superadmin.yaadro.online";

const nextConfig: NextConfig = {
  // Allow Next.js dev assets/HMR when accessed via a custom hostname (local tunnel)
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
