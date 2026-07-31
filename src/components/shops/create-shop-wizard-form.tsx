"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { CreateShopFlowDialog, type CreateShopFlowPhase } from "@/components/shops/create-shop-flow-dialog";
import { ShopPhotoDropzone } from "@/components/shops/shop-photo-dropzone";
import {
  ShopLocationPicker,
  type ShopLocationPickerValue,
} from "@/components/shops/shop-location-picker";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepProgress } from "@/components/ui/step-progress";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  createShop,
  isShopIdAvailable,
  patchShopPhoto,
  suggestNextShopUserId,
} from "@/lib/api/shops";
import {
  clearShopCreateDraft,
  createShopIdUniquePart,
  INITIAL_CREATE_SHOP_FORM,
  loadShopCreateDraft,
  saveShopCreateDraft,
  type ShopCreateWizardStep,
} from "@/lib/shop-create-draft";
import {
  buildCreateShopPayload,
  getUaePhoneDisplayPart,
  isCreateShopFormValid,
  mapApiErrorsToFields,
  normalizeEcomSlug,
  normalizeShopId,
  normalizeUaePhoneInput,
  slugFromShopId,
  validateCreateShopField,
  validateCreateShopForm,
  UAE_COUNTRY_CODE,
  type CreateShopFormValues,
  type FieldErrors,
} from "@/lib/shop-create-validation";
import {
  revokeShopPhotoPreview,
  type ShopPhotoSelection,
} from "@/lib/shop-photo";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: 0,
    title: "Basics",
    description: "Name, login, and contact details",
  },
  {
    id: 1,
    title: "Address",
    description: "Pin the shop on the map",
  },
  {
    id: 2,
    title: "Features",
    description: "Choose what this shop can do",
  },
  {
    id: 3,
    title: "Review",
    description: "Confirm and create",
  },
] as const;

function formatShopIdDatePart(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function shopIdFromName(name: string, uniquePart: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const datePart = formatShopIdDatePart(new Date());
  const suffix = `${datePart}_${uniquePart}`;
  const maxBaseLength = Math.max(0, 50 - suffix.length - 1);
  const trimmedBase = base.slice(0, maxBaseLength);
  return trimmedBase ? `${trimmedBase}_${suffix}` : suffix;
}

function FormFieldsGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-12",
        className,
      )}
    >
      {children}
    </div>
  );
}

function WizardSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("w-full min-w-0", className)}>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  meta,
  action,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const showFooter = Boolean(hint || error || meta || action);

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
      {showFooter ? (
        <div className="flex min-h-5 items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : hint ? (
              <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
            {meta}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function FeatureToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  error,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  error?: string | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 border-b border-border/60 py-3.5 last:border-b-0",
        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-muted/30",
        error && "border-destructive/40",
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
        {error ? (
          <span className="mt-1 block text-xs text-destructive">{error}</span>
        ) : null}
      </span>
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">
        {value || <span className="font-normal text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function isUserIdTakenError(err: unknown) {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  const body = err.body as { code?: string; field?: string } | null;
  if (body?.code === "user_id_taken" || body?.field === "user_id") return true;
  return /user_id/i.test(err.message);
}

function toLocationValue(form: CreateShopFormValues): ShopLocationPickerValue {
  return {
    address_line_1: form.address_line_1,
    address_line_2: form.address_line_2,
    locality: form.locality,
    city: form.city,
    contact_number_type: form.contact_number_type,
    contact_number: form.contact_number,
    latitude: form.latitude,
    longitude: form.longitude,
  };
}

const STEP_FIELDS: Record<
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
  2: ["ecom_order_confirmation_enabled", "customer_ticket"],
  3: [],
};

function validateWizardStep(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of STEP_FIELDS[step]) {
    const message = validateCreateShopField(field, form);
    if (message) errors[field] = message;
  }
  return errors;
}

function isWizardStepValid(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
) {
  return Object.keys(validateWizardStep(step, form)).length === 0;
}

