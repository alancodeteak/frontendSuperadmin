"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilIcon } from "lucide-react";

import { DetailList } from "@/components/shared/detail-list";
import {
  OperatingHoursDisplay,
  OperatingHoursEditor,
  parseOperatingHours,
  serializeOperatingHours,
  validateOperatingHours,
} from "@/components/shops/shop-operating-hours";
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
import { Textarea } from "@/components/ui/textarea";
import { parseApiFormError } from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import { patchShop } from "@/lib/api/shops";
import {
  normalizeTableSessionPolicy,
  TABLE_SESSION_POLICY_OPTIONS,
  tableSessionPolicyLabel,
} from "@/lib/table-session-policy";
import type {
  ShopDetail,
  ShopEcomSettings,
  ShopServiceConfigEntry,
  ShopServiceConfigs,
  TableSessionPolicyValue,
} from "@/types/api";

const SERVICE_CONFIG_TYPES = [
  "delivery",
  "pickup",
  "drive_thru",
  "dine_in",
  "room_service",
] as const;

type ServiceConfigType = (typeof SERVICE_CONFIG_TYPES)[number];

const SERVICE_CONFIG_LABELS: Record<ServiceConfigType, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  drive_thru: "Drive-thru",
  dine_in: "Dine-in",
  room_service: "Room service",
};

type ServiceConfigFormEntry = {
  enabled: boolean;
  min_order_amount: string;
  prep_time_minutes: string;
  requires_phone: boolean;
  service_charge: string;
  delivery_charge: string;
  free_delivery_above_amount: string;
  delivery_radius_km: string;
};

type ServiceConfigsForm = Record<ServiceConfigType, ServiceConfigFormEntry>;

function defaultServiceConfigEntry(
  serviceType: ServiceConfigType,
  raw?: ShopServiceConfigEntry | null,
): ServiceConfigFormEntry {
  return {
    enabled: raw?.enabled === true,
    min_order_amount:
      raw?.min_order_amount != null ? String(raw.min_order_amount) : "0",
    prep_time_minutes:
      raw?.prep_time_minutes != null ? String(raw.prep_time_minutes) : "",
    requires_phone:
      raw?.requires_phone === true ||
      (raw?.requires_phone == null &&
        (serviceType === "delivery" ||
          serviceType === "pickup" ||
          serviceType === "room_service")),
    service_charge:
      serviceType === "delivery"
        ? ""
        : raw?.service_charge != null
          ? String(raw.service_charge)
          : "0",
    delivery_charge:
      serviceType === "delivery"
        ? raw?.delivery_charge != null
          ? String(raw.delivery_charge)
          : "0"
        : "",
    free_delivery_above_amount:
      serviceType === "delivery"
        ? raw?.free_delivery_above_amount != null
          ? String(raw.free_delivery_above_amount)
          : "0"
        : "",
    delivery_radius_km:
      serviceType === "delivery"
        ? raw?.delivery_radius_km != null
          ? String(raw.delivery_radius_km)
          : ""
        : "",
  };
}

function serviceConfigsFormFromData(
  configs: ShopServiceConfigs | null | undefined,
): ServiceConfigsForm {
  const source =
    configs && typeof configs === "object" && !Array.isArray(configs)
      ? configs
      : {};
  return {
    delivery: defaultServiceConfigEntry("delivery", source.delivery),
    pickup: defaultServiceConfigEntry("pickup", source.pickup),
    drive_thru: defaultServiceConfigEntry("drive_thru", source.drive_thru),
    dine_in: defaultServiceConfigEntry("dine_in", source.dine_in),
    room_service: defaultServiceConfigEntry("room_service", source.room_service),
  };
}

