import type { CreateShopInput, ShopAddress } from "@/types/api";

/** Matches admin-api / Postman create-shop contract. Cache-bust: wizard-step-valid-v2 */
export const SHOP_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,49}$/;
export const ECOM_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SHOP_USER_ID_MIN = 100000;
export const SHOP_USER_ID_MAX = 999999;
export const UAE_COUNTRY_CODE = "+971";

export type UaePhoneType = "mobile" | "landline";

export type CreateShopFormValues = {
  shop_name: string;
  shop_id: string;
  password: string;
  user_id: string;
  phone_type: UaePhoneType;
  phone: string;
  email: string;
  ecom_slug: string;
  ecom_enabled: boolean;
  ecom_order_confirmation_enabled: boolean;
  scheduled_order: boolean;
  merge_order: boolean;
  return_option: boolean;
  customer_ticket: boolean;
  address_line_1: string;
  address_line_2: string;
  locality: string;
  city: string;
  contact_number_type: UaePhoneType;
  latitude: string;
  longitude: string;
  contact_number: string;
};

export type CreateShopField =
  | keyof CreateShopFormValues
  | "form";

export type FieldErrors = Partial<Record<CreateShopField, string>>;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function stripUaeCountryPrefix(digits: string) {
  if (digits.startsWith("971")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function getUaePhoneLocalPart(value: string) {
  return stripUaeCountryPrefix(digitsOnly(value));
}

export function getUaePhoneDisplayPart(value: string) {
  const localPart = getUaePhoneLocalPart(value);
  return localPart ? `0${localPart}` : "";
}

export function normalizeUaePhoneInput(value: string) {
  const digits = stripUaeCountryPrefix(digitsOnly(value));
  if (!digits) return UAE_COUNTRY_CODE;
  return `${UAE_COUNTRY_CODE}${digits.slice(0, 9)}`;
}

export function isValidUaePhone(value: string, type?: UaePhoneType) {
  const nationalNumber = stripUaeCountryPrefix(digitsOnly(value));
  if (!nationalNumber) return false;

  const isMobile = /^5\d{8}$/.test(nationalNumber);
  const isLandline = /^[236479]\d{7}$/.test(nationalNumber);
  if (type === "mobile") return isMobile;
  if (type === "landline") return isLandline;
  return isMobile || isLandline;
}

export function inferUaePhoneType(value: string): UaePhoneType {
  return isValidUaePhone(value, "mobile") ? "mobile" : "landline";
}

function hasMeaningfulUaePhone(value: string) {
  const normalized = normalizeUaePhoneInput(value);
  return normalized !== UAE_COUNTRY_CODE;
}

export function normalizeShopId(value: string) {
  return value.trim();
}

export function normalizeEcomSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function slugFromShopId(shopId: string) {
  return normalizeEcomSlug(shopId);
}

export function parseUserId(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < SHOP_USER_ID_MIN || n > SHOP_USER_ID_MAX) {
    return null;
  }
  return n;
}

export function validateCreateShopField(
  field: keyof CreateShopFormValues,
  form: CreateShopFormValues,
): string | null {
  const value = form[field];

  switch (field) {
    case "shop_name": {
      const name = String(value).trim();
      if (!name) return "Shop name is required";
      if (name.length > 200) return "Shop name must be at most 200 characters";
      return null;
    }
    case "shop_id": {
      const id = normalizeShopId(String(value));
      if (!id) return "Shop ID is required";
      if (id.length < 3 || id.length > 50) {
        return "Shop ID must be 3–50 characters";
      }
      if (!SHOP_ID_RE.test(id)) {
        return "Use letters, numbers, _ or - only (must start with letter/number)";
      }
      return null;
    }
    case "user_id": {
      if (!String(value).trim()) return "Shop login ID (user_id) is required";
      if (parseUserId(String(value)) == null) {
        return "Must be a 6-digit number between 100000 and 999999";
      }
      return null;
    }
    case "password": {
      const password = String(value);
      if (!password) return "Password is required";
      if (password.length < 8 || password.length > 128) {
        return "Password must be 8–128 characters";
      }
      return null;
    }
    case "phone": {
      const raw = String(value).trim();
      if (!raw || raw === UAE_COUNTRY_CODE) return null;
      if (!isValidUaePhone(raw, form.phone_type)) {
        return form.phone_type === "landline"
          ? "Enter a valid UAE landline number"
          : "Enter a valid UAE mobile number";
      }
      return null;
    }
    case "email": {
      const email = String(value).trim();
      if (!email) return null;
      if (email.length > 254 || !EMAIL_RE.test(email)) {
        return "Enter a valid email address";
      }
      return null;
    }
    case "ecom_slug": {
      const slug = String(value).trim();
      if (!slug) return null;
      if (!ECOM_SLUG_RE.test(slug)) {
        return "Slug must be lowercase letters, numbers, and hyphens";
      }
      if (slug.length > 80) return "Slug must be at most 80 characters";
      return null;
    }
    case "ecom_order_confirmation_enabled":
    case "customer_ticket": {
      if (value === true && !form.ecom_enabled) {
        return "Requires ecom to be enabled";
      }
      return null;
    }
    case "latitude": {
      const raw = String(value).trim();
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < -90 || n > 90) {
        return "Latitude must be between -90 and 90";
      }
      return null;
    }
    case "longitude": {
      const raw = String(value).trim();
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < -180 || n > 180) {
        return "Longitude must be between -180 and 180";
      }
      return null;
    }
    case "contact_number": {
      const raw = String(value).trim();
      if (!raw || raw === UAE_COUNTRY_CODE) return null;
      if (!isValidUaePhone(raw, form.contact_number_type)) {
        return form.contact_number_type === "landline"
          ? "Enter a valid UAE landline number"
          : "Enter a valid UAE mobile number";
      }
      return null;
    }
    case "address_line_1":
    case "address_line_2":
    case "locality":
    case "city": {
      const text = String(value).trim();
      if (text.length > 200) return "Must be at most 200 characters";
      return null;
    }
    default:
      return null;
  }
}

