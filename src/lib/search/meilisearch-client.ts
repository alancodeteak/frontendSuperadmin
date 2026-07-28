import { Meilisearch } from "meilisearch";

let client: Meilisearch | null = null;

export function isMeilisearchConfigured() {
  return Boolean(process.env.MEILISEARCH_HOST?.trim());
}

export function getMeilisearchClient() {
  if (!isMeilisearchConfigured()) return null;

  if (!client) {
    client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST!.replace(/\/$/, ""),
      apiKey: process.env.MEILISEARCH_API_KEY || undefined,
    });
  }

  return client;
}

export function getSuperadminIndexName() {
  return process.env.MEILISEARCH_INDEX_SUPERADMIN ?? "superadmin";
}
