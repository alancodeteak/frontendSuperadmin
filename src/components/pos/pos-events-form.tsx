"use client";

import { Label } from "@/components/ui/label";
import {
  POS_ORDER_CREATE_EVENT_OPTIONS,
  POS_STATUS_OUT_EVENT_OPTIONS,
  type PosEvents,
} from "@/lib/pos/contract";

function EventCheckboxGroup({
  title,
  description,
  options,
  selected,
  onChange,
}: {
  title: string;
  description: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(event: string) {
    const set = new Set(selected);
    if (set.has(event)) set.delete(event);
    else set.add(event);
    onChange([...set]);
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((event) => (
          <label
            key={event}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selected.includes(event)}
              onChange={() => toggle(event)}
            />
            <span className="font-mono text-xs">{event}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function PosEventsForm({
  value,
  onChange,
}: {
  value: PosEvents;
  onChange: (next: PosEvents) => void;
}) {
  return (
    <div className="space-y-6">
      <EventCheckboxGroup
        title="When to create order on POS (order_create_on)"
        description="Check the Yaadro moments that should trigger an order push."
        options={POS_ORDER_CREATE_EVENT_OPTIONS}
        selected={value.order_create_on ?? []}
        onChange={(order_create_on) => onChange({ ...value, order_create_on })}
      />
      <EventCheckboxGroup
        title="When to push status to POS (status_out_on)"
        description="Check which order status changes should be sent to the POS."
        options={POS_STATUS_OUT_EVENT_OPTIONS}
        selected={value.status_out_on ?? []}
        onChange={(status_out_on) => onChange({ ...value, status_out_on })}
      />
    </div>
  );
}