export function validateCreateShopForm(
  form: CreateShopFormValues,
): FieldErrors {
  const fields: Array<keyof CreateShopFormValues> = [
    "shop_name",
    "shop_id",
    "user_id",
    "password",
    "phone_type",
    "phone",
    "email",
    "ecom_slug",
    "ecom_order_confirmation_enabled",
    "customer_ticket",
    "address_line_1",
    "address_line_2",
    "locality",
    "city",
    "contact_number_type",
    "latitude",
    "longitude",
    "contact_number",
  ];
  const errors: FieldErrors = {};
  for (const field of fields) {
    const message = validateCreateShopField(field, form);
    if (message) errors[field] = message;
  }
  return errors;
}

export function isCreateShopFormValid(form: CreateShopFormValues) {
  return Object.keys(validateCreateShopForm(form)).length === 0;
}

export type ShopCreateWizardStep = 0 | 1 | 2 | 3;

export const SHOP_CREATE_STEP_FIELDS: Record<
  ShopCreateWizardStep,
  Array<keyof CreateShopFormValues>
> = {
  0: [
    "shop_name",
    "shop_id",
    "user_id",
    "password",
    "phone_type",
    "phone",
    "email",
    "ecom_slug",
  ],
  1: [
    "address_line_1",
    "address_line_2",
    "locality",
    "city",
    "contact_number_type",
    "latitude",
    "longitude",
    "contact_number",
  ],
  2: [
    "ecom_order_confirmation_enabled",
    "customer_ticket",
  ],
  3: [],
};

export function validateCreateShopStep(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of SHOP_CREATE_STEP_FIELDS[step]) {
    const message = validateCreateShopField(field, form);
    if (message) errors[field] = message;
  }
  return errors;
}

export function isCreateShopStepValid(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
) {
  return Object.keys(validateCreateShopStep(step, form)).length === 0;
}

