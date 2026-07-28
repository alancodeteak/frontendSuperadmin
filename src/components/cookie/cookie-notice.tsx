"use client";

import Link from "next/link";
import { useState } from "react";

import { CookiePreferencesDialog } from "@/components/cookie/cookie-preferences-dialog";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieNotice() {
  const { needsDecision, acceptAll } = useCookieConsent();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <>
      {needsDecision ? (
        <div
          role="region"
          aria-label="Cookie notice"
          className="fixed bottom-4 left-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-in rounded-2xl border bg-card p-5 text-card-foreground shadow-xl duration-300 fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-base leading-none">
              🍪
            </span>
            <h2 className="text-[0.95rem] font-semibold">Cookie Notice</h2>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We use cookies to ensure that we give you the best experience on our
            website.{" "}
            <Link
              href="/cookies"
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              Read cookies policies.
            </Link>
          </p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button
              variant="link"
              className="h-auto px-0 text-foreground underline underline-offset-4 hover:no-underline"
              onClick={() => setPreferencesOpen(true)}
            >
              Manage your preferences
            </Button>
            <Button size="lg" className="px-4" onClick={acceptAll}>
              Accept
            </Button>
          </div>
        </div>
      ) : null}

      <CookiePreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  );
}
