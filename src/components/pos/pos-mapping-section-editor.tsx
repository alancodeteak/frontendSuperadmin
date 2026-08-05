"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  POS_MAPPING_SECTIONS,
  POS_MAPPING_SECTIONS_ADVANCED_ONLY,
} from "@/lib/pos/contract";

const DEFAULT_SECTIONS = [
  ...POS_MAPPING_SECTIONS,
  ...POS_MAPPING_SECTIONS_ADVANCED_ONLY,
] as const;

const SECTION_NOTES: Record<string, string> = {
  status_inbound:
    "Not wired in dms-api today. Use tab 6 Status codes → Inbound for Saleculator-style status translation, or Status sent to POS for custom push bodies.",
};

export function PosMappingSectionEditor({
  mappings,
  onChange,
}: {
  mappings: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const sectionKeys = useMemo(() => {
    const keys = new Set<string>([...DEFAULT_SECTIONS, ...Object.keys(mappings)]);
    return [...keys];
  }, [mappings]);

  const [active, setActive] = useState<string>("order_inbound");
  const [draft, setDraft] = useState(() =>
    JSON.stringify(mappings[active] ?? {}, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(JSON.stringify(mappings[active] ?? {}, null, 2));
    setError(null);
  }, [active, mappings]);

  function selectSection(section: string) {
    flushDraft(active);
    setActive(section);
  }

  function flushDraft(section: string = active): boolean {
    try {
      const parsed = JSON.parse(draft || "{}") as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("Mapping section must be a JSON object.");
        return false;
      }
      const currentApplied = JSON.stringify(mappings[section] ?? {});
      const nextApplied = JSON.stringify(parsed);
      if (currentApplied !== nextApplied) {
        onChange({ ...mappings, [section]: parsed });
      }
      setError(null);
      return true;
    } catch {
      setError("Invalid JSON for this mapping section.");
      return false;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sectionKeys.map((section) => (
          <Button
            key={section}
            type="button"
            size="sm"
            variant={active === section ? "default" : "outline"}
            onClick={() => selectSection(section)}
          >
            {section}
          </Button>
        ))}
      </div>
      {SECTION_NOTES[active] ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {SECTION_NOTES[active]}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {active} mapping JSON
        </Label>
        <Textarea
          className="min-h-48 font-mono text-xs"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            void flushDraft();
          }}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Developer fallback only. Prefer the guided mapping cards above for normal onboarding.
      </p>
      <Button type="button" size="sm" variant="outline" onClick={() => void flushDraft()}>
        Apply section now
      </Button>
    </div>
  );
}
