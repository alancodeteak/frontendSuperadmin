import { siteConfig } from "@/config/site";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSession,
} from "@/lib/auth-storage";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  skipRefresh?: boolean;
};

function joinPath(base: string, path: string) {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function withParams(
  url: string,
  params?: RequestOptions["params"],
): string {
  if (!params) return url;

  const origin =
    typeof window !== "undefined" ? window.location.origin : siteConfig.url;
  const parsed = new URL(url, origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      parsed.searchParams.set(key, String(value));
    }
  });

  if (url.startsWith("/")) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  return parsed.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  let message = `Request failed with ${response.status}`;

  try {
    body = await response.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.message === "string") message = record.message;
      else if (Array.isArray(record.message)) {
        message = record.message.map(String).join("; ");
      } else if (typeof record.error === "string") message = record.error;
      else if (typeof record.detail === "string") message = record.detail;

      // Nest ZodValidationPipe: { message, errors: [{ path, message }] }
      if (Array.isArray(record.errors) && record.errors.length > 0) {
        const details = record.errors
          .map((issue) => {
            if (!issue || typeof issue !== "object") return String(issue);
            const row = issue as Record<string, unknown>;
            const path = typeof row.path === "string" && row.path ? row.path : "";
            const msg = typeof row.message === "string" ? row.message : "";
            return path && msg ? `${path}: ${msg}` : msg || path;
          })
          .filter(Boolean)
          .join("; ");
        if (details) {
          message =
            typeof record.message === "string"
              ? `${record.message} (${details})`
              : details;
        }
      }
    }
  } catch {
    try {
      const text = await response.text();
      if (text) message = text;
    } catch {
      // ignore
    }
  }

  return new ApiError(response.status, message, body);
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(joinPath(siteConfig.apiBaseUrl, "/v2/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearSession();
        return false;
      }

      const data = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
      };

      if (!data.access_token || !data.refresh_token) {
        clearSession();
        return false;
      }

      setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers, auth = true, skipRefresh = false, ...rest } = options;
  const url = withParams(joinPath(siteConfig.apiBaseUrl, path), params);

  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      (requestHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
  });

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw await parseError(response);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function healthFetch<T>(): Promise<T> {
  if (siteConfig.developmentMode) {
    const { mockHealth } = await import("@/lib/mock-data");
    return mockHealth() as Promise<T>;
  }
  const response = await fetch("/health");
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}

/** Authenticated download for XLSX/binary exports. */
export async function apiDownload(
  path: string,
  options: RequestOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const { params, headers, auth = true, skipRefresh = false, ...rest } = options;
  const url = withParams(joinPath(siteConfig.apiBaseUrl, path), params);

  const requestHeaders: HeadersInit = { ...headers };
  if (auth) {
    const token = getAccessToken();
    if (token) {
      (requestHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, { ...rest, headers: requestHeaders });

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiDownload(path, { ...options, skipRefresh: true });
    }
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw await parseError(response);
  }

  if (!response.ok) throw await parseError(response);

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] ?? `export-${Date.now()}.xlsx`;
  const blob = await response.blob();
  return { blob, filename };
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
