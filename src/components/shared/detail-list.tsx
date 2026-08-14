"use client";

import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";
import { phoneDisplayValue } from "@/lib/phone-display";
import { isDummyPhone, toE164Phone, type PhoneMode } from "@yaadro/phone-kit";

export type DetailItem = {
  label: string;
  value?: string | number | boolean | null;
  /** Override string used for copy (defaults to displayed text). */
  copyValue?: string | null;
  phoneMode?: PhoneMode;
  /** Hide empty rows when true */
  hideIfEmpty?: boolean;
};

function toDisplayText(value: DetailItem["value"]): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

export function DetailRow({
  label,
  value,
  copyValue,
  phoneMode,
  className,
}: {
  label: string;
  value?: DetailItem["value"];
  copyValue?: string | null;
  phoneMode?: PhoneMode;
  className?: string;
}) {
  const rawText = toDisplayText(value);
  const text = phoneMode ? phoneDisplayValue(rawText, phoneMode) ?? "" : rawText;
  const copyText = (
    copyValue ??
    (phoneMode && !isDummyPhone(rawText) ? toE164Phone(rawText, phoneMode) : null) ??
    text
  ).trim();

  return (
    <div
      className={cn(
        "group flex items-center gap-4 border-b border-border/70 py-2.5 last:border-b-0",
        className,
      )}
    >
      <dt className="w-40 shrink-0 text-sm text-muted-foreground sm:w-48">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2">
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            !text && "font-normal text-muted-foreground",
          )}
          title={text || undefined}
        >
          {text || "—"}
        </p>
        <CopyButton
          value={copyText}
          iconOnly
          size={13}
          label={`Copy ${label}`}
          className="size-7 shrink-0 p-0"
          disabled={!copyText}
        />
      </dd>
    </div>
  );
}

export function DetailList({
  items,
  className,
}: {
  items: DetailItem[];
  className?: string;
}) {
  const visible = items.filter(
    (item) => !(item.hideIfEmpty && !toDisplayText(item.value)),
  );

  return (
    <dl className={cn(className)}>
      {visible.map((item) => (
        <DetailRow
          key={item.label}
          label={item.label}
          value={item.value}
          copyValue={item.copyValue}
          phoneMode={item.phoneMode}
        />
      ))}
    </dl>
  );
}
