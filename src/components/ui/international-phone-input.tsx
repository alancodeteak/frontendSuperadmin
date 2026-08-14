"use client";

import { YaadroPhoneInput } from "@yaadro/phone-input";
import { isPolicyPhoneValid, type PhoneMode } from "@yaadro/phone-kit";
import { cn } from "@/lib/utils";

type InternationalPhoneInputProps = {
  id?: string;
  value?: string | null;
  onChange: (value: string) => void;
  mode?: PhoneMode;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
};

// Compatibility seam for @yaadro/phone-kit/input.
export function InternationalPhoneInput({
  value,
  onChange,
  mode = "contact",
  className,
  ...props
}: InternationalPhoneInputProps) {
  const invalid = Boolean(value) && !isPolicyPhoneValid(value, mode);
  return (
    <YaadroPhoneInput
      {...props}
      defaultCountry="AE"
      mode={mode}
      value={value || undefined}
      onChange={(next: string | undefined) => onChange(next ?? "")}
      aria-invalid={props["aria-invalid"] || invalid}
      className={cn(
        "yaadro-phone-input",
        (props["aria-invalid"] || invalid) && "yaadro-phone-input-invalid",
        className,
      )}
    />
  );
}
