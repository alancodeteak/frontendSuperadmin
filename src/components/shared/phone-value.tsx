"use client";

import { CopyButton } from "@/components/shared/copy-button";
import { phoneDisplayValue } from "@/lib/phone-display";
import { toE164Phone, type PhoneMode } from "@yaadro/phone-kit";

export function PhoneValue({
  value,
  mode = "contact",
  copyable = true,
}: {
  value: string | null | undefined;
  mode?: PhoneMode;
  copyable?: boolean;
}) {
  const display = phoneDisplayValue(value, mode);
  if (!display) return <span className="text-muted-foreground">—</span>;
  const e164 = toE164Phone(value, mode)!;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate tabular-nums">{display}</span>
      {copyable ? (
        <CopyButton
          value={e164}
          iconOnly
          size={13}
          label={`Copy ${display}`}
          className="size-6 shrink-0 p-0"
        />
      ) : null}
    </span>
  );
}
