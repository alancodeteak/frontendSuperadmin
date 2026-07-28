import { NextRequest, NextResponse } from "next/server";

import { isMeilisearchConfigured } from "@/lib/search/meilisearch-client";
import { syncSearchIndex } from "@/lib/search/search-service";

export async function POST(request: NextRequest) {
  if (!isMeilisearchConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Meilisearch is not configured. Set MEILISEARCH_HOST (and optional MEILISEARCH_API_KEY).",
      },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { ok: false, error: "Authorization required to sync search index" },
      { status: 401 },
    );
  }

  try {
    const result = await syncSearchIndex(authHeader);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isMeilisearchConfigured(),
    index: process.env.MEILISEARCH_INDEX_SUPERADMIN ?? "superadmin",
  });
}