function buildAddress(form: CreateShopFormValues): ShopAddress | undefined {
  const address_line_1 = form.address_line_1.trim() || undefined;
  const address_line_2 = form.address_line_2.trim() || undefined;
  const locality = form.locality.trim() || undefined;
  const city = form.city.trim() || undefined;
  const contact_number = hasMeaningfulUaePhone(form.contact_number)
    ? normalizeUaePhoneInput(form.contact_number)
    : undefined;
  const latitudeRaw = form.latitude.trim();
  const longitudeRaw = form.longitude.trim();
  const latitude = latitudeRaw ? Number(latitudeRaw) : undefined;
  const longitude = longitudeRaw ? Number(longitudeRaw) : undefined;

  const address: ShopAddress = {};
  if (address_line_1) address.address_line_1 = address_line_1;
  if (address_line_2) address.address_line_2 = address_line_2;
  if (locality) address.locality = locality;
  if (city) address.city = city;
  if (contact_number) address.contact_number = contact_number;
  if (latitude != null && Number.isFinite(latitude)) address.latitude = latitude;
  if (longitude != null && Number.isFinite(longitude)) {
    address.longitude = longitude;
  }

  return Object.keys(address).length > 0 ? address : undefined;
}

/** Fields allowed on POST /v2/shops (see admin-api Postman contract). */
export function buildCreateShopPayload(
  form: CreateShopFormValues,
): CreateShopInput {
  const user_id = parseUserId(form.user_id);
  if (user_id == null) {
    throw new Error("Invalid user_id");
  }

  const shop_id = normalizeShopId(form.shop_id);
  const payload: CreateShopInput = {
    shop_name: form.shop_name.trim(),
    shop_id,
    password: form.password,
    user_id,
    ecom_enabled: form.ecom_enabled,
  };

  const phone = hasMeaningfulUaePhone(form.phone)
    ? normalizeUaePhoneInput(form.phone)
    : "";
  if (phone) payload.phone = phone;

  const email = form.email.trim();
  if (email) payload.email = email;

  const slug = form.ecom_slug.trim()
    ? normalizeEcomSlug(form.ecom_slug)
    : slugFromShopId(shop_id);
  if (slug) payload.ecom_slug = slug;

  const address = buildAddress(form);
  if (address) payload.address = address;

  return payload;
}

/** Feature flags applied via PATCH after create (not accepted on POST /v2/shops). */
export function buildShopFeaturePatchPayload(form: CreateShopFormValues) {
  const ecom_enabled = form.ecom_enabled;
  return {
    ecom_enabled,
    ecom_order_confirmation_enabled: ecom_enabled
      ? form.ecom_order_confirmation_enabled
      : false,
    scheduled_order: form.scheduled_order,
    merge_order: form.merge_order,
    return_option: form.return_option,
    customer_ticket: ecom_enabled ? form.customer_ticket : false,
  };
}

/** Map Nest/Zod API error body onto form field keys. */
export function mapApiErrorsToFields(err: {
  message?: string;
  body?: unknown;
}): FieldErrors {
  const errors: FieldErrors = {};
  const body = err.body;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : "";
    const field = typeof record.field === "string" ? record.field : "";

    if (code === "shop_exists" || field === "shop_id") {
      errors.shop_id = err.message || "Shop ID already exists";
    } else if (code === "user_id_taken" || field === "user_id") {
      errors.user_id = err.message || "User ID already taken";
    } else if (code === "ecom_slug_taken" || field === "ecom_slug") {
      errors.ecom_slug = err.message || "Ecom slug already taken";
    } else if (code === "shop_license_taken" || field === "shop_license_no") {
      errors.form = err.message || "Shop license already taken";
    }

    if (Array.isArray(record.errors)) {
      for (const issue of record.errors) {
        if (!issue || typeof issue !== "object") continue;
        const row = issue as Record<string, unknown>;
        const path = typeof row.path === "string" ? row.path : "";
        const msg = typeof row.message === "string" ? row.message : "";
        if (!path || !msg) continue;
        const key = path.split(".")[0];
        if (key === "address") {
          const nested = path.split(".")[1] as CreateShopField | undefined;
          if (nested) errors[nested] = msg;
          else errors.address_line_1 = msg;
        } else {
          errors[key as CreateShopField] = msg;
        }
      }
    }
  }

  if (Object.keys(errors).length === 0 && err.message) {
    errors.form = err.message;
  }
  return errors;
}
