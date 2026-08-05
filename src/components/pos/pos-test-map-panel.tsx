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

const OUTBOUND_SAMPLE = {
  order_id: 1001,
  shop_id: "SHOP-1",
  client_order_ref: "APP-1001",
  bill_no: "B-1001",
  order_status: "Accepted",
  customer_name: "Ali",
  customer_phone: "+971501234567",
  address: "Marina, Dubai",
  total_amount: 42,
  vat: 2,
  tip: 0,
  delivery_charge: 4,
  discount_amount: 0,
  payment_mode: "CASH",
  payment_status: "paid",
  special_instructions: "No onions",
  action: "order_create",
  items: [
    {
      item_name: "Shawarma",
      quantity: 2,
      price: 18,
      totalamount: 36,
      pos_product_id: "A1",
      product_id: 10,
    },
  ],
};

function sampleForSection(section: string): Record<string, unknown> {
  return section === "order_outbound" || section === "status_outbound"
    ? OUTBOUND_SAMPLE
    : SAMPLE_DEFAULT;
}

function sectionHelp(section: string): string {
  if (section === "order_outbound" || section === "status_outbound") {
    return "Outbound test input must use Yaadro canonical fields. The output is the vendor request body.";
  }
  if (section.startsWith("catalog_")) {
    return "Paste the real category/product response returned by the POS. The output should contain normalized catalog fields.";
  }
  if (section === "rider_inbound") {
    return "Paste the real POS rider response. The output must contain rider code and name.";
  }
  return "Paste the real POS webhook body. The output should contain Yaadro order fields.";
}

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
        <p className="text-xs text-muted-foreground">{sectionHelp(section)}</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Sample payload JSON
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSampleText(JSON.stringify(sampleForSection(section), null, 2))}
          >
            Load {section.includes("outbound") ? "Yaadro" : "example"} sample
          </Button>
        </div>
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
