import {
  formatPhoneNumber,
  isDummyPhone,
  toE164Phone,
  type PhoneMode,
} from "@yaadro/phone-kit";

export function phoneDisplayValue(
  value: string | null | undefined,
  mode: PhoneMode = "contact",
): string | null {
  if (!value || isDummyPhone(value)) return null;
  const e164 = toE164Phone(value, mode);
  return e164 ? formatPhoneNumber(e164) : null;
}