function serializeServiceConfigs(form: ServiceConfigsForm): ShopServiceConfigs {
  const out: ShopServiceConfigs = {};
  for (const serviceType of SERVICE_CONFIG_TYPES) {
    const entry = form[serviceType];
    const minOrder = Number(entry.min_order_amount.trim() || "0");
    const prepRaw = entry.prep_time_minutes.trim();
    const prep =
      prepRaw === "" ? undefined : Number.parseInt(prepRaw, 10);
    const base = {
      enabled: entry.enabled,
      min_order_amount: Number.isFinite(minOrder) && minOrder >= 0 ? minOrder : 0,
      ...(prep != null && Number.isInteger(prep) && prep >= 0
        ? { prep_time_minutes: prep }
        : {}),
      requires_phone: entry.requires_phone,
    };
    if (serviceType === "delivery") {
      const charge = Number(entry.delivery_charge.trim() || "0");
      const freeAbove = Number(entry.free_delivery_above_amount.trim() || "0");
      const radiusRaw = entry.delivery_radius_km.trim();
      const radius = radiusRaw === "" ? null : Number(radiusRaw);
      out[serviceType] = {
        ...base,
        delivery_charge: Number.isFinite(charge) && charge >= 0 ? charge : 0,
        free_delivery_above_amount:
          Number.isFinite(freeAbove) && freeAbove >= 0 ? freeAbove : 0,
        delivery_radius_km:
          radius == null
            ? null
            : Number.isFinite(radius) && radius > 0
              ? radius
              : null,
      };
      continue;
    }
    const charge = Number(entry.service_charge.trim() || "0");
    out[serviceType] = {
      ...base,
      ...(serviceType === "room_service" || charge > 0
        ? {
            service_charge:
              Number.isFinite(charge) && charge >= 0 ? charge : 0,
          }
        : {}),
    };
  }
  return out;
}

function formatServiceConfigSummary(
  configs: ShopServiceConfigs | null | undefined,
): string {
  if (!configs || typeof configs !== "object") return "";
  return SERVICE_CONFIG_TYPES.filter((type) => configs[type]?.enabled)
    .map((type) => {
      const entry = configs[type]!;
      const parts: string[] = [];
      if (entry.min_order_amount != null && entry.min_order_amount > 0) {
        parts.push(`min AED ${entry.min_order_amount}`);
      }
      if (
        type === "delivery" &&
        entry.delivery_charge != null &&
        entry.delivery_charge > 0
      ) {
        parts.push(`fee AED ${entry.delivery_charge}`);
      }
      if (
        type === "delivery" &&
        entry.free_delivery_above_amount != null &&
        entry.free_delivery_above_amount > 0
      ) {
        parts.push(`free above AED ${entry.free_delivery_above_amount}`);
      }
      if (
        type === "delivery" &&
        entry.delivery_radius_km != null &&
        entry.delivery_radius_km > 0
      ) {
        parts.push(`${entry.delivery_radius_km} km`);
      }
      return parts.length
        ? `${SERVICE_CONFIG_LABELS[type]} · ${parts.join(" · ")}`
        : SERVICE_CONFIG_LABELS[type];
    })
    .join(", ");
}

function ShopSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? "max-w-3xl"}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}

function FeatureToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-lg border-b border-border/60 last:border-b-0">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 py-3.5 hover:bg-muted/30"
      >
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
        </span>
      </label>
    </div>
  );
}

function formatDetailValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function yesNo(value: boolean | null | undefined) {
  if (value == null) return null;
  return value ? "Yes" : "No";
}

function ecomFormFromData(ecom: ShopEcomSettings | null | undefined) {
  const paymentMethods = Array.isArray(ecom?.payment_methods)
    ? (ecom.payment_methods as unknown[]).map(String).join(", ")
    : ecom?.payment_methods != null
      ? String(ecom.payment_methods)
      : "";
  return {
    domain: String(ecom?.domain ?? ""),
    cooking_notes_enabled: Boolean(ecom?.cooking_notes_enabled),
    delivery_instructions_enabled: Boolean(ecom?.delivery_instructions_enabled),
    cutlery_enabled: Boolean(ecom?.cutlery_enabled),
    operating_hours: parseOperatingHours(ecom?.operating_hours),
    payment_methods: paymentMethods,
    whatsapp_order_template: String(ecom?.whatsapp_order_template ?? ""),
    seo_title: String(ecom?.seo_title ?? ""),
    seo_description: String(ecom?.seo_description ?? ""),
    seo_keywords: String(ecom?.seo_keywords ?? ""),
    og_title: String(ecom?.og_title ?? ""),
    og_description: String(ecom?.og_description ?? ""),
    og_image: String(ecom?.og_image ?? ""),
    twitter_card: String(ecom?.twitter_card ?? ""),
    robots_index: Boolean(ecom?.robots_index ?? true),
    allow_anonymous_table_orders: Boolean(ecom?.allow_anonymous_table_orders),
    table_session_policy: normalizeTableSessionPolicy(ecom?.table_session_policy),
    service_configs: serviceConfigsFormFromData(ecom?.service_configs),
  };
}

