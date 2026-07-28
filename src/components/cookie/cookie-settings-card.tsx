"use client";

import Link from "next/link";
import { useState } from "react";

import { CookiePreferencesDialog } from "@/components/cookie/cookie-preferences-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieSettingsCard() {
  const { consent, ready, reset } = useCookieConsent();
  const [open, setOpen] = useState(false);

  const rows = [
    { label: "Strictly necessary", enabled: true, locked: true },
    { label: "Analytics", enabled: Boolean(consent?.analytics), locked: false },
    {
      label: "Preferences",
      enabled: Boolean(consent?.preferences),
      locked: false,
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Cookies</h3>
        {ready ? (
          <Badge variant={consent ? "secondary" : "outline"}>
            {consent ? "Choice saved" : "No choice yet"}
          </Badge>
        ) : null}
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium">
              {row.locked
                ? "Always on"
                : ready && row.enabled
                  ? "Allowed"
                  : "Blocked"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => setOpen(true)}>Manage preferences</Button>
        <Button variant="outline" disabled={!consent} onClick={reset}>
          Reset choice
        </Button>
        <Button variant="ghost" render={<Link href="/cookies" />}>
          Cookie policy
        </Button>
      </div>

      <CookiePreferencesDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
