import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Inject admin `x-api-key` on proxied admin-api traffic.
 * Keeps the key server-side (not NEXT_PUBLIC) while rewrites forward to API_PROXY_TARGET.
 */
export function middleware(request: NextRequest) {
  const apiKey =
    process.env.ADMIN_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_API_KEY?.trim();
  if (!apiKey) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Local App Router search routes — do not treat as admin-api proxy
  if (pathname.startsWith("/api/search")) {
    return NextResponse.next();
  }

  const isAdminProxy =
    pathname.startsWith("/api/") || pathname === "/health";

  if (!isAdminProxy) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set("x-api-key", apiKey);

  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: ["/api/:path*", "/health"],
};
