import { describe, expect, it } from "vitest";
import {
  isDummyPhone,
  resolveCustomerPhone,
  toE164Phone,
  type CountryCode,
} from "@yaadro/phone-kit";
import { validateYaadroPhoneInput } from "@yaadro/phone-input";
import goldenVectors from "../../../yaadroECOMDMS/packages/phone-kit/golden-vectors.json";
import { phoneDisplayValue } from "./phone-display";

describe("phone policy golden vectors", () => {
  for (const vector of goldenVectors) {
    it(`resolves ${String(vector.input)}`, () => {
      if (vector.dummy) {
        expect(isDummyPhone(vector.input)).toBe(true);
        expect(phoneDisplayValue(String(vector.input))).toBeNull();
        return;
      }

      const resolution = resolveCustomerPhone(vector.input, {
        selectedCountry: vector.selectedCountry as CountryCode | undefined,
      });
      expect(resolution.e164).toBe(vector.e164);
      if (vector.e164) expect(resolution.kind).toBe(vector.kind);
      if (vector.reason) expect(resolution.reason).toBe(vector.reason);
    });
  }
});

describe("validation modes", () => {
  it("accepts international landlines for contacts", () => {
    expect(toE164Phone("+966112345678", "contact")).toBe("+966112345678");
  });

  it("rejects landlines for mobile staff", () => {
    expect(toE164Phone("+966112345678", "mobile")).toBeNull();
  });
});

describe("shared picker validation", () => {
  it("uses AE only as the default and accepts another selected country", () => {
    const result = validateYaadroPhoneInput("+919876543210", "mobile");
    expect(result.e164).toBe("+919876543210");
  });

  it("rejects a landline in mobile mode", () => {
    expect(validateYaadroPhoneInput("+97143401234", "mobile").e164).toBeNull();
  });
});
