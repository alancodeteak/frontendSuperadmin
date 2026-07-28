import { NextRequest, NextResponse } from "next/server";

import { suggestSearch } from "@/lib/search/search-service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 25)
    : 10;
  const authHeader = request.headers.get("authorization");

  try {
    const result = await suggestSearch(q, limit, authHeader);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        query: q,
        engine: "federated",
        processingTimeMs: 0,
        suggestions: [],
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    );
  }
}
