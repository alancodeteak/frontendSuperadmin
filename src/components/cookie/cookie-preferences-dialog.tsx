"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import type { CookieChoices } from "@/lib/cookie-consent";

const OPTIONAL_CATEGORIES = [
  {
    key: "analytics" as const,
    title: "Analytics",
    description:
      "Usage and performance metrics that tell us which dashboards and reports are actually used.",
  },
  {
    key: "preferences" as const,
    title: "Preferences",
    description:
      "Remembers choices such as sidebar state, table filters and dismissed notifications.",
  },
];

type CookiePreferencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function CookiePreferencesDialog({
  open,
  onOpenChange,
  onSaved,
}: CookiePreferencesDialogProps) {
  const { consent, save } = useCookieConsent();
  // Optional categories stay off until the admin opts in.
  const [draft, setDraft] = useState<CookieChoices>({
    analytics: consent?.analytics ?? false,
    preferences: consent?.preferences ?? false,
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      analytics: consent?.analytics ?? false,
      preferences: consent?.preferences ?? false,
    });
  }, [open, consent]);

  function commit(choices: CookieChoices) {
    save(choices);
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cookie preferences</DialogTitle>
          <DialogDescription>
            Choose which cookies Yaadro may store on this device. You can change
            this at any time from Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-3">
            <div className="grid gap-1">
              <p className="font-medium">Strictly necessary</p>
              <p className="text-xs text-muted-foreground">
                Sign-in session and security cookies. Required for the admin
                console to work.
              </p>
            </div>
            <Switch checked disabled aria-label="Strictly necessary cookies" />
          </div>

          {OPTIONAL_CATEGORIES.map((category) => (
            <div
              key={category.key}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="grid gap-1">
                <p className="font-medium">{category.title}</p>
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <Switch
                checked={draft[category.key]}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    [category.key]: checked,
                  }))
                }
                aria-label={`${category.title} cookies`}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => commit({ analytics: false, preferences: false })}
          >
            Reject optional
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => commit({ analytics: true, preferences: true })}
            >
              Accept all
            </Button>
            <Button onClick={() => commit(draft)}>Save preferences</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
