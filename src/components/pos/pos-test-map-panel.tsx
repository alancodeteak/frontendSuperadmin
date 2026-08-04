"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { POS_TEST_MAP_DEFAULT_SECTION } from "@/lib/pos/contract";

const SAMPLE_DEFAULT = {
  id: "POS-1001",
  vno: "B-1001",
  customer: { name: "Ali", phone: "+971501234567" },
  addr1: "Marina",
  addr2: "Dubai",
  total: 42,
  pay_mode: "CASH",
  items: [{ sku: "A1", itn: "Shawarma", qty: 2, rate: 18, amt: 36 }],
};

export function PosTestMapPanel({
  sections,
  onTest,
  busy,
}: {
  sections: string[];
  onTest: (input: {
    mapping_section: string;
    sample_payload: Record<string, unknown>;
  }) => Promise<void>;
  busy?: boolean;
}) {
  const [section, setSection] = useState(
    sections.includes(POS_TEST_MAP_DEFAULT_SECTION)
      ? POS_TEST_MAP_DEFAULT_SECTION
      : (sections[0] ?? POS_TEST_MAP_DEFAULT_SECTION),
  );
  const [sampleText, setSampleText] = useState(
    JSON.stringify(SAMPLE_DEFAULT, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      const sample_payload = JSON.parse(sampleText || "{}") as Record<
        string,
        unknown
      >;
      await onTest({ mapping_section: section, sample_payload });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid sample JSON");
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Mapping section
        </Label>
        <select
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          {(sections.length ? sections : [POS_TEST_MAP_DEFAULT_SECTION]).map(
            (key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Sample payload JSON
        </Label>
        <Textarea
          className="min-h-40 font-mono text-xs"
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="button" size="sm" disabled={busy} onClick={() => void run()}>
        Test map
      </Button>
    </div>
  );
}
