"use client";

import { useEffect, useState } from "react";

import { CookieSettingsCard } from "@/components/cookie/cookie-settings-card";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState, LoadingState, StatusBadge } from "@/components/shared/states";
import { healthFetch } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await healthFetch<HealthResponse>();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Health check failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (<PageShell>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-base font-semibold">Environment</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">App name</dt>
                <dd className="font-medium">
                  {process.env.NEXT_PUBLIC_APP_NAME}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">API base</dt>
                <dd className="font-medium">
                  {process.env.NEXT_PUBLIC_API_BASE_URL}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Tunnel host</dt>
                <dd className="font-medium">
                  {process.env.NEXT_PUBLIC_TUNNEL_HOST}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">App URL</dt>
                <dd className="font-medium">{process.env.NEXT_PUBLIC_APP_URL}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">API health</h3>
              {health?.status ? <StatusBadge status={health.status} /> : null}
            </div>
            {loading ? <LoadingState label="Checking health…" /> : null}
            {error ? <ErrorState message={error} /> : null}
            {health ? (
              <pre className="mt-4 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(health, null, 2)}
              </pre>
            ) : null}
          </div>

          <CookieSettingsCard />
        </div>
      </PageShell>);
}
