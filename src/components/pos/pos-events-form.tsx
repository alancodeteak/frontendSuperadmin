"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PosEvents } from "@/lib/pos/contract";

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function PosEventsForm({
  value,
  onChange,
}: {
  value: PosEvents;
  onChange: (next: PosEvents) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          order_create_on
        </Label>
        <Textarea
          className="min-h-20 font-mono text-xs"
          value={(value.order_create_on ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...value,
              order_create_on: parseCsv(e.target.value),
            })
          }
          placeholder="blank_created, customer_order_created"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          status_out_on
        </Label>
        <Textarea
          className="min-h-20 font-mono text-xs"
          value={(value.status_out_on ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...value,
              status_out_on: parseCsv(e.target.value),
            })
          }
          placeholder="Accepted, Assigned, Delivered, …"
        />
      </div>
    </div>
  );
}
