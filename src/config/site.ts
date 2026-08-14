export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Restaurant Superadmin",
  description: "Superadmin panel for restaurant ecommerce management",
  url:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NEXT_PUBLIC_TUNNEL_HOST
      ? `https://${process.env.NEXT_PUBLIC_TUNNEL_HOST}`
      : "http://localhost:3000"),
  /** Same-origin API base (proxied by Next.js rewrites). */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  /** Same-origin DMS API base (proxied by Next.js rewrites). */
  dmsApiBaseUrl: process.env.NEXT_PUBLIC_DMS_API_BASE_URL ?? "/dms-api",
  tunnelHost: process.env.NEXT_PUBLIC_TUNNEL_HOST ?? "uaesuperadmin.yaadro.online",
  developmentMode: process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true",
  numverifyAccessKey: process.env.NEXT_PUBLIC_NUMVERIFY_ACCESS_KEY ?? "",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  /** Sent as `x-api-key` on admin-api requests (rewrite-forwarded). */
  adminApiKey: process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? "",
} as const;

export const navItems = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Shops", href: "/shops" },
  { title: "Customer merges", href: "/customer-merges" },
  { title: "Groups", href: "/groups" },
  { title: "POS", href: "/pos" },
  { title: "Reports", href: "/reports" },
  { title: "Analytics", href: "/analytics" },
  { title: "Invoice", href: "/invoice" },
  { title: "Settings", href: "/settings" },
] as const;
