import type { CreateShopFormValues } from "@/lib/shop-create-validation";

const DRAFT_KEY = "yaadro:shop-create-draft";
const DRAFT_VERSION = 1;

export type ShopCreateWizardStep = 0 | 1 | 2 | 3;

export type ShopCreateDraftMeta = {
  currentStep: ShopCreateWizardStep;
  shopIdEdited: boolean;
  slugEdited: boolean;
  shopIdUniquePart: string;
};

export type ShopCreateDraft = {
  version: number;
  savedAt: string;
  form: Omit<CreateShopFormValues, "password">;
  meta: ShopCreateDraftMeta;
};

export const INITIAL_CREATE_SHOP_FORM: CreateShopFormValues = {
  shop_name: "",
  shop_id: "",
  password: "",
  user_id: "",
  phone_type: "mobile",
  phone: "+971",
  email: "",
  ecom_slug: "",
  ecom_enabled: true,
  ecom_order_confirmation_enabled: false,
  scheduled_order: false,
  merge_order: false,
  return_option: false,
  customer_ticket: false,
  address_line_1: "",
  address_line_2: "",
  locality: "",
  city: "",
  contact_number_type: "landline",
  latitude: "",
  longitude: "",
  contact_number: "+971",
};

export function createShopIdUniquePart() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function loadShopCreateDraft(): ShopCreateDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ShopCreateDraft>;
    if (parsed.version !== DRAFT_VERSION || !parsed.form || !parsed.meta) {
      return null;
    }

    const { password: _password, ...initialWithoutPassword } =
      INITIAL_CREATE_SHOP_FORM;

    return {
      version: DRAFT_VERSION,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
      form: {
        ...initialWithoutPassword,
        ...parsed.form,
      },
      meta: {
        currentStep: parsed.meta.currentStep ?? 0,
        shopIdEdited: Boolean(parsed.meta.shopIdEdited),
        slugEdited: Boolean(parsed.meta.slugEdited),
        shopIdUniquePart:
          parsed.meta.shopIdUniquePart || createShopIdUniquePart(),
      },
    };
  } catch {
    return null;
  }
}

export function saveShopCreateDraft(
  form: CreateShopFormValues,
  meta: ShopCreateDraftMeta,
) {
  if (typeof window === "undefined") return;

  const { password: _password, ...rest } = form;
  const draft: ShopCreateDraft = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    form: rest,
    meta,
  };

  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearShopCreateDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}