export function CreateShopWizard() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState<ShopCreateWizardStep>(0);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [checkingShopId, setCheckingShopId] = useState(false);
  const [form, setForm] = useState<CreateShopFormValues>(INITIAL_CREATE_SHOP_FORM);
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [userIdHint, setUserIdHint] = useState<string | null>(null);
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [createPhase, setCreatePhase] = useState<CreateShopFlowPhase>("confirm");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);
  const [shopPhoto, setShopPhoto] = useState<ShopPhotoSelection | null>(null);
  const [shopIdStatus, setShopIdStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const shopIdCheckRef = useRef(0);
  const slugEditedRef = useRef(false);
  const shopIdEditedRef = useRef(false);
  const shopIdUniquePartRef = useRef(createShopIdUniquePart());
  const backgroundModeRef = useRef(false);
  const createInFlightRef = useRef(false);
  const slowTimerRef = useRef<number | null>(null);

  const liveErrors = useMemo(() => validateCreateShopForm(form), [form]);
  const canSubmit =
    isCreateShopFormValid(form) &&
    shopIdStatus !== "taken" &&
    shopIdStatus !== "checking" &&
    !suggesting;

  useEffect(() => {
    const draft = loadShopCreateDraft();
    if (draft) {
      setForm((prev) => ({ ...prev, ...draft.form, password: "" }));
      setCurrentStep(draft.meta.currentStep);
      slugEditedRef.current = draft.meta.slugEdited;
      shopIdEditedRef.current = draft.meta.shopIdEdited;
      shopIdUniquePartRef.current = draft.meta.shopIdUniquePart;
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveShopCreateDraft(form, {
      currentStep,
      shopIdEdited: shopIdEditedRef.current,
      slugEdited: slugEditedRef.current,
      shopIdUniquePart: shopIdUniquePartRef.current,
    });
  }, [form, currentStep, hydrated]);

  function showError(field: keyof CreateShopFormValues) {
    if (!touched[field] && !fieldErrors[field]) return null;
    return fieldErrors[field] ?? liveErrors[field] ?? null;
  }

  function markTouched(field: keyof CreateShopFormValues) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function setFieldError(field: keyof CreateShopFormValues, message: string | null) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function update<K extends keyof CreateShopFormValues>(
    key: K,
    value: CreateShopFormValues[K],
  ) {
    setFormError(null);
    if (key === "user_id") setUserIdHint(null);
    if (key === "ecom_slug") slugEditedRef.current = true;
    if (key === "shop_id") shopIdEditedRef.current = true;

    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "ecom_enabled" && value === false) {
        next.ecom_order_confirmation_enabled = false;
        next.customer_ticket = false;
      }
      if (key === "shop_name" && !shopIdEditedRef.current) {
        const generated = shopIdFromName(
          String(value),
          shopIdUniquePartRef.current,
        );
        next.shop_id = generated;
        if (!slugEditedRef.current) {
          next.ecom_slug = slugFromShopId(generated);
        }
      }
      if (key === "shop_id" && !slugEditedRef.current) {
        next.ecom_slug = slugFromShopId(String(value));
      }
      return next;
    });

    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  function updateLocation(value: ShopLocationPickerValue) {
    setForm((prev) => ({
      ...prev,
      address_line_1: value.address_line_1,
      address_line_2: value.address_line_2,
      locality: value.locality,
      city: value.city,
      contact_number_type: value.contact_number_type,
      contact_number: value.contact_number,
      latitude: value.latitude,
      longitude: value.longitude,
    }));
    setFormError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of [
        "address_line_1",
        "address_line_2",
        "locality",
        "city",
        "contact_number_type",
        "contact_number",
        "latitude",
        "longitude",
      ] as const) {
        delete next[key];
      }
      delete next.form;
      return next;
    });
  }

  async function fillNextUserId(opts?: { silent?: boolean }) {
    setSuggesting(true);
    if (!opts?.silent) setFormError(null);
    try {
      const next = await suggestNextShopUserId();
      setForm((prev) => ({ ...prev, user_id: String(next) }));
      setTouched((prev) => ({ ...prev, user_id: true }));
      setFieldError("user_id", null);
      setUserIdHint(`Suggested next free login ID: ${next}`);
      return next;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not suggest user ID";
      if (!opts?.silent) setFormError(message);
      setForm((prev) =>
        prev.user_id ? prev : { ...prev, user_id: "100000" },
      );
      setUserIdHint(null);
      return null;
    } finally {
      setSuggesting(false);
    }
  }

  useEffect(() => {
    if (!hydrated || form.user_id) return;
    void fillNextUserId({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, form.user_id]);

  useEffect(() => {
    const shopId = normalizeShopId(form.shop_id);
    const formatError = validateCreateShopField("shop_id", form);
    if (!shopId || formatError) {
      setShopIdStatus("idle");
      setCheckingShopId(false);
      return;
    }

    const checkId = ++shopIdCheckRef.current;
    setShopIdStatus("checking");
    setCheckingShopId(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const available = await isShopIdAvailable(shopId);
          if (checkId !== shopIdCheckRef.current) return;
          if (available) {
            setShopIdStatus("available");
            setFieldError("shop_id", null);
          } else {
            setShopIdStatus("taken");
            setFieldError("shop_id", "Shop ID already exists");
          }
        } catch {
          if (checkId !== shopIdCheckRef.current) return;
          setShopIdStatus("error");
        } finally {
          if (checkId === shopIdCheckRef.current) setCheckingShopId(false);
        }
      })();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.shop_id]);

  function validateStep(step: ShopCreateWizardStep) {
    const errors = validateWizardStep(step, form);
    if (step === 0 && shopIdStatus === "taken") {
      errors.shop_id = "Shop ID already exists";
    }
    return errors;
  }

  function markStepTouched(step: ShopCreateWizardStep) {
    const fields = [
      "shop_name",
      "shop_id",
      "user_id",
      "password",
      "phone_type",
      "phone",
      "email",
      "ecom_slug",
      "address_line_1",
      "address_line_2",
      "locality",
      "city",
      "contact_number_type",
      "latitude",
      "longitude",
      "contact_number",
      "ecom_order_confirmation_enabled",
      "customer_ticket",
    ] as const;

    const stepFields: Record<ShopCreateWizardStep, readonly string[]> = {
      0: [
        "shop_name",
        "shop_id",
        "user_id",
        "password",
        "phone",
        "email",
        "ecom_slug",
      ],
      1: [
        "address_line_1",
        "address_line_2",
        "locality",
        "city",
        "latitude",
        "longitude",
        "contact_number",
      ],
      2: ["ecom_order_confirmation_enabled", "customer_ticket"],
      3: fields,
    };

    setTouched((prev) => {
      const next = { ...prev };
      for (const field of stepFields[step]) {
        next[field] = true;
      }
      return next;
    });
  }

  function goNext() {
    setFormError(null);
    markStepTouched(currentStep);
    const errors = validateStep(currentStep);
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    if (Object.keys(errors).length > 0 || shopIdStatus === "checking") {
      setFormError("Fix the highlighted fields before continuing.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3) as ShopCreateWizardStep);
  }

  function goBack() {
    setFormError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0) as ShopCreateWizardStep);
  }

  function handleCancel() {
    revokeShopPhotoPreview(shopPhoto);
    clearShopCreateDraft();
    router.push("/shops");
  }

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      revokeShopPhotoPreview(shopPhoto);
    };
  }, [shopPhoto]);

  function handleShopPhotoChange(next: ShopPhotoSelection | null) {
    revokeShopPhotoPreview(shopPhoto);
    setShopPhoto(next);
  }

  function validateForCreate() {
    setFormError(null);
    markStepTouched(3);

    const errors = validateCreateShopForm(form);
    if (shopIdStatus === "taken") {
      errors.shop_id = "Shop ID already exists";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || shopIdStatus === "checking") {
      setFormError("Fix the highlighted fields before creating the shop.");
      return false;
    }
    return true;
  }

  function openCreateConfirm() {
    if (!validateForCreate()) return;
    setCreateError(null);
    setCreatedShopId(null);
    backgroundModeRef.current = false;
    setCreatePhase("confirm");
    setCreateFlowOpen(true);
  }

  function handleRunInBackground() {
    backgroundModeRef.current = true;
    setCreateFlowOpen(false);
    appToast.info("Creating shop in the background…");
  }

  function handleViewCreatedShop() {
    const id = createdShopId;
    setCreateFlowOpen(false);
    if (id) router.push(`/shops/${encodeURIComponent(id)}`);
  }

  function handleCreateFlowOpenChange(open: boolean) {
    if (!open && (createPhase === "creating" || createPhase === "slow")) return;
    setCreateFlowOpen(open);
    if (!open && createPhase === "confirm") {
      setCreateError(null);
    }
  }

  async function handleCreateApiError(err: unknown) {
    if (isUserIdTakenError(err)) {
      const taken = form.user_id;
      const next = await fillNextUserId({ silent: true });
      setFieldErrors({
        user_id:
          next != null
            ? `User ID ${taken} is taken. Suggested ${next} — submit again.`
            : err instanceof ApiError
              ? err.message
              : "User ID already taken",
      });
      const msg = "User ID conflict — review the suggested ID and retry.";
      setFormError(msg);
      setCurrentStep(0);
      return msg;
    }

    if (err instanceof ApiError) {
      const mapped = mapApiErrorsToFields({
        message: err.message,
        body: err.body,
      });
      setFieldErrors(mapped);
      const msg = mapped.form ?? err.message;
      setFormError(msg);
      if (mapped.shop_id) {
        setShopIdStatus("taken");
        setCurrentStep(0);
      }
      return msg;
    }

    const msg = err instanceof Error ? err.message : "Failed to create shop";
    setFormError(msg);
    return msg;
  }

  async function executeCreate() {
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setCreatePhase("creating");
    setLoading(true);

    slowTimerRef.current = window.setTimeout(() => {
      if (!backgroundModeRef.current) {
        setCreatePhase((prev) => (prev === "creating" ? "slow" : prev));
      }
    }, 5000);

    try {
      const payload = buildCreateShopPayload(form);

      try {
        const available = await isShopIdAvailable(payload.shop_id);
        if (!available) {
          setShopIdStatus("taken");
          setFieldErrors({ shop_id: "Shop ID already exists" });
          const msg = "Shop ID already exists — choose another.";
          setFormError(msg);
          setCurrentStep(0);
          if (backgroundModeRef.current) {
            appToast.error(msg);
          } else {
            setCreateError(msg);
            setCreatePhase("error");
            setCreateFlowOpen(true);
          }
          return;
        }
      } catch {
        // Proceed — server will still enforce uniqueness
      }

      const shop = await createShop(payload);
      const id = String(shop?.shop_id || payload.shop_id);

      if (shopPhoto) {
        try {
          await patchShopPhoto(id, {
            photo_base64: shopPhoto.base64,
            photo_content_type: shopPhoto.contentType,
          });
        } catch (photoErr) {
          const photoMsg =
            photoErr instanceof ApiError
              ? photoErr.message
              : "Shop created, but profile photo could not be uploaded.";
          appToast.error(photoMsg);
        }
      }

      revokeShopPhotoPreview(shopPhoto);
      setShopPhoto(null);
      clearShopCreateDraft();
      setCreatedShopId(id);
      appToast.success(
        `Shop "${form.shop_name || id}" created successfully.`,
      );

      if (backgroundModeRef.current) {
        setCreateFlowOpen(false);
        router.push(`/shops/${encodeURIComponent(id)}`);
      } else {
        setCreatePhase("success");
        setCreateFlowOpen(true);
      }
    } catch (err) {
      const msg = await handleCreateApiError(err);
      if (backgroundModeRef.current) {
        appToast.error(msg);
      } else {
        setCreateError(msg);
        setCreatePhase("error");
        setCreateFlowOpen(true);
      }
    } finally {
      if (slowTimerRef.current) {
        window.clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setLoading(false);
      createInFlightRef.current = false;
    }
  }

  function handleCreateConfirm() {
    void executeCreate();
  }

  function handleRetryCreate() {
    setCreateError(null);
    setCreatePhase("confirm");
  }

  const featureLabels: Array<{ key: keyof CreateShopFormValues; label: string }> = [
    { key: "ecom_enabled", label: "Ecom enabled" },
    {
      key: "ecom_order_confirmation_enabled",
      label: "Ecom order confirmation",
    },
    { key: "scheduled_order", label: "Scheduled orders" },
    { key: "merge_order", label: "Merge orders" },
    { key: "return_option", label: "Return option" },
    { key: "customer_ticket", label: "Customer tickets" },
  ];

  const activeStep = STEPS[currentStep];

  const stepProgressItems = useMemo(
    () =>
      STEPS.map((step) => ({
        id: String(step.id),
        label: step.title,
        description: step.description,
      })),
    [],
  );

  return (
    <PageShell className="w-full max-w-none">
      <TopBarSlot>
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </TopBarSlot>

      <div className="mb-8 w-full">
        <h1 className="text-2xl font-semibold tracking-tight">Create shop</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {activeStep.description}. Progress is saved automatically.
        </p>
      </div>

      <StepProgress
        className="mb-10"
        steps={stepProgressItems}
        currentStep={currentStep}
        progress={1}
        orientation="horizontal"
        onStepClick={(index) => {
          if (index < currentStep) {
            setFormError(null);
            setCurrentStep(index as ShopCreateWizardStep);
          }
        }}
      />

      <form
        id="create-shop-form"
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="w-full max-w-none space-y-10 pb-28"
      >
        {currentStep === 0 ? (
          <div className="w-full space-y-12">
            <WizardSection
              title="Profile photo"
              description="Optional logo or storefront image shown on the shop profile."
            >
              <div className="max-w-xl">
                <ShopPhotoDropzone
                  value={shopPhoto}
                  onChange={handleShopPhotoChange}
                  disabled={loading}
                />
              </div>
            </WizardSection>

            <WizardSection
              title="Account"
              description="Login credentials for the shop owner."
            >
              <FormFieldsGrid>
                <FormField
                  label="Shop name"
                  htmlFor="shop_name"
                  required
                  error={showError("shop_name")}
                  className="sm:col-span-2 xl:col-span-12"
                >
                  <Input
                    id="shop_name"
                    value={form.shop_name}
                    aria-invalid={Boolean(showError("shop_name"))}
                    onBlur={() => markTouched("shop_name")}
                    onChange={(e) => update("shop_name", e.target.value)}
                    placeholder="Marina Cafe"
                  />
                </FormField>

                <FormField
                  label="Shop ID"
                  htmlFor="shop_id"
                  required
                  hint="Auto-built from name + date + unique code."
                  error={showError("shop_id")}
                  meta={
                    <>
                      {checkingShopId ? (
                        <p className="text-xs text-muted-foreground">
                          Checking availability…
                        </p>
                      ) : null}
                      {shopIdStatus === "available" && !showError("shop_id") ? (
                        <p className="text-xs text-emerald-700">
                          Shop ID is available
                        </p>
                      ) : null}
                    </>
                  }
                  className="xl:col-span-6"
                >
                  <Input
                    id="shop_id"
                    value={form.shop_id}
                    aria-invalid={Boolean(showError("shop_id"))}
                    className="font-mono text-xs"
                    onBlur={() => {
                      markTouched("shop_id");
                      update("shop_id", normalizeShopId(form.shop_id));
                    }}
                    onChange={(e) => update("shop_id", e.target.value)}
                    placeholder="MARINA_CAFE_20260727_A1B2"
                  />
                </FormField>

                <FormField
                  label="Login ID"
                  htmlFor="user_id"
                  required
                  hint={
                    userIdHint && !showError("user_id")
                      ? userIdHint
                      : "6-digit shop login ID."
                  }
                  error={showError("user_id")}
                  action={
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      disabled={suggesting || loading}
                      onClick={() => void fillNextUserId()}
                    >
                      {suggesting ? "Suggesting…" : "Next ID"}
                    </Button>
                  }
                  className="xl:col-span-6"
                >
                  <Input
                    id="user_id"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={form.user_id}
                    aria-invalid={Boolean(showError("user_id"))}
                    className="font-mono text-xs"
                    onBlur={() => markTouched("user_id")}
                    onChange={(e) =>
                      update(
                        "user_id",
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="100000"
                  />
                </FormField>

                <FormField
                  label="Password"
                  htmlFor="password"
                  required
                  hint="Not saved locally. Copy it before you leave."
                  error={showError("password")}
                  className="sm:col-span-2 xl:col-span-8"
                >
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      aria-invalid={Boolean(showError("password"))}
                      className="min-w-0 flex-1"
                      onBlur={() => markTouched("password")}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Min 8 characters"
                    />
                    <CopyButton
                      value={form.password}
                      disabled={!form.password}
                      className="shrink-0"
                    />
                  </div>
                </FormField>
              </FormFieldsGrid>
            </WizardSection>

            <WizardSection
              title="Contact"
              description="Optional details for ops and ecommerce."
            >
              <FormFieldsGrid>
                <FormField
                  label="Phone"
                  htmlFor="phone"
                  hint={
                    form.phone_type === "landline"
                      ? "UAE landline number. Starts with +971."
                      : "UAE mobile number. Starts with +971."
                  }
                  error={showError("phone")}
                  className="xl:col-span-4"
                >
                  <div className="flex gap-2">
                    <Select
                      value={form.phone_type}
                      onValueChange={(value) =>
                        update("phone_type", value as CreateShopFormValues["phone_type"])
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile">Mobile (+971)</SelectItem>
                        <SelectItem value="landline">Landline</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                      <div className="flex items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground">
                        {UAE_COUNTRY_CODE}
                      </div>
                      <Input
                        id="phone"
                        value={getUaePhoneDisplayPart(form.phone)}
                        aria-invalid={Boolean(showError("phone"))}
                        className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
                        onBlur={() => {
                          markTouched("phone");
                          if (form.phone.trim()) {
                            update("phone", normalizeUaePhoneInput(form.phone));
                          }
                        }}
                        onChange={(e) =>
                          update("phone", normalizeUaePhoneInput(e.target.value))
                        }
                        placeholder={
                          form.phone_type === "landline" ? "042345678" : "0501234567"
                        }
                      />
                    </div>
                  </div>
                </FormField>

                <FormField
                  label="Email"
                  htmlFor="email"
                  error={showError("email")}
                  className="xl:col-span-4"
                >
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    aria-invalid={Boolean(showError("email"))}
                    onBlur={() => markTouched("email")}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="ops@marina.ae"
                  />
                </FormField>

                <FormField
                  label="Ecom slug"
                  htmlFor="ecom_slug"
                  hint="Defaults from shop ID if left empty."
                  error={showError("ecom_slug")}
                  className="sm:col-span-2 xl:col-span-6"
                >
                  <Input
                    id="ecom_slug"
                    value={form.ecom_slug}
                    aria-invalid={Boolean(showError("ecom_slug"))}
                    className="font-mono text-xs"
                    onBlur={() => {
                      markTouched("ecom_slug");
                      if (form.ecom_slug.trim()) {
                        update("ecom_slug", normalizeEcomSlug(form.ecom_slug));
                      }
                    }}
                    onChange={(e) => update("ecom_slug", e.target.value)}
                    placeholder="marina-cafe"
                  />
                </FormField>
              </FormFieldsGrid>
            </WizardSection>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <WizardSection
            title="Shop location"
            description="Optional. Search a place, drag the pin, or enter the address manually."
            action={
              <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                Skip anytime
              </span>
            }
          >
            <ShopLocationPicker
              value={toLocationValue(form)}
              onChange={updateLocation}
              onFieldBlur={(field) => markTouched(field)}
              fieldErrors={{
                address_line_1: showError("address_line_1"),
                locality: showError("locality"),
                city: showError("city"),
                latitude: showError("latitude"),
                longitude: showError("longitude"),
                contact_number: showError("contact_number"),
              }}
            />
          </WizardSection>
        ) : null}

        {currentStep === 2 ? (
          <WizardSection
            title="Feature flags"
            description="You can change these later from the shop profile."
          >
            <div className="w-full rounded-xl border bg-card px-4">
              <FeatureToggleRow
                id="ecom_enabled"
                label="Ecom enabled"
                description="Master switch for online ecommerce."
                checked={form.ecom_enabled}
                onChange={(v) => update("ecom_enabled", v)}
              />
              <FeatureToggleRow
                id="ecom_order_confirmation_enabled"
                label="Ecom order confirmation"
                description="Shop must accept/reject online orders. Requires ecom."
                checked={form.ecom_order_confirmation_enabled}
                disabled={!form.ecom_enabled}
                error={showError("ecom_order_confirmation_enabled")}
                onChange={(v) => update("ecom_order_confirmation_enabled", v)}
              />
              <FeatureToggleRow
                id="scheduled_order"
                label="Scheduled orders"
                description="Enables scheduled-order APIs in the shop DMS."
                checked={form.scheduled_order}
                onChange={(v) => update("scheduled_order", v)}
              />
              <FeatureToggleRow
                id="merge_order"
                label="Merge orders"
                description="Enables order merge and customer credit in the shop DMS."
                checked={form.merge_order}
                onChange={(v) => update("merge_order", v)}
              />
              <FeatureToggleRow
                id="return_option"
                label="Return option"
                description="Allow returns for this shop."
                checked={form.return_option}
                onChange={(v) => update("return_option", v)}
              />
              <FeatureToggleRow
                id="customer_ticket"
                label="Customer tickets"
                description="Customer support tickets. Requires ecom."
                checked={form.customer_ticket}
                disabled={!form.ecom_enabled}
                error={showError("customer_ticket")}
                onChange={(v) => update("customer_ticket", v)}
              />
            </div>
          </WizardSection>
        ) : null}

        {currentStep === 3 ? (
          <div className="grid w-full gap-10 xl:grid-cols-2">
            <WizardSection title="Summary" description="Review before creating the shop.">
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-4 flex items-start gap-4 border-b pb-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-full border bg-muted">
                    {shopPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={shopPhoto.previewUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <span className="text-xs">No photo</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{form.shop_name || "Untitled shop"}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {form.shop_id || "—"}
                    </p>
                  </div>
                </div>
                <dl>
                  <PreviewRow label="Login ID" value={form.user_id} />
                  <PreviewRow label="Phone" value={form.phone} />
                  <PreviewRow label="Email" value={form.email} />
                  <PreviewRow label="Ecom slug" value={form.ecom_slug} />
                  <PreviewRow
                    label="Address"
                    value={[
                      form.address_line_1,
                      form.address_line_2,
                      form.locality,
                      form.city,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <PreviewRow
                    label="Coordinates"
                    value={
                      form.latitude && form.longitude
                        ? `${form.latitude}, ${form.longitude}`
                        : ""
                    }
                  />
                  <PreviewRow label="Contact" value={form.contact_number} />
                </dl>
              </div>
            </WizardSection>

            <WizardSection title="Enabled features">
              <div className="flex flex-wrap gap-2">
                {featureLabels.map((item) => {
                  const on = Boolean(form[item.key]);
                  return (
                    <span
                      key={item.key}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        on
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Creating will provision this shop with the login ID and password.
                Make sure the password is copied first.
              </p>
            </WizardSection>
          </div>
        ) : null}

        {formError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}
      </form>

      <div className="sticky bottom-0 z-20 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
          ) : (
            <div aria-hidden className="size-9" />
          )}

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={
                checkingShopId ||
                (currentStep === 0 && !isWizardStepValid(0, form)) ||
                suggesting
              }
            >
              Continue
              <ArrowRightIcon className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={openCreateConfirm}
              disabled={loading || !canSubmit}
            >
              Create shop
            </Button>
          )}
        </div>
      </div>

      <CreateShopFlowDialog
        open={createFlowOpen}
        phase={createPhase}
        shopName={form.shop_name}
        shopId={form.shop_id}
        errorMessage={createError}
        onOpenChange={handleCreateFlowOpenChange}
        onConfirm={handleCreateConfirm}
        onRunInBackground={handleRunInBackground}
        onViewShop={handleViewCreatedShop}
        onRetry={handleRetryCreate}
      />
    </PageShell>
  );
}