function isShopTableSessionPolicyEnabled(shop: ShopDetail) {
  const tableOrdering = Boolean(
    shop.features?.table_ordering_enabled ?? shop.table_ordering_enabled,
  );
  const roomService = Boolean(
    shop.features?.room_service_enabled ?? shop.room_service_enabled,
  );
  return tableOrdering || roomService;
}

function isShopEcomEnabled(shop: ShopDetail) {
  return Boolean(shop.features?.ecom_enabled ?? shop.ecom_enabled);
}

export function ShopEcomTab({
  shop,
  onSaved,
}: {
  shop: ShopDetail;
  onSaved: () => Promise<void>;
}) {
  const ecomEnabled = isShopEcomEnabled(shop);
  const showTableSessionPolicy = isShopTableSessionPolicyEnabled(shop);
  const initialForm = useMemo(() => ecomFormFromData(shop.ecom), [shop.ecom]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(initialForm);
    setEditing(false);
    setError(null);
    setFieldErrors({});
  }, [initialForm]);

  useEffect(() => {
    if (!ecomEnabled) setEditing(false);
  }, [ecomEnabled]);

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function setServiceConfigField<K extends keyof ServiceConfigFormEntry>(
    serviceType: ServiceConfigType,
    key: K,
    value: ServiceConfigFormEntry[K],
  ) {
    setForm((prev) => ({
      ...prev,
      service_configs: {
        ...prev.service_configs,
        [serviceType]: {
          ...prev.service_configs[serviceType],
          [key]: value,
        },
      },
    }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!ecomEnabled) {
      appToast.error(
        "Enable ecom in Features before editing storefront settings.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const hoursError = validateOperatingHours(form.operating_hours);
    if (hoursError) {
      setError(hoursError);
      setFieldErrors({ operating_hours: hoursError });
      setSaving(false);
      appToast.error(hoursError);
      return;
    }

    const payment_methods = form.payment_methods
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ecom: ShopEcomSettings = {
      domain: form.domain.trim() ? form.domain.trim().toLowerCase() : null,
      cooking_notes_enabled: form.cooking_notes_enabled,
      delivery_instructions_enabled: form.delivery_instructions_enabled,
      cutlery_enabled: form.cutlery_enabled,
      operating_hours: serializeOperatingHours(form.operating_hours),
      payment_methods: payment_methods.length ? payment_methods : null,
      whatsapp_order_template: form.whatsapp_order_template.trim() || null,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      seo_keywords: form.seo_keywords.trim() || null,
      og_title: form.og_title.trim() || null,
      og_description: form.og_description.trim() || null,
      og_image: form.og_image.trim() || null,
      twitter_card: form.twitter_card.trim() || null,
      robots_index: form.robots_index,
      allow_anonymous_table_orders: form.allow_anonymous_table_orders,
      ...(showTableSessionPolicy
        ? { table_session_policy: form.table_session_policy }
        : {}),
      service_configs: serializeServiceConfigs(form.service_configs),
    };

    try {
      await patchShop(shop.shop_id, { ecom });
      appToast.success("Ecom storefront saved.");
      await onSaved();
      setEditing(false);
    } catch (err) {
      const parsed = parseApiFormError(err, "Failed to save ecom settings");
      setError(parsed.message);
      setFieldErrors(parsed.fields);
      appToast.error(parsed.message);
    } finally {
      setSaving(false);
    }
  }

  const ecom = shop.ecom;

  return (
    <ShopSection
      title="Ecom settings"
      description={
        ecomEnabled
          ? "Domain, order rules, SEO, and storefront settings."
          : "Ecom is disabled for this shop. Enable it under Features to edit storefront settings."
      }
      actions={
        ecomEnabled && !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-3.5" />
            Edit
          </Button>
        ) : null
      }
    >
      {!ecomEnabled ? (
        <div className="mb-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Turn on{" "}
          <span className="font-medium text-foreground">Ecom enabled</span> in
          the Features tab to unlock editing.
        </div>
      ) : null}

      {!editing ? (
        <div className="space-y-8">
          <DetailList
            items={[
              { label: "Domain", value: ecom?.domain },
              {
                label: "Guest QR checkout",
                value: yesNo(ecom?.allow_anonymous_table_orders),
              },
              ...(showTableSessionPolicy
                ? [
                    {
                      label: "Table session policy",
                      value: tableSessionPolicyLabel(ecom?.table_session_policy),
                    },
                  ]
                : []),
              {
                label: "Service configs",
                value: formatServiceConfigSummary(ecom?.service_configs) || null,
              },
              {
                label: "Cooking notes",
                value: yesNo(ecom?.cooking_notes_enabled),
              },
              {
                label: "Delivery instructions",
                value: yesNo(ecom?.delivery_instructions_enabled),
              },
              {
                label: "Cutlery",
                value: yesNo(ecom?.cutlery_enabled),
              },
              {
                label: "WhatsApp order template",
                value: ecom?.whatsapp_order_template,
              },
              {
                label: "Payment methods",
                value: formatDetailValue(ecom?.payment_methods),
              },
              { label: "SEO title", value: ecom?.seo_title },
              { label: "SEO description", value: ecom?.seo_description },
              { label: "SEO keywords", value: ecom?.seo_keywords },
              { label: "OG title", value: ecom?.og_title },
              { label: "OG description", value: ecom?.og_description },
              { label: "OG image", value: ecom?.og_image },
              { label: "Twitter card", value: ecom?.twitter_card },
              {
                label: "Robots index",
                value: yesNo(ecom?.robots_index),
              },
            ]}
          />

          <div>
            <p className="mb-1 border-b border-border/70 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Operating hours
            </p>
            <OperatingHoursDisplay value={ecom?.operating_hours} />
          </div>

          {SERVICE_CONFIG_TYPES.some(
            (type) => ecom?.service_configs?.[type] != null,
          ) ? (
            <div className="space-y-4">
              <p className="border-b border-border/70 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Per-service rules
              </p>
              {SERVICE_CONFIG_TYPES.map((serviceType) => {
                const entry = ecom?.service_configs?.[serviceType];
                if (!entry) return null;
                return (
                  <DetailList
                    key={serviceType}
                    items={[
                      {
                        label: SERVICE_CONFIG_LABELS[serviceType],
                        value: entry.enabled ? "Enabled" : "Disabled",
                      },
                      {
                        label: "Min order",
                        value:
                          entry.min_order_amount != null
                            ? `AED ${entry.min_order_amount}`
                            : "AED 0",
                      },
                      {
                        label: "Prep time",
                        value:
                          entry.prep_time_minutes != null
                            ? `${entry.prep_time_minutes} min`
                            : null,
                      },
                      {
                        label: "Requires phone",
                        value: yesNo(entry.requires_phone),
                      },
                      ...(serviceType === "delivery"
                        ? [
                            {
                              label: "Delivery charge",
                              value:
                                entry.delivery_charge != null
                                  ? `AED ${entry.delivery_charge}`
                                  : "AED 0",
                            },
                            {
                              label: "Free delivery above",
                              value:
                                entry.free_delivery_above_amount != null &&
                                entry.free_delivery_above_amount > 0
                                  ? `AED ${entry.free_delivery_above_amount}`
                                  : "Off",
                            },
                            {
                              label: "Delivery radius",
                              value:
                                entry.delivery_radius_km != null
                                  ? `${entry.delivery_radius_km} km`
                                  : "Unrestricted",
                            },
                          ]
                        : [
                            {
                              label: "Service charge",
                              value:
                                entry.service_charge != null
                                  ? `AED ${entry.service_charge}`
                                  : null,
                            },
                          ]),
                    ]}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <form onSubmit={onSave} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Domain (hostname only)">
              <Input
                data-field="domain"
                value={form.domain}
                onChange={(e) => setField("domain", e.target.value)}
                placeholder="shop.example.com"
              />
              {fieldErrors.domain ? (
                <p className="mt-1.5 text-xs font-medium text-destructive">
                  {fieldErrors.domain}
                </p>
              ) : null}
            </Field>
            <Field label="Twitter card">
              <Input
                value={form.twitter_card}
                onChange={(e) => setField("twitter_card", e.target.value)}
                placeholder="summary_large_image"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-border/70 px-3">
            <FeatureToggleRow
              id="ecom_cooking_notes"
              label="Cooking notes"
              description="Let customers add cooking notes on checkout."
              checked={form.cooking_notes_enabled}
              onChange={(v) => setField("cooking_notes_enabled", v)}
            />
            <FeatureToggleRow
              id="ecom_delivery_instructions"
              label="Delivery instructions"
              description="Let customers add delivery instructions on checkout."
              checked={form.delivery_instructions_enabled}
              onChange={(v) => setField("delivery_instructions_enabled", v)}
            />
            <FeatureToggleRow
              id="ecom_cutlery"
              label="Cutlery"
              description="Show cutlery option on the storefront checkout."
              checked={form.cutlery_enabled}
              onChange={(v) => setField("cutlery_enabled", v)}
            />
            <FeatureToggleRow
              id="ecom_allow_anonymous_table_orders"
              label="Guest QR checkout"
              description="Allow table / room / drive-thru orders without OTP when QR ordering is on."
              checked={form.allow_anonymous_table_orders}
              onChange={(v) => setField("allow_anonymous_table_orders", v)}
            />
            {showTableSessionPolicy ? (
              <div className="space-y-2 border-t border-border/70 px-3 py-3">
                <Label htmlFor="ecom_table_session_policy">Table session policy</Label>
                <p className="text-xs text-muted-foreground">
                  Applies to table and room serve locations only. Pickup counters and
                  drive-thru lanes are not session-gated.
                </p>
                <Select
                  value={form.table_session_policy}
                  onValueChange={(value) =>
                    setField(
                      "table_session_policy",
                      value as TableSessionPolicyValue,
                    )
                  }
                >
                  <SelectTrigger id="ecom_table_session_policy">
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {TABLE_SESSION_POLICY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    TABLE_SESSION_POLICY_OPTIONS.find(
                      (opt) => opt.value === form.table_session_policy,
                    )?.description
                  }
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Per-service rules</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Min order, prep time, and delivery fee/radius live on each
                service card. Delivery has no service charge.
              </p>
            </div>
            {SERVICE_CONFIG_TYPES.map((serviceType) => {
              const entry = form.service_configs[serviceType];
              return (
                <div
                  key={serviceType}
                  className="space-y-3 rounded-xl border border-border/70 p-3"
                >
                  <FeatureToggleRow
                    id={`ecom_service_${serviceType}_enabled`}
                    label={SERVICE_CONFIG_LABELS[serviceType]}
                    description={`Offer ${SERVICE_CONFIG_LABELS[serviceType].toLowerCase()} when the matching feature flag is on.`}
                    checked={entry.enabled}
                    onChange={(v) =>
                      setServiceConfigField(serviceType, "enabled", v)
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Min order (AED)">
                      <Input
                        inputMode="decimal"
                        value={entry.min_order_amount}
                        onChange={(e) =>
                          setServiceConfigField(
                            serviceType,
                            "min_order_amount",
                            e.target.value,
                          )
                        }
                      />
                    </Field>
                    <Field label="Prep time (minutes)">
                      <Input
                        inputMode="numeric"
                        value={entry.prep_time_minutes}
                        onChange={(e) =>
                          setServiceConfigField(
                            serviceType,
                            "prep_time_minutes",
                            e.target.value,
                          )
                        }
                      />
                    </Field>
                    {serviceType === "delivery" ? (
                      <>
                        <Field label="Delivery charge (AED)">
                          <Input
                            inputMode="decimal"
                            value={entry.delivery_charge}
                            onChange={(e) =>
                              setServiceConfigField(
                                serviceType,
                                "delivery_charge",
                                e.target.value,
                              )
                            }
                          />
                        </Field>
                        <Field label="Free delivery above (AED)">
                          <Input
                            inputMode="decimal"
                            value={entry.free_delivery_above_amount}
                            onChange={(e) =>
                              setServiceConfigField(
                                serviceType,
                                "free_delivery_above_amount",
                                e.target.value,
                              )
                            }
                            placeholder="0 = always charge"
                          />
                        </Field>
                        <Field label="Delivery radius (km)">
                          <Input
                            inputMode="decimal"
                            value={entry.delivery_radius_km}
                            onChange={(e) =>
                              setServiceConfigField(
                                serviceType,
                                "delivery_radius_km",
                                e.target.value,
                              )
                            }
                            placeholder="Leave empty for unrestricted"
                          />
                        </Field>
                      </>
                    ) : (
                      <Field label="Service charge (AED)">
                        <Input
                          inputMode="decimal"
                          value={entry.service_charge}
                          onChange={(e) =>
                            setServiceConfigField(
                              serviceType,
                              "service_charge",
                              e.target.value,
                            )
                          }
                        />
                      </Field>
                    )}
                  </div>
                  <FeatureToggleRow
                    id={`ecom_service_${serviceType}_phone`}
                    label="Requires phone"
                    description="Require customer phone for this service (guest QR can still skip when enabled above)."
                    checked={entry.requires_phone}
                    onChange={(v) =>
                      setServiceConfigField(serviceType, "requires_phone", v)
                    }
                  />
                </div>
              );
            })}
          </div>

          <Field label="WhatsApp order template">
            <Textarea
              value={form.whatsapp_order_template}
              onChange={(e) =>
                setField("whatsapp_order_template", e.target.value)
              }
              rows={2}
              placeholder="Hi, your order {{order_id}} is confirmed"
            />
          </Field>

          <Field label="Payment methods (comma-separated)">
            <Input
              value={form.payment_methods}
              onChange={(e) => setField("payment_methods", e.target.value)}
              placeholder="online, cash_on_delivery"
            />
          </Field>

          <OperatingHoursEditor
            value={form.operating_hours}
            error={fieldErrors.operating_hours}
            onChange={(next) => setField("operating_hours", next)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title">
              <Input
                value={form.seo_title}
                onChange={(e) => setField("seo_title", e.target.value)}
              />
            </Field>
            <Field label="SEO keywords">
              <Input
                value={form.seo_keywords}
                onChange={(e) => setField("seo_keywords", e.target.value)}
              />
            </Field>
          </div>
          <Field label="SEO description">
            <Textarea
              value={form.seo_description}
              onChange={(e) => setField("seo_description", e.target.value)}
              rows={2}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="OG title">
              <Input
                value={form.og_title}
                onChange={(e) => setField("og_title", e.target.value)}
              />
            </Field>
            <Field label="OG image URL">
              <Input
                value={form.og_image}
                onChange={(e) => setField("og_image", e.target.value)}
              />
            </Field>
          </div>
          <Field label="OG description">
            <Textarea
              value={form.og_description}
              onChange={(e) => setField("og_description", e.target.value)}
              rows={2}
            />
          </Field>

          <FeatureToggleRow
            id="ecom_robots_index"
            label="Robots index"
            description="Allow search engines to index the storefront."
            checked={form.robots_index}
            onChange={(v) => setField("robots_index", v)}
          />

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setForm(initialForm);
                setEditing(false);
                setError(null);
                setFieldErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save ecom settings"}
            </Button>
          </div>
        </form>
      )}
    </ShopSection>
  );
}
