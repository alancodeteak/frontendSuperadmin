"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BanIcon,
  KeyRoundIcon,
  PencilIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserMinusIcon,
} from "lucide-react";

import { ShopLocationModal } from "@/components/shops/shop-location-modal";
import { ShopProfileHero } from "@/components/shops/shop-profile-hero";
import {
  ShopConfirmDialog,
  type ShopConfirmPhase,
} from "@/components/shops/shop-confirm-dialog";
import { RiderEditDialog } from "@/components/shops/rider-edit-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  focusHighlightedField,
  parseApiFormError,
} from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import {
  deleteShop,
  patchShop,
  patchShopDelivery,
  putPromotion,
  createSubscription,
  resetShopPassword,
  restoreShop,
  softDeleteShop,
  triggerShopLogoutEvent,
} from "@/lib/api/shops";
import {
  blockRider,
  createRider,
  deleteRider,
  getNextRiderId,
  resetRiderPassword,
  restoreRider,
  unblockRider,
} from "@/lib/api/riders";
import { attachShopLink, patchLinkFeatures } from "@/lib/api/pos";
import {
  shopDetailQuery,
  shopPosLinkQuery,
  shopPromotionQuery,
  shopProductsQuery,
  shopRidersQuery,
  shopSubscriptionQuery,
  shopSyncStatusQuery,
} from "@/lib/queries/shops";
import {
  digitsOnly,
  isValidUaePhone,
  normalizeUaePhoneInput,
  UAE_COUNTRY_CODE,
} from "@/lib/shop-create-validation";
import { posTemplatesQuery } from "@/lib/queries/pos";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  PosShopLink,
  Rider,
  ShopDeliverySettings,
  ShopDetail,
  ShopEcomSettings,
  ShopFeatures,
  ShopProduct,
  ShopPromotionSettings,
} from "@/types/api";

const TABS = [
  "overview",
  "features",
  "ecom",
  "products",
  "delivery",
  "subscription",
  "promotion",
  "riders",
  "pos",
] as const;

type Tab = (typeof TABS)[number];

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
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
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

function CopyableDetail({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  const text = typeof value === "string" ? value.trim() : "";

  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1 break-all text-sm font-medium">
            {text || "—"}
          </p>
        </div>
        <CopyButton
          value={text}
          iconOnly
          size={13}
          label={`Copy ${label}`}
          className="size-8 shrink-0 p-0"
          disabled={!text}
        />
      </div>
    </div>
  );
}

function SubscriptionDetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">
        {value || <span className="font-normal text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function formatSubscriptionValue(value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const asDate = Date.parse(value);
    if (!Number.isNaN(asDate) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(asDate).toLocaleDateString();
    }
    return value;
  }
  return JSON.stringify(value);
}

export default function ShopDetailPage() {
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";

  const [message, setMessage] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutNote, setLogoutNote] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "soft-delete" | "hard-delete" | "restore" | "force-logout" | null
  >(null);
  const [confirmPhase, setConfirmPhase] =
    useState<ShopConfirmPhase>("confirm");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const shopQuery = useQuery(shopDetailQuery(shopId));
  const shop = shopQuery.data ?? null;
  const loading = shopQuery.isPending;
  const error = shopQuery.error
    ? shopQuery.error instanceof Error
      ? shopQuery.error.message
      : "Failed to load shop"
    : null;
  const loadShop = async () => {
    await shopQuery.refetch();
  };

  function setTab(next: Tab) {
    router.replace(`/shops/${shopId}?tab=${next}`);
  }

  function openConfirm(
    action: "soft-delete" | "hard-delete" | "restore" | "force-logout",
  ) {
    setConfirmError(null);
    setConfirmPhase("confirm");
    setConfirmAction(action);
  }

  function closeConfirm() {
    if (confirmPhase === "loading" || confirmPhase === "success") return;
    setConfirmAction(null);
    setConfirmPhase("confirm");
    setConfirmError(null);
  }

  function goToShopsList() {
    setConfirmAction(null);
    setConfirmPhase("confirm");
    setConfirmError(null);
    router.push("/shops");
  }

  async function runConfirmAction() {
    if (!confirmAction) return;
    setConfirmPhase("loading");
    setConfirmError(null);
    setMessage(null);

    try {
      if (confirmAction === "soft-delete") {
        await softDeleteShop(shopId, shop);
        setConfirmPhase("success");
        appToast.success("Shop soft-deleted.");
        window.setTimeout(() => {
          goToShopsList();
        }, 1200);
        return;
      }

      if (confirmAction === "hard-delete") {
        await deleteShop(shopId, true);
        setConfirmPhase("success");
        appToast.success("Shop permanently deleted.");
        window.setTimeout(() => {
          goToShopsList();
        }, 1200);
        return;
      }

      if (confirmAction === "restore") {
        await restoreShop(shopId);
        setConfirmPhase("success");
        appToast.success(
          "Shop restored. Status is inactive — activate if needed.",
        );
        await loadShop();
        window.setTimeout(() => {
          setConfirmAction(null);
          setConfirmPhase("confirm");
          setConfirmError(null);
        }, 900);
        return;
      }

      // force-logout
      setLogoutBusy(true);
      setLogoutNote(null);
      const res = await triggerShopLogoutEvent(shopId);
      setLogoutNote(
        `Logout alert accepted · event ${res.event_id} · ${new Date(res.occurred_at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })}`,
      );
      setConfirmPhase("success");
      appToast.success("Logout alert sent to online sessions.");
      window.setTimeout(() => {
        setConfirmAction(null);
        setConfirmPhase("confirm");
        setConfirmError(null);
        setLogoutBusy(false);
      }, 900);
    } catch (err) {
      let msg: string;
      if (err instanceof ApiError && confirmAction === "force-logout") {
        if (err.status === 404) {
          msg = "Shop not found — cannot send logout alert.";
        } else if (err.status === 403) {
          msg = "You need superadmin access to send logout alerts.";
        } else if (err.status >= 500) {
          msg = "Server error sending logout alert. Please retry.";
        } else {
          msg = parseApiFormError(err, "Failed to send logout alert.").message;
        }
      } else if (confirmAction === "soft-delete" || confirmAction === "hard-delete") {
        msg = parseApiFormError(err, "Delete failed").message;
      } else if (confirmAction === "restore") {
        msg = parseApiFormError(err, "Restore failed").message;
      } else {
        msg = parseApiFormError(
          err,
          "Failed to send logout alert. Please retry.",
        ).message;
      }
      setConfirmPhase("error");
      setConfirmError(msg);
      setMessage(msg);
      appToast.error(msg);
      if (confirmAction === "force-logout") {
        setLogoutBusy(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <LoadingState />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <ErrorState
          message={error ?? "Shop not found"}
          onRetry={() => void loadShop()}
        />
      </div>
    );
  }

  const shopDisplayName =
    shop.shop_name ?? shop.profile?.shop_name ?? shopId;

  const confirmConfig =
    confirmAction === "soft-delete"
      ? {
          title: "Soft-delete this shop?",
          description:
            "The shop will be marked deleted and hidden from the default list. Feature flags (including ecom enabled) are kept. You can restore it later from Deleted shops.",
          confirmLabel: "Soft delete",
          confirmVariant: "destructive" as const,
          icon: Trash2Icon,
          iconClassName: "bg-destructive/10 text-destructive",
          loadingTitle: "Soft-deleting shop…",
          loadingDescription: "Marking this shop as deleted.",
          successTitle: "Shop soft-deleted",
          successDescription:
            "Feature flags were preserved. Redirecting you back to the shops list.",
          successActionLabel: "Back to shops",
          errorTitle: "Could not soft-delete shop",
        }
      : confirmAction === "hard-delete"
        ? {
            title: "Permanently delete this shop?",
            description:
              "This hard-deletes the shop and cannot be undone. Prefer soft delete unless you are sure.",
            confirmLabel: "Hard delete",
            confirmVariant: "destructive" as const,
            icon: Trash2Icon,
            iconClassName: "bg-destructive/10 text-destructive",
            loadingTitle: "Deleting shop…",
            loadingDescription: "Permanently removing this shop.",
            successTitle: "Shop permanently deleted",
            successDescription:
              "Redirecting you back to the shops list.",
            successActionLabel: "Back to shops",
            errorTitle: "Could not delete shop",
          }
        : confirmAction === "restore"
          ? {
              title: "Restore this shop?",
              description:
                "Clears the deleted flag. Status stays inactive — re-activate the shop if needed. Feature flags are left as they were.",
              confirmLabel: "Restore shop",
              confirmVariant: "default" as const,
              icon: RotateCcwIcon,
              iconClassName: "bg-primary/10 text-primary",
              loadingTitle: "Restoring shop…",
              loadingDescription: "Clearing the deleted flag.",
              successTitle: "Shop restored",
              successDescription:
                "Status is inactive — activate if needed.",
              successActionLabel: "Done",
              errorTitle: "Could not restore shop",
            }
          : confirmAction === "force-logout"
            ? {
                title: "Send logout alert?",
                description:
                  "All online shop owners and delivery partners for this shop will see a 30-second logout alert. Offline users will not be affected.",
                confirmLabel: "Send logout alert",
                confirmVariant: "default" as const,
                icon: BanIcon,
                iconClassName: "bg-primary/10 text-primary",
                loadingTitle: "Sending logout alert…",
                loadingDescription: "Notifying online sessions.",
                successTitle: "Logout alert sent",
                successDescription:
                  "Online shop owners and riders will see the logout countdown.",
                successActionLabel: "Done",
                errorTitle: "Could not send logout alert",
              }
            : null;

  return (
    <div className="min-h-0 w-full flex-1 overflow-auto">
      <ShopProfileHero shop={shop} onPhotoUpdated={loadShop} fullWidth />

      <div className="px-6 pt-4 pb-8 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/shops" />}>
            ← Shops
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {shop.is_deleted ? (
              <StatusBadge status="deleted" />
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={logoutBusy || Boolean(shop.is_deleted)}
              onClick={() => openConfirm("force-logout")}
            >
              {logoutBusy ? "Sending…" : "Force logout"}
            </Button>
            {shop.is_deleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openConfirm("restore")}
              >
                <RotateCcwIcon className="size-3.5" />
                Restore
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openConfirm("soft-delete")}
              >
                Soft delete
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openConfirm("hard-delete")}
            >
              Hard delete
            </Button>
          </div>
        </div>

        {logoutNote ? (
          <p className="mb-4 text-sm text-emerald-700">{logoutNote}</p>
        ) : null}
        {message ? (
          <p className="mb-4 text-sm text-destructive">{message}</p>
        ) : null}

        <nav className="mb-8 flex gap-1 overflow-x-auto border-b">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`shrink-0 px-3 py-2.5 text-sm capitalize transition-colors ${
                tab === item
                  ? "border-b-2 border-primary font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {tab === "overview" ? (
          <OverviewTab shop={shop} onSaved={loadShop} />
        ) : null}
        {tab === "features" ? (
          <FeaturesTab shop={shop} onSaved={loadShop} />
        ) : null}
        {tab === "ecom" ? (
          <EcomTab shop={shop} onSaved={loadShop} />
        ) : null}
        {tab === "products" ? <ProductsTab shopId={shopId} /> : null}
        {tab === "delivery" ? (
          <DeliveryTab shopId={shopId} shop={shop} onSaved={loadShop} />
        ) : null}
        {tab === "subscription" ? (
          <SubscriptionTab shopId={shopId} shop={shop} />
        ) : null}
        {tab === "promotion" ? (
          <PromotionTab shopId={shopId} shop={shop} />
        ) : null}
        {tab === "riders" ? <RidersTab shopId={shopId} /> : null}
        {tab === "pos" ? <PosLinkTab shopId={shopId} /> : null}
      </div>

      {confirmConfig ? (
        <ShopConfirmDialog
          open={confirmAction != null}
          phase={confirmPhase}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          confirmVariant={confirmConfig.confirmVariant}
          icon={confirmConfig.icon}
          iconClassName={confirmConfig.iconClassName}
          shopName={shopDisplayName}
          shopId={shopId}
          loadingTitle={confirmConfig.loadingTitle}
          loadingDescription={confirmConfig.loadingDescription}
          successTitle={confirmConfig.successTitle}
          successDescription={confirmConfig.successDescription}
          successActionLabel={confirmConfig.successActionLabel}
          errorTitle={confirmConfig.errorTitle}
          errorMessage={confirmError}
          onOpenChange={(open) => {
            if (!open) closeConfirm();
          }}
          onConfirm={() => void runConfirmAction()}
          onSuccessAction={() => {
            if (
              confirmAction === "soft-delete" ||
              confirmAction === "hard-delete"
            ) {
              goToShopsList();
              return;
            }
            setConfirmAction(null);
            setConfirmPhase("confirm");
            setConfirmError(null);
          }}
          onRetry={() => void runConfirmAction()}
        />
      ) : null}
    </div>
  );
}

function formatDetailValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDetailDate(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-AE", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function OverviewTab({
  shop,
  onSaved,
}: {
  shop: ShopDetail;
  onSaved: () => Promise<void>;
}) {
  const profile = shop.profile;
  const initialForm = useMemo(
    () => ({
      shop_name: shop.shop_name ?? profile?.shop_name ?? "",
      second_name: profile?.second_name ?? "",
      phone: shop.phone ?? profile?.phone ?? "",
      email: shop.email ?? profile?.email ?? "",
      ecom_slug: shop.ecom_slug ?? shop.features?.ecom_slug ?? "",
      status: String(shop.status ?? "active"),
      status_reason: shop.status_reason ?? "",
      shop_license_no: profile?.shop_license_no ?? "",
      contact_person_number: profile?.contact_person_number ?? "",
      contact_person_email: profile?.contact_person_email ?? "",
      upi_id: profile?.upi_id ?? "",
      vat_enabled: Boolean(profile?.vat_enabled),
      vat: String(profile?.vat ?? "5"),
      enable_promotion: Boolean(profile?.enable_promotion),
    }),
    [shop, profile],
  );
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [highlightFields, setHighlightFields] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setForm(initialForm);
    setEditing(false);
    setError(null);
    setFieldErrors({});
    setHighlightFields([]);
  }, [initialForm]);

  function overviewFieldInvalid(field: string) {
    return highlightFields.includes(field) || Boolean(fieldErrors[field]);
  }

  function updateOverviewField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
    setHighlightFields((prev) => prev.filter((f) => f !== key));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setHighlightFields([]);
    try {
      await patchShop(shop.shop_id, {
        shop_name: form.shop_name,
        second_name: form.second_name || null,
        phone: form.phone,
        email: form.email,
        status: form.status,
        status_reason: form.status_reason || null,
        shop_license_no: form.shop_license_no || null,
        contact_person_number: form.contact_person_number || null,
        contact_person_email: form.contact_person_email || null,
        upi_id: form.upi_id || null,
        vat_enabled: form.vat_enabled,
        vat: form.vat,
        enable_promotion: form.enable_promotion,
      });
      await onSaved();
      setEditing(false);
      appToast.success("Shop details saved.");
    } catch (err) {
      const parsed = parseApiFormError(err, "Save failed");
      setError(parsed.message);
      setFieldErrors(parsed.fields);
      setHighlightFields(parsed.highlightFields);
      appToast.error(parsed.message);
      window.requestAnimationFrame(() =>
        focusHighlightedField(parsed.highlightFields),
      );
    } finally {
      setSaving(false);
    }
  }

  const address = shop.address;
  const addressLabel = address
    ? [
        address.address_line_1,
        address.address_line_2,
        address.locality,
        address.city,
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const coordinates =
    typeof address?.latitude === "number" &&
    typeof address?.longitude === "number"
      ? `${address.latitude}, ${address.longitude}`
      : null;

  return (
    <div className="space-y-12">
      <ShopSection
        title="Account"
        description="Immutable identifiers and account status."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <CopyableDetail label="Shop ID" value={shop.shop_id} />
          <CopyableDetail
            label="User ID"
            value={shop.user_id != null ? String(shop.user_id) : null}
          />
          <CopyableDetail label="Status" value={String(shop.status ?? "")} />
          <CopyableDetail
            label="Status reason"
            value={shop.status_reason}
          />
          <CopyableDetail
            label="Group ID"
            value={shop.group_id != null ? String(shop.group_id) : null}
          />
          <CopyableDetail
            label="Subscription ID"
            value={
              shop.subscription_id != null
                ? String(shop.subscription_id)
                : null
            }
          />
          <CopyableDetail
            label="Created at"
            value={formatDetailDate(shop.created_at)}
          />
          <CopyableDetail
            label="Updated at"
            value={formatDetailDate(shop.updated_at)}
          />
          <CopyableDetail
            label="Deleted"
            value={shop.is_deleted ? "Yes" : "No"}
          />
        </div>
      </ShopSection>

      <ShopSection
        title="Shop details"
        description="Core profile used across ecom, POS, and billing."
        actions={
          !editing ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : null
        }
      >
        <form onSubmit={onSave} className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CopyableDetail label="Shop name" value={form.shop_name} />
            <CopyableDetail label="Second name" value={form.second_name} />
            <CopyableDetail label="Phone" value={form.phone} />
            <CopyableDetail label="Email" value={form.email} />
            <CopyableDetail label="Ecom slug" value={form.ecom_slug} />
            <CopyableDetail
              label="Shop license no"
              value={form.shop_license_no}
            />
            <CopyableDetail
              label="Contact person number"
              value={form.contact_person_number}
            />
            <CopyableDetail
              label="Contact person email"
              value={form.contact_person_email}
            />
            <CopyableDetail label="UPI ID" value={form.upi_id} />
            <CopyableDetail
              label="VAT enabled"
              value={form.vat_enabled ? "Yes" : "No"}
            />
            <CopyableDetail label="VAT %" value={form.vat} />
            <CopyableDetail
              label="Enable promotion"
              value={form.enable_promotion ? "Yes" : "No"}
            />
            <CopyableDetail
              label="Photo"
              value={profile?.photo ?? shop.photo}
            />
            <CopyableDetail
              label="Photo URL"
              value={profile?.photo_url ?? shop.photo_url}
            />
          </div>

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {(
              [
                ["shop_name", "Shop name", form.shop_name],
                ["second_name", "Second name", form.second_name],
                ["status_reason", "Status reason", form.status_reason],
                ["phone", "Phone", form.phone],
                ["email", "Email", form.email],
                ["shop_license_no", "Shop license no", form.shop_license_no],
                ["upi_id", "UPI ID", form.upi_id],
                [
                  "contact_person_number",
                  "Contact person number",
                  form.contact_person_number,
                ],
                [
                  "contact_person_email",
                  "Contact person email",
                  form.contact_person_email,
                ],
                ["vat", "VAT %", form.vat],
              ] as const
            ).map(([key, label, value]) => (
              <Field key={key} label={label}>
                <Input
                  id={`overview_${key}`}
                  data-field={key}
                  value={value}
                  disabled={!editing}
                  aria-invalid={overviewFieldInvalid(key) || undefined}
                  className={
                    overviewFieldInvalid(key)
                      ? "border-destructive focus-visible:ring-destructive/30"
                      : undefined
                  }
                  onChange={(e) => updateOverviewField(key, e.target.value)}
                />
                {fieldErrors[key] ? (
                  <p className="mt-1.5 text-xs font-medium text-destructive">
                    {fieldErrors[key]}
                  </p>
                ) : null}
              </Field>
            ))}
            <Field label="Status">
              <div
                data-field="status"
                className={
                  overviewFieldInvalid("status")
                    ? "rounded-lg ring-2 ring-destructive/40"
                    : undefined
                }
              >
                <Select
                  value={form.status}
                  disabled={!editing}
                  onValueChange={(value) =>
                    updateOverviewField("status", value ?? "active")
                  }
                >
                  <SelectTrigger
                    id="overview_status"
                    aria-invalid={overviewFieldInvalid("status") || undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {fieldErrors.status ? (
                <p className="mt-1.5 text-xs font-medium text-destructive">
                  {fieldErrors.status}
                </p>
              ) : null}
            </Field>
            <Field label="Ecom slug">
              <Input
                id="overview_ecom_slug"
                data-field="ecom_slug"
                value={form.ecom_slug}
                disabled
                readOnly
              />
            </Field>
            <label
              data-field="vat_enabled"
              className={`flex items-center gap-2 text-sm sm:col-span-2 ${
                overviewFieldInvalid("vat_enabled")
                  ? "rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.vat_enabled}
                disabled={!editing}
                onChange={(e) =>
                  updateOverviewField("vat_enabled", e.target.checked)
                }
              />
              VAT enabled
            </label>
            <label
              data-field="enable_promotion"
              className={`flex items-center gap-2 text-sm sm:col-span-2 ${
                overviewFieldInvalid("enable_promotion")
                  ? "rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.enable_promotion}
                disabled={!editing}
                onChange={(e) =>
                  updateOverviewField("enable_promotion", e.target.checked)
                }
              />
              Enable promotion
            </label>
          </div>

          <div className="border-t pt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Location
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Used for maps, delivery radius, and shop discovery.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!editing}
                onClick={() => setLocationOpen(true)}
              >
                Update location
              </Button>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <CopyableDetail
                label="Address line 1"
                value={address?.address_line_1}
              />
              <CopyableDetail
                label="Address line 2"
                value={address?.address_line_2}
              />
              <CopyableDetail label="Locality" value={address?.locality} />
              <CopyableDetail label="City" value={address?.city} />
              <CopyableDetail label="Latitude" value={
                address?.latitude != null ? String(address.latitude) : null
              } />
              <CopyableDetail label="Longitude" value={
                address?.longitude != null ? String(address.longitude) : null
              } />
              <CopyableDetail
                label="Contact number"
                value={address?.contact_number}
              />
              <CopyableDetail label="Full address" value={addressLabel} />
              <CopyableDetail label="Coordinates" value={coordinates} />
            </div>
          </div>

          {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
          {editing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setForm(initialForm);
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : null}
        </form>
      </ShopSection>

      <ShopSection
        title="Reset password"
        description="Issues a new password for the shop owner login."
      >
        <form
          className="flex max-w-md flex-col gap-4 sm:flex-row sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setPwMessage(null);
            try {
              await resetShopPassword(shop.shop_id, password);
              setPassword("");
              setPwMessage("Shop password reset.");
              appToast.success("Shop password reset.");
            } catch (err) {
              const msg =
                parseApiFormError(err, "Password reset failed").message;
              setPwMessage(msg);
              appToast.error(msg);
            }
          }}
        >
          <Field label="New password" className="min-w-0 flex-1 space-y-1.5">
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="outline" className="shrink-0">
            Reset password
          </Button>
        </form>
        {pwMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">{pwMessage}</p>
        ) : null}
      </ShopSection>

      <ShopLocationModal
        shop={shop}
        open={locationOpen}
        onOpenChange={setLocationOpen}
        onSaved={onSaved}
      />
    </div>
  );
}

function readShopFeatures(shop: ShopDetail): Required<
  Pick<
    ShopFeatures,
    | "ecom_enabled"
    | "ecom_order_confirmation_enabled"
    | "scheduled_order"
    | "merge_order"
    | "return_option"
    | "customer_ticket"
    | "integration_enabled"
    | "is_msg_activated"
    | "single_msg"
  >
> & {
  ecom_slug: string;
  integration_rate_limit: string;
  has_integration_token: boolean;
} {
  const f = (shop.features ?? {}) as ShopFeatures;
  return {
    ecom_enabled: Boolean(f.ecom_enabled ?? shop.ecom_enabled),
    ecom_order_confirmation_enabled: Boolean(
      f.ecom_order_confirmation_enabled ?? shop.ecom_order_confirmation_enabled,
    ),
    scheduled_order: Boolean(f.scheduled_order ?? shop.scheduled_order),
    merge_order: Boolean(f.merge_order ?? shop.merge_order),
    return_option: Boolean(f.return_option),
    customer_ticket: Boolean(f.customer_ticket),
    ecom_slug: String(f.ecom_slug ?? shop.ecom_slug ?? ""),
    integration_enabled: Boolean(f.integration_enabled),
    integration_rate_limit: String(f.integration_rate_limit ?? 100),
    has_integration_token: Boolean(f.has_integration_token),
    is_msg_activated: Boolean(f.is_msg_activated),
    single_msg: Boolean(f.single_msg),
  };
}

function FeatureToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  error,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  error?: string | null;
  invalid?: boolean;
  onChange: (value: boolean) => void;
}) {
  const showError = Boolean(error) || invalid;
  return (
    <div
      data-field={id.replace(/^feat_/, "")}
      className={`rounded-lg border-b border-border/60 last:border-b-0 ${
        showError
          ? "border border-destructive/40 bg-destructive/5 px-3"
          : ""
      }`}
    >
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-start gap-3 py-3.5 ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:bg-muted/30"
        } ${showError ? "hover:bg-transparent" : ""}`}
      >
        <input
          id={id}
          type="checkbox"
          className={`mt-1 size-4 accent-primary ${
            showError ? "outline outline-2 outline-offset-2 outline-destructive" : ""
          }`}
          checked={checked}
          disabled={disabled}
          aria-invalid={showError || undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
          {error ? (
            <span className="mt-1.5 block text-xs font-medium text-destructive">
              {error}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

function FeaturesTab({
  shop,
  onSaved,
}: {
  shop: ShopDetail;
  onSaved: () => Promise<void>;
}) {
  const initial = readShopFeatures(shop);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [highlightFields, setHighlightFields] = useState<string[]>([]);

  useEffect(() => {
    setForm(readShopFeatures(shop));
    setError(null);
    setFieldErrors({});
    setHighlightFields([]);
  }, [shop]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setHighlightFields((prev) => prev.filter((f) => f !== key));
  }

  function setFlag<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    clearFieldError(String(key));
    setError(null);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "ecom_enabled" && value === false) {
        next.ecom_order_confirmation_enabled = false;
        next.customer_ticket = false;
        clearFieldError("ecom_order_confirmation_enabled");
        clearFieldError("customer_ticket");
      }
      if (key === "is_msg_activated" && value === false) {
        next.single_msg = false;
        clearFieldError("single_msg");
      }
      return next;
    });
  }

  function applyFormError(err: unknown, fallback: string) {
    const parsed = parseApiFormError(err, fallback);
    setError(parsed.message);
    setFieldErrors(parsed.fields);
    setHighlightFields(parsed.highlightFields);
    appToast.error(parsed.message);
    window.requestAnimationFrame(() => {
      focusHighlightedField(
        parsed.highlightFields.map((f) =>
          f === "ecom_slug" || f === "integration_rate_limit"
            ? `features_${f}`
            : `feat_${f}`,
        ),
      );
      // Also try data-field attribute via helper's second pass
      focusHighlightedField(parsed.highlightFields);
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setHighlightFields([]);

    // Client-side dependency checks before hitting the API
    if (
      !form.ecom_enabled &&
      (form.ecom_order_confirmation_enabled || form.customer_ticket)
    ) {
      const parsed = parseApiFormError(
        new ApiError(
          400,
          form.ecom_order_confirmation_enabled
            ? "ecom_order_confirmation_enabled requires ecom_enabled to be true"
            : "customer_ticket requires ecom_enabled to be true",
        ),
        "Ecom must be enabled for this feature.",
      );
      setError(parsed.message);
      setFieldErrors(parsed.fields);
      setHighlightFields(parsed.highlightFields);
      appToast.error(parsed.message);
      window.requestAnimationFrame(() =>
        focusHighlightedField(parsed.highlightFields),
      );
      setSaving(false);
      return;
    }

    try {
      const ecomEnabled = form.ecom_enabled;
      const result = await patchShop(shop.shop_id, {
        ecom_enabled: ecomEnabled,
        ecom_slug: form.ecom_slug || null,
        ecom_order_confirmation_enabled: ecomEnabled
          ? form.ecom_order_confirmation_enabled
          : false,
        scheduled_order: form.scheduled_order,
        merge_order: form.merge_order,
        return_option: form.return_option,
        customer_ticket: ecomEnabled ? form.customer_ticket : false,
        integration_enabled: form.integration_enabled,
        integration_rate_limit: Number(form.integration_rate_limit) || 100,
        is_msg_activated: form.is_msg_activated,
        single_msg: form.single_msg,
      });
      if (result.integration_token) {
        appToast.success(
          `Feature flags saved. Integration token (copy now): ${result.integration_token}`,
        );
      } else {
        appToast.success("Feature flags saved.");
      }
      await onSaved();
    } catch (err) {
      applyFormError(err, "Failed to save feature flags");
    } finally {
      setSaving(false);
    }
  }

  function isHighlighted(field: string) {
    return highlightFields.includes(field) || Boolean(fieldErrors[field]);
  }

  return (
    <ShopSection
      title="Feature flags"
      description="Shop feature toggles. Confirmation and tickets require ecom enabled."
    >
      <form onSubmit={onSave} className="space-y-6">
        <Field label="Ecom slug">
          <Input
            id="features_ecom_slug"
            data-field="ecom_slug"
            value={form.ecom_slug}
            aria-invalid={isHighlighted("ecom_slug") || undefined}
            className={
              isHighlighted("ecom_slug")
                ? "border-destructive focus-visible:ring-destructive/30"
                : undefined
            }
            onChange={(e) => setFlag("ecom_slug", e.target.value)}
            placeholder="my-shop-slug"
          />
          {fieldErrors.ecom_slug ? (
            <p className="mt-1.5 text-xs font-medium text-destructive">
              {fieldErrors.ecom_slug}
            </p>
          ) : null}
        </Field>

        <div>
          <FeatureToggleRow
            id="feat_ecom_enabled"
            label="Ecom enabled"
            description="Master switch for online ecommerce."
            checked={form.ecom_enabled}
            invalid={isHighlighted("ecom_enabled")}
            error={fieldErrors.ecom_enabled}
            onChange={(v) => setFlag("ecom_enabled", v)}
          />
          <FeatureToggleRow
            id="feat_ecom_order_confirmation_enabled"
            label="Ecom order confirmation"
            description="Shop must accept/reject blank ecom orders before fulfillment."
            checked={form.ecom_order_confirmation_enabled}
            disabled={!form.ecom_enabled}
            invalid={isHighlighted("ecom_order_confirmation_enabled")}
            error={fieldErrors.ecom_order_confirmation_enabled}
            onChange={(v) => setFlag("ecom_order_confirmation_enabled", v)}
          />
          <FeatureToggleRow
            id="feat_scheduled_order"
            label="Scheduled orders"
            description="Enables scheduled-order APIs in the shop DMS."
            checked={form.scheduled_order}
            invalid={isHighlighted("scheduled_order")}
            error={fieldErrors.scheduled_order}
            onChange={(v) => setFlag("scheduled_order", v)}
          />
          <FeatureToggleRow
            id="feat_merge_order"
            label="Merge orders"
            description="Enables order merge and customer credit in the shop DMS."
            checked={form.merge_order}
            invalid={isHighlighted("merge_order")}
            error={fieldErrors.merge_order}
            onChange={(v) => setFlag("merge_order", v)}
          />
          <FeatureToggleRow
            id="feat_return_option"
            label="Return option"
            description="Allow product returns for this shop."
            checked={form.return_option}
            invalid={isHighlighted("return_option")}
            error={fieldErrors.return_option}
            onChange={(v) => setFlag("return_option", v)}
          />
          <FeatureToggleRow
            id="feat_customer_ticket"
            label="Customer tickets"
            description="Customer support tickets. Requires ecom."
            checked={form.customer_ticket}
            disabled={!form.ecom_enabled}
            invalid={isHighlighted("customer_ticket")}
            error={fieldErrors.customer_ticket}
            onChange={(v) => setFlag("customer_ticket", v)}
          />
          <FeatureToggleRow
            id="feat_integration_enabled"
            label="Integration enabled"
            description="Allow third-party / POS API integration for this shop."
            checked={form.integration_enabled}
            invalid={isHighlighted("integration_enabled")}
            error={fieldErrors.integration_enabled}
            onChange={(v) => setFlag("integration_enabled", v)}
          />
          <FeatureToggleRow
            id="feat_is_msg_activated"
            label="Messaging activated"
            description="Enable shop messaging / notification channel."
            checked={form.is_msg_activated}
            invalid={isHighlighted("is_msg_activated")}
            error={fieldErrors.is_msg_activated}
            onChange={(v) => setFlag("is_msg_activated", v)}
          />
          <FeatureToggleRow
            id="feat_single_msg"
            label="Single message mode"
            description="Send a single consolidated message instead of per-event messages."
            checked={form.single_msg}
            disabled={!form.is_msg_activated}
            invalid={isHighlighted("single_msg")}
            error={fieldErrors.single_msg}
            onChange={(v) => setFlag("single_msg", v)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CopyableDetail
            label="Has integration token"
            value={form.has_integration_token ? "Yes" : "No"}
          />
          <Field label="Integration rate limit">
            <Input
              id="features_integration_rate_limit"
              data-field="integration_rate_limit"
              inputMode="numeric"
              value={form.integration_rate_limit}
              aria-invalid={
                isHighlighted("integration_rate_limit") || undefined
              }
              className={
                isHighlighted("integration_rate_limit")
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : undefined
              }
              onChange={(e) =>
                setFlag(
                  "integration_rate_limit",
                  e.target.value.replace(/\D/g, ""),
                )
              }
            />
            {fieldErrors.integration_rate_limit ? (
              <p className="mt-1.5 text-xs font-medium text-destructive">
                {fieldErrors.integration_rate_limit}
              </p>
            ) : null}
          </Field>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save feature flags"}
        </Button>
      </form>
    </ShopSection>
  );
}

const productColumns: ColumnDef<ShopProduct>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.id ?? "—"}</span>
    ),
    meta: { label: "ID" },
    size: 80,
  },
  {
    id: "product_name",
    accessorFn: (row) => row.product_name ?? row.name ?? "",
    header: "Product",
    cell: ({ row }) => {
      const name = row.original.product_name ?? row.original.name ?? "—";
      const alt = row.original.product_name_alt;
      return (
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          {alt ? (
            <p className="truncate text-xs text-muted-foreground">{alt}</p>
          ) : null}
        </div>
      );
    },
    meta: { label: "Product" },
    size: 220,
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const price = row.original.price;
      if (price == null || price === "") return "—";
      const amount = Number(price);
      return (
        <span className="tabular-nums">
          {Number.isFinite(amount)
            ? formatCurrency(amount)
            : String(price)}
        </span>
      );
    },
    meta: { label: "Price" },
    size: 110,
  },
  {
    accessorKey: "vat_rate",
    header: "VAT %",
    cell: ({ row }) => {
      const rate = row.original.vat_rate;
      if (rate == null || rate === "") return "—";
      return <span className="tabular-nums">{String(rate)}%</span>;
    },
    meta: { label: "VAT %" },
    size: 80,
  },
  {
    id: "vat_inclusive",
    accessorFn: (row) => (row.is_vat_inclusive ? "yes" : "no"),
    header: "VAT incl.",
    cell: ({ row }) => (row.original.is_vat_inclusive ? "Yes" : "No"),
    meta: { label: "VAT incl." },
    size: 90,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: { label: "Status" },
    size: 110,
  },
  {
    accessorKey: "availability",
    header: "Availability",
    cell: ({ row }) => (
      <span className="capitalize">
        {String(row.original.availability ?? "—").replaceAll("_", " ")}
      </span>
    ),
    meta: { label: "Availability" },
    size: 130,
  },
  {
    accessorKey: "category_id",
    header: "Category",
    cell: ({ row }) => row.original.category_id ?? "—",
    meta: { label: "Category" },
    size: 90,
  },
  {
    accessorKey: "diet_type",
    header: "Diet",
    cell: ({ row }) =>
      row.original.diet_type
        ? String(row.original.diet_type).replaceAll("_", " ")
        : "—",
    meta: { label: "Diet" },
    size: 100,
  },
  {
    id: "pos_product_id",
    accessorFn: (row) => row.pos_product_id ?? row.pos_id ?? "",
    header: "POS ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.pos_product_id ?? row.original.pos_id ?? "—"}
      </span>
    ),
    meta: { label: "POS ID" },
    size: 110,
  },
  {
    accessorKey: "seo_slug",
    header: "Slug",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.seo_slug ?? "—"}</span>
    ),
    meta: { label: "Slug" },
    size: 160,
  },
  {
    accessorKey: "sort_order",
    header: "Sort",
    cell: ({ row }) => row.original.sort_order ?? "—",
    meta: { label: "Sort" },
    size: 70,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[14rem] text-muted-foreground">
        {row.original.description || "—"}
      </span>
    ),
    meta: { label: "Description" },
    size: 180,
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) =>
      row.original.created_at
        ? new Date(row.original.created_at).toLocaleDateString("en-AE")
        : "—",
    meta: { label: "Created" },
    size: 110,
  },
  {
    accessorKey: "updated_at",
    header: "Updated",
    cell: ({ row }) =>
      row.original.updated_at
        ? new Date(row.original.updated_at).toLocaleDateString("en-AE")
        : "—",
    meta: { label: "Updated" },
    size: 110,
  },
];

function ProductsTab({ shopId }: { shopId: string }) {
  const productsQuery = useQuery(
    shopProductsQuery(shopId, { page: 1, limit: 100 }),
  );
  const items = productsQuery.data?.items ?? [];
  const loading = productsQuery.isPending;
  const error = productsQuery.error
    ? productsQuery.error instanceof Error
      ? productsQuery.error.message
      : "Failed to load products"
    : null;
  const load = () => void productsQuery.refetch();

  return (
    <ShopSection
      title="Products"
      description={
        loading
          ? "Loading catalog…"
          : `${items.length} product${items.length === 1 ? "" : "s"}`
      }
      className="max-w-none"
    >
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No products"
          description="This shop has no products yet."
        />
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <DataTable
          columns={productColumns}
          data={items}
          searchPlaceholder="Search products…"
          emptyMessage="No products match this search."
          getRowId={(row, index) => String(row.id ?? index)}
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      ) : null}
    </ShopSection>
  );
}

const BONUS_PENALTY_START_STATUS_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: "assigned", label: "Assigned" },
  { value: "picked_up", label: "Picked up" },
  { value: "out_for_delivery", label: "Out for delivery" },
];

const BONUS_PENALTY_START_STATUS_VALUES = new Set(
  BONUS_PENALTY_START_STATUS_OPTIONS.map((o) => o.value),
);

function normalizeBonusPenaltyStartStatus(value: unknown): string {
  const raw = String(value ?? "assigned").trim();
  return BONUS_PENALTY_START_STATUS_VALUES.has(raw) ? raw : "assigned";
}

function bonusPenaltyStartStatusOptions(current: string) {
  if (
    current &&
    !BONUS_PENALTY_START_STATUS_VALUES.has(current)
  ) {
    return [
      ...BONUS_PENALTY_START_STATUS_OPTIONS,
      {
        value: current,
        label: current
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      },
    ];
  }
  return BONUS_PENALTY_START_STATUS_OPTIONS;
}

function deliveryFormFromData(
  data: ShopDeliverySettings | Record<string, unknown> | null | undefined,
) {
  return {
    delivery_time: String(data?.delivery_time ?? 30),
    self_assigned: Boolean(data?.self_assigned ?? false),
    pickup_disabled: Boolean(data?.pickup_disabled ?? false),
    bonus_penalty: Boolean(data?.bonus_penalty ?? false),
    bonus_penalty_start_status: normalizeBonusPenaltyStartStatus(
      data?.bonus_penalty_start_status,
    ),
    common_penalty_enabled: Boolean(data?.common_penalty_enabled ?? false),
    common_penalty_idle_minutes: String(
      data?.common_penalty_idle_minutes ?? 45,
    ),
    common_penalty_min_online_minutes: String(
      data?.common_penalty_min_online_minutes ?? 45,
    ),
  };
}

function DeliveryTab({
  shopId,
  shop,
  onSaved,
}: {
  shopId: string;
  shop: ShopDetail;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(() => deliveryFormFromData(shop.delivery));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(deliveryFormFromData(shop.delivery));
  }, [shop.delivery]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await patchShopDelivery(shopId, {
        delivery_time: Number(form.delivery_time) || 30,
        self_assigned: form.self_assigned,
        pickup_disabled: form.pickup_disabled,
        bonus_penalty: form.bonus_penalty,
        bonus_penalty_start_status: normalizeBonusPenaltyStartStatus(
          form.bonus_penalty_start_status,
        ),
        common_penalty_enabled: form.common_penalty_enabled,
        common_penalty_idle_minutes:
          Number(form.common_penalty_idle_minutes) || 45,
        common_penalty_min_online_minutes:
          Number(form.common_penalty_min_online_minutes) || 45,
      });
      appToast.success("Delivery settings saved.");
      await onSaved();
    } catch (err) {
      const msg = parseApiFormError(err, "Save failed").message;
      setError(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShopSection
      title="Delivery settings"
      description="All delivery, bonus, and common penalty settings for this shop."
      className="max-w-3xl"
    >
      <form onSubmit={onSave} className="space-y-8">
        <div className="space-y-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Basics
          </p>
          <Field label="Delivery time (min)">
            <Input
              inputMode="numeric"
              value={form.delivery_time}
              onChange={(e) =>
                setField("delivery_time", e.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          <div>
            <FeatureToggleRow
              id="delivery_self_assigned"
              label="Self assigned"
              description="Shop can self-assign riders to orders."
              checked={form.self_assigned}
              onChange={(v) => setField("self_assigned", v)}
            />
            <FeatureToggleRow
              id="delivery_pickup_disabled"
              label="Pickup disabled"
              description="Disable customer pickup for this shop."
              checked={form.pickup_disabled}
              onChange={(v) => setField("pickup_disabled", v)}
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Bonus / penalty
          </p>
          <FeatureToggleRow
            id="delivery_bonus_penalty"
            label="Bonus / penalty"
            description="Enable rider bonus and penalty rules for this shop."
            checked={form.bonus_penalty}
            onChange={(v) => setField("bonus_penalty", v)}
          />
          <Field label="Bonus penalty start status">
            <Select
              value={form.bonus_penalty_start_status || "assigned"}
              disabled={!form.bonus_penalty}
              onValueChange={(value) =>
                setField(
                  "bonus_penalty_start_status",
                  value ?? "assigned",
                )
              }
            >
              <SelectTrigger
                id="delivery_bonus_penalty_start_status"
                data-field="bonus_penalty_start_status"
                className="w-full"
              >
                <SelectValue placeholder="Select start status" />
              </SelectTrigger>
              <SelectContent>
                {bonusPenaltyStartStatusOptions(
                  form.bonus_penalty_start_status,
                ).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="space-y-4 border-t pt-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Common penalty
          </p>
          <FeatureToggleRow
            id="delivery_common_penalty_enabled"
            label="Common penalty enabled"
            description="Apply shared idle / online-time penalty rules."
            checked={form.common_penalty_enabled}
            onChange={(v) => setField("common_penalty_enabled", v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Idle minutes">
              <Input
                inputMode="numeric"
                value={form.common_penalty_idle_minutes}
                disabled={!form.common_penalty_enabled}
                onChange={(e) =>
                  setField(
                    "common_penalty_idle_minutes",
                    e.target.value.replace(/\D/g, ""),
                  )
                }
              />
            </Field>
            <Field label="Min online minutes">
              <Input
                inputMode="numeric"
                value={form.common_penalty_min_online_minutes}
                disabled={!form.common_penalty_enabled}
                onChange={(e) =>
                  setField(
                    "common_penalty_min_online_minutes",
                    e.target.value.replace(/\D/g, ""),
                  )
                }
              />
            </Field>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save delivery settings"}
        </Button>
      </form>
    </ShopSection>
  );
}

function ecomFormFromData(ecom: ShopEcomSettings | null | undefined) {
  const paymentMethods = Array.isArray(ecom?.payment_methods)
    ? (ecom.payment_methods as unknown[]).map(String).join(", ")
    : ecom?.payment_methods != null
      ? String(ecom.payment_methods)
      : "";
  return {
    domain: String(ecom?.domain ?? ""),
    min_order_amount: ecom?.min_order_amount != null ? String(ecom.min_order_amount) : "",
    delivery_radius_km:
      ecom?.delivery_radius_km != null ? String(ecom.delivery_radius_km) : "",
    operating_hours:
      ecom?.operating_hours == null
        ? ""
        : typeof ecom.operating_hours === "string"
          ? ecom.operating_hours
          : JSON.stringify(ecom.operating_hours, null, 2),
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
  };
}

function isShopEcomEnabled(shop: ShopDetail) {
  return Boolean(shop.features?.ecom_enabled ?? shop.ecom_enabled);
}

function EcomTab({
  shop,
  onSaved,
}: {
  shop: ShopDetail;
  onSaved: () => Promise<void>;
}) {
  const ecomEnabled = isShopEcomEnabled(shop);
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

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!ecomEnabled) {
      appToast.error("Enable ecom in Features before editing storefront settings.");
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});

    let operating_hours: unknown = undefined;
    const hoursRaw = form.operating_hours.trim();
    if (hoursRaw) {
      try {
        operating_hours = JSON.parse(hoursRaw);
      } catch {
        setError("Operating hours must be valid JSON");
        setFieldErrors({ operating_hours: "Invalid JSON" });
        setSaving(false);
        return;
      }
    }

    const payment_methods = form.payment_methods
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ecom: ShopEcomSettings = {
      domain: form.domain.trim() ? form.domain.trim().toLowerCase() : null,
      min_order_amount: form.min_order_amount.trim()
        ? Number(form.min_order_amount)
        : 0,
      delivery_radius_km: form.delivery_radius_km.trim()
        ? Number(form.delivery_radius_km)
        : null,
      operating_hours: hoursRaw ? operating_hours : null,
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
          Turn on <span className="font-medium text-foreground">Ecom enabled</span>{" "}
          in the Features tab to unlock editing.
        </div>
      ) : null}

      {!editing ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <CopyableDetail label="Domain" value={ecom?.domain} />
          <CopyableDetail
            label="Min order amount"
            value={
              ecom?.min_order_amount != null
                ? String(ecom.min_order_amount)
                : null
            }
          />
          <CopyableDetail
            label="Delivery radius (km)"
            value={
              ecom?.delivery_radius_km != null
                ? String(ecom.delivery_radius_km)
                : null
            }
          />
          <CopyableDetail
            label="WhatsApp order template"
            value={ecom?.whatsapp_order_template}
          />
          <CopyableDetail
            label="Operating hours"
            value={formatDetailValue(ecom?.operating_hours)}
          />
          <CopyableDetail
            label="Payment methods"
            value={formatDetailValue(ecom?.payment_methods)}
          />
          <CopyableDetail label="SEO title" value={ecom?.seo_title} />
          <CopyableDetail
            label="SEO description"
            value={ecom?.seo_description}
          />
          <CopyableDetail label="SEO keywords" value={ecom?.seo_keywords} />
          <CopyableDetail label="OG title" value={ecom?.og_title} />
          <CopyableDetail label="OG description" value={ecom?.og_description} />
          <CopyableDetail label="OG image" value={ecom?.og_image} />
          <CopyableDetail label="Twitter card" value={ecom?.twitter_card} />
          <CopyableDetail
            label="Robots index"
            value={
              ecom?.robots_index == null
                ? null
                : ecom.robots_index
                  ? "Yes"
                  : "No"
            }
          />
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
            <Field label="Min order amount">
              <Input
                inputMode="decimal"
                value={form.min_order_amount}
                onChange={(e) => setField("min_order_amount", e.target.value)}
              />
            </Field>
            <Field label="Delivery radius (km)">
              <Input
                inputMode="decimal"
                value={form.delivery_radius_km}
                onChange={(e) => setField("delivery_radius_km", e.target.value)}
              />
            </Field>
            <Field label="Twitter card">
              <Input
                value={form.twitter_card}
                onChange={(e) => setField("twitter_card", e.target.value)}
                placeholder="summary_large_image"
              />
            </Field>
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

          <Field label="Operating hours (JSON)">
            <Textarea
              data-field="operating_hours"
              value={form.operating_hours}
              onChange={(e) => setField("operating_hours", e.target.value)}
              rows={5}
              className="font-mono text-xs"
              placeholder='{"monday":[{"open":"09:00","close":"22:00"}]}'
            />
            {fieldErrors.operating_hours ? (
              <p className="mt-1.5 text-xs font-medium text-destructive">
                {fieldErrors.operating_hours}
              </p>
            ) : null}
          </Field>

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

function SubscriptionTab({
  shopId,
  shop,
}: {
  shopId: string;
  shop: ShopDetail;
}) {
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    amount: "299",
    status: "active",
    last_payment_date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subscriptionQuery = useQuery(shopSubscriptionQuery(shopId));
  const active =
    subscriptionQuery.data ??
    (shop.subscription as Record<string, unknown> | null | undefined) ??
    null;

  const load = async () => {
    await subscriptionQuery.refetch();
  };

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createSubscription(shopId, {
        start_date: form.start_date,
        end_date: form.end_date,
        amount: Number(form.amount),
        status: form.status,
        last_payment_date: form.last_payment_date || undefined,
      });
      appToast.success("Subscription created.");
      await load();
    } catch (err) {
      const msg = parseApiFormError(err, "Create failed").message;
      setError(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const embeddedEntries = active
    ? Object.entries(active).filter(
        ([, value]) => value != null && value !== "",
      )
    : [];

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div className="space-y-8">
        <ShopSection title="Subscription identifiers" className="max-w-none">
          <div className="grid gap-3 sm:grid-cols-2">
            <CopyableDetail
              label="Subscription ID (shop)"
              value={
                shop.subscription_id != null
                  ? String(shop.subscription_id)
                  : null
              }
            />
            <CopyableDetail
              label="Has embedded subscription"
              value={shop.subscription ? "Yes" : "No"}
            />
          </div>
        </ShopSection>

        <ShopSection title="Active subscription" className="max-w-none">
          {active ? (
            <div className="rounded-xl border bg-card p-4">
              <dl>
                {(embeddedEntries.length
                  ? embeddedEntries
                  : ([
                      ["plan", active.plan],
                      ["status", active.status],
                      ["amount", active.amount],
                      ["start_date", active.start_date],
                      ["end_date", active.end_date],
                      ["renews_at", active.renews_at],
                      ["last_payment_date", active.last_payment_date],
                      [
                        "subscription_id",
                        active.subscription_id ?? active.id,
                      ],
                    ] as [string, unknown][])
                )
                  .filter(([, value]) => value != null && value !== "")
                  .map(([key, value]) => (
                    <SubscriptionDetailRow
                      key={key}
                      label={String(key).replaceAll("_", " ")}
                      value={formatSubscriptionValue(value)}
                    />
                  ))}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active subscription.
            </p>
          )}
        </ShopSection>
      </div>

      <ShopSection
        title="Create subscription"
        description="Starts a new billing period for this shop."
        className="max-w-none"
      >
        <form onSubmit={onCreate} className="space-y-4">
          <Field label="Date range">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                required
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
              <Input
                type="date"
                required
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
              />
            </div>
          </Field>
          <Field label="Amount">
            <Input
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Input
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
          <Field label="Last payment date">
            <Input
              type="date"
              value={form.last_payment_date}
              onChange={(e) =>
                setForm({ ...form, last_payment_date: e.target.value })
              }
            />
          </Field>
          {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </form>
      </ShopSection>
    </div>
  );
}

function promotionFormFromData(
  data: ShopPromotionSettings | Record<string, unknown> | null | undefined,
) {
  return {
    promotion_header: String(data?.promotion_header ?? ""),
    promotion_content: String(data?.promotion_content ?? ""),
    promotion_link: String(data?.promotion_link ?? ""),
    promotion_image_s3_key: String(data?.promotion_image_s3_key ?? ""),
    is_marketing_enabled: Boolean(data?.is_marketing_enabled ?? false),
  };
}

function PromotionTab({
  shopId,
  shop,
}: {
  shopId: string;
  shop: ShopDetail;
}) {
  const [form, setForm] = useState(() =>
    promotionFormFromData(shop.promotion),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const promotionQuery = useQuery(shopPromotionQuery(shopId));

  useEffect(() => {
    if (promotionQuery.data) {
      setForm(promotionFormFromData(promotionQuery.data));
      return;
    }
    if (shop.promotion) {
      setForm(promotionFormFromData(shop.promotion));
    }
  }, [promotionQuery.data, shop.promotion]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await putPromotion(shopId, {
        promotion_header: form.promotion_header || null,
        promotion_content: form.promotion_content || null,
        promotion_link: form.promotion_link || null,
        promotion_image_s3_key: form.promotion_image_s3_key || null,
        is_marketing_enabled: form.is_marketing_enabled,
      });
      appToast.success("Promotion saved.");
      await promotionQuery.refetch();
    } catch (err) {
      const msg = parseApiFormError(err, "Save failed").message;
      setError(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShopSection
      title="Promotion"
      description="Marketing content shown to customers for this shop."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <CopyableDetail label="Promotion header" value={form.promotion_header} />
        <CopyableDetail
          label="Promotion content"
          value={form.promotion_content}
        />
        <CopyableDetail label="Promotion link" value={form.promotion_link} />
        <CopyableDetail
          label="Promotion image S3 key"
          value={form.promotion_image_s3_key}
        />
        <CopyableDetail
          label="Marketing enabled"
          value={form.is_marketing_enabled ? "Yes" : "No"}
        />
      </div>

      <form onSubmit={onSave} className="max-w-xl space-y-4">
        <Field label="Header">
          <Input
            value={form.promotion_header}
            onChange={(e) =>
              setForm({ ...form, promotion_header: e.target.value })
            }
          />
        </Field>
        <Field label="Content">
          <Textarea
            value={form.promotion_content}
            onChange={(e) =>
              setForm({ ...form, promotion_content: e.target.value })
            }
          />
        </Field>
        <Field label="Link">
          <Input
            value={form.promotion_link}
            onChange={(e) =>
              setForm({ ...form, promotion_link: e.target.value })
            }
          />
        </Field>
        <Field label="Promotion image S3 key">
          <Input
            value={form.promotion_image_s3_key}
            onChange={(e) =>
              setForm({ ...form, promotion_image_s3_key: e.target.value })
            }
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={form.is_marketing_enabled}
            onChange={(e) =>
              setForm({ ...form, is_marketing_enabled: e.target.checked })
            }
          />
          Marketing enabled
        </label>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save promotion"}
        </Button>
      </form>
    </ShopSection>
  );
}

function RidersTab({ shopId }: { shopId: string }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    password: "",
    age: "25",
    phone1: "",
    delivery_partner_id: "",
    third_party_id: "",
    vehicle_detail: "",
    emirates_id: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [editDpId, setEditDpId] = useState<string | null>(null);
  const [nextIdLoading, setNextIdLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [riderFilter, setRiderFilter] = useState<"all" | "deleted">("all");

  const ridersQuery = useQuery(
    shopRidersQuery(shopId, {
      page: 1,
      limit: 50,
      include_deleted: riderFilter === "deleted" ? true : undefined,
      deleted_only: riderFilter === "deleted" ? true : undefined,
    }),
  );
  const items = ridersQuery.data?.items ?? [];
  const loading = ridersQuery.isPending;
  const error = ridersQuery.error
    ? ridersQuery.error instanceof Error
      ? ridersQuery.error.message
      : "Failed to load riders"
    : null;
  const load = async () => {
    await ridersQuery.refetch();
  };

  const riderColumns: ColumnDef<Rider>[] = [
    {
      id: "delivery_partner_id",
      accessorFn: (row) => String(row.delivery_partner_id ?? ""),
      header: "ID",
      cell: ({ row }) => {
        const id = String(row.original.delivery_partner_id ?? "");
        if (!id) return "—";
        return (
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-mono text-xs">{id}</span>
            <CopyButton
              value={id}
              iconOnly
              size={13}
              label={`Copy ${id}`}
              className="size-6 shrink-0 p-0"
            />
          </div>
        );
      },
      meta: { label: "ID" },
      size: 140,
    },
    {
      id: "name",
      accessorFn: (row) =>
        [row.first_name, row.last_name].filter(Boolean).join(" "),
      header: "Name",
      cell: ({ row }) => {
        const name = [row.original.first_name, row.original.last_name]
          .filter(Boolean)
          .join(" ");
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{name || "—"}</p>
            {row.original.age != null ? (
              <p className="text-xs text-muted-foreground">
                Age {row.original.age}
              </p>
            ) : null}
          </div>
        );
      },
      meta: { label: "Name" },
      size: 180,
    },
    {
      accessorKey: "phone1",
      header: "Phone",
      cell: ({ row }) => {
        const phone = row.original.phone1;
        if (!phone) return "—";
        return (
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate tabular-nums">{phone}</span>
            <CopyButton
              value={phone}
              iconOnly
              size={13}
              label={`Copy ${phone}`}
              className="size-6 shrink-0 p-0"
            />
          </div>
        );
      },
      meta: { label: "Phone" },
      size: 160,
    },
    {
      id: "vehicle",
      accessorFn: (row) => String(row.vehicle_detail ?? ""),
      header: "Vehicle",
      cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
          {row.original.vehicle_detail || "—"}
        </span>
      ),
      meta: { label: "Vehicle" },
      size: 140,
    },
    {
      id: "status",
      accessorFn: (row) =>
        row.is_deleted ? "deleted" : row.is_blocked ? "blocked" : (row.online_status ?? "offline"),
      header: "Status",
      cell: ({ row }) =>
        row.original.is_deleted ? (
          <StatusBadge status="deleted" />
        ) : row.original.is_blocked ? (
          <StatusBadge status="blocked" />
        ) : (
          <StatusBadge status={row.original.online_status ?? "offline"} />
        ),
      meta: { label: "Status" },
      size: 110,
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const rider = row.original;
        const id = String(rider.delivery_partner_id ?? "");
        const deleted = Boolean(rider.is_deleted || rider.status === "deleted");
        const blocked = Boolean(rider.is_blocked);

        async function onToggleBlock() {
          try {
            if (blocked) await unblockRider(shopId, id);
            else await blockRider(shopId, id);
            await load();
            appToast.success(blocked ? "Rider unblocked." : "Rider blocked.");
          } catch (err) {
            const msg =
              parseApiFormError(err, "Action failed").message;
            setMessage(msg);
            appToast.error(msg);
          }
        }

        async function onResetPassword() {
          const password = prompt("New password");
          if (!password) return;
          try {
            await resetRiderPassword(shopId, id, password);
            appToast.success("Rider password reset.");
          } catch (err) {
            const msg =
              parseApiFormError(err, "Reset failed").message;
            setMessage(msg);
            appToast.error(msg);
          }
        }

        async function onSoftDelete() {
          if (!confirm("Soft delete rider?")) return;
          try {
            await deleteRider(shopId, id, false);
            await load();
            appToast.success("Rider soft-deleted.");
          } catch (err) {
            const msg =
              parseApiFormError(err, "Delete failed").message;
            setMessage(msg);
            appToast.error(msg);
          }
        }

        async function onHardDelete() {
          if (
            !confirm(
              "HARD delete this rider permanently? Usually run after soft delete.",
            )
          ) {
            return;
          }
          try {
            await deleteRider(shopId, id, true);
            await load();
            appToast.success("Rider permanently deleted.");
          } catch (err) {
            const msg =
              parseApiFormError(err, "Hard delete failed").message;
            setMessage(msg);
            appToast.error(msg);
          }
        }

        async function onRestore() {
          if (!confirm("Restore this rider?")) return;
          try {
            await restoreRider(shopId, id);
            await load();
            appToast.success("Rider restored.");
          } catch (err) {
            const msg =
              parseApiFormError(err, "Restore failed").message;
            setMessage(msg);
            appToast.error(msg);
          }
        }

        return (
          <div className="flex items-center justify-end gap-0.5">
            {deleted ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Restore rider"
                      onClick={() => void onRestore()}
                    />
                  }
                >
                  <RefreshCwIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Restore</TooltipContent>
              </Tooltip>
            ) : null}
            {!deleted ? (
              <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Edit rider"
                    onClick={() => setEditDpId(id)}
                  />
                }
              >
                <PencilIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={blocked ? "Unblock rider" : "Block rider"}
                    onClick={() => void onToggleBlock()}
                  />
                }
              >
                {blocked ? (
                  <ShieldCheckIcon className="size-3.5" />
                ) : (
                  <BanIcon className="size-3.5" />
                )}
              </TooltipTrigger>
              <TooltipContent>{blocked ? "Unblock" : "Block"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Reset password"
                    onClick={() => void onResetPassword()}
                  />
                }
              >
                <KeyRoundIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Reset password</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Soft delete rider"
                    onClick={() => void onSoftDelete()}
                  />
                }
              >
                <UserMinusIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Soft delete</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Hard delete rider"
                    onClick={() => void onHardDelete()}
                  />
                }
              >
                <Trash2Icon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Hard delete</TooltipContent>
            </Tooltip>
              </>
            ) : null}
          </div>
        );
      },
      meta: { label: "Actions" },
      size: 168,
    },
  ];

  async function prefillsNextId() {
    setNextIdLoading(true);
    setMessage(null);
    try {
      const data = await getNextRiderId(shopId);
      const rawId = data.code ?? data.delivery_partner_id ?? data.next_id ?? "";
      const id = digitsOnly(String(rawId)).slice(-4);
      setForm((f) => ({ ...f, delivery_partner_id: id }));
    } catch (err) {
      setMessage(parseApiFormError(err, "Next id failed").message);
    } finally {
      setNextIdLoading(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!isValidUaePhone(form.phone1, "mobile")) {
      const msg = "Enter a valid UAE mobile number. Leading 0 is optional.";
      setMessage(msg);
      appToast.error(msg);
      return;
    }
    setCreating(true);
    try {
      await createRider(shopId, {
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        password: form.password,
        age: Number(form.age),
        phone1: digitsOnly(form.phone1),
        delivery_partner_id: form.delivery_partner_id || undefined,
        third_party_id: form.third_party_id || undefined,
        vehicle_detail: form.vehicle_detail || undefined,
        emirates_id: form.emirates_id || undefined,
      });
      setForm({
        first_name: "",
        last_name: "",
        password: "",
        age: "25",
        phone1: "",
        delivery_partner_id: "",
        third_party_id: "",
        vehicle_detail: "",
        emirates_id: "",
      });
      await load();
      appToast.success("Rider created.");
    } catch (err) {
      const msg = parseApiFormError(err, "Create failed").message;
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-12">
      <ShopSection
        title="Add rider"
        description="Creates a delivery partner linked to this shop."
        className="max-w-3xl"
      >
        <form
          onSubmit={onCreate}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="First name">
            <Input
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </Field>
          <Field label="Last name">
            <Input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
              <div className="flex items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground">
                {UAE_COUNTRY_CODE}
              </div>
              <Input
                required
                value={form.phone1}
                className="border-0 shadow-none focus-visible:ring-0"
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone1: digitsOnly(e.target.value).slice(0, 10),
                  })
                }
                placeholder="501234567 or 0501234567"
              />
            </div>
          </Field>
          <Field label="Age">
            <Input
              required
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </Field>
          <Field label="Password">
            <Input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Delivery partner ID">
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <div className="flex items-center border-r border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                  DP
                </div>
                <Input
                  placeholder="1001"
                  value={form.delivery_partner_id}
                  className="border-0 shadow-none focus-visible:ring-0"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      delivery_partner_id: digitsOnly(e.target.value).slice(0, 4),
                    })
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={nextIdLoading || creating}
                onClick={() => void prefillsNextId()}
              >
                {nextIdLoading ? "Loading…" : "Next ID"}
              </Button>
            </div>
          </Field>
          <Field label="Third party ID">
            <Input
              placeholder="Optional"
              value={form.third_party_id}
              onChange={(e) =>
                setForm({ ...form, third_party_id: e.target.value })
              }
            />
          </Field>
          <Field label="Vehicle detail">
            <Input
              placeholder="Optional"
              value={form.vehicle_detail}
              onChange={(e) =>
                setForm({ ...form, vehicle_detail: e.target.value })
              }
            />
          </Field>
          <Field label="Emirates ID">
            <Input
              placeholder="Optional"
              value={form.emirates_id}
              onChange={(e) =>
                setForm({ ...form, emirates_id: e.target.value })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? "Creating rider…" : "Create rider"}
            </Button>
          </div>
        </form>
      </ShopSection>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <ShopSection title="Riders" className="max-w-none">
          <div className="mb-4 flex justify-end">
            <Select
              value={riderFilter}
              onValueChange={(value) =>
                setRiderFilter((value as "all" | "deleted") ?? "all")
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Active riders</SelectItem>
                <SelectItem value="deleted">Soft deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={riderColumns}
            data={items}
            searchPlaceholder="Search riders…"
            emptyMessage="No riders yet."
            getRowId={(row, index) =>
              String(row.delivery_partner_id ?? index)
            }
            initialPageSize={10}
          />
        </ShopSection>
      ) : null}

      <RiderEditDialog
        shopId={shopId}
        dpId={editDpId}
        open={Boolean(editDpId)}
        onOpenChange={(next) => {
          if (!next) setEditDpId(null);
        }}
        onChanged={load}
      />
    </div>
  );
}

function PosLinkTab({ shopId }: { shopId: string }) {
  const [form, setForm] = useState({
    mapping_profile_id: "",
    provider: "cratis",
    connector_type: "cratis",
    is_active: true,
    catalog_sync_enabled: true,
    order_push_enabled: true,
    order_pull_enabled: false,
  });
  const [error, setError] = useState<string | null>(null);

  const templatesQuery = useQuery(posTemplatesQuery({ page: 1, limit: 100 }));
  const linkQuery = useQuery(shopPosLinkQuery(shopId));
  const syncQuery = useQuery(shopSyncStatusQuery(shopId));

  const templates = templatesQuery.data?.items ?? [];
  const link = (linkQuery.data as PosShopLink | undefined) ?? null;
  const sync = (syncQuery.data as Record<string, unknown> | undefined) ?? null;

  const [syncLoading, setSyncLoading] = useState(false);

  const load = async () => {
    await Promise.all([
      templatesQuery.refetch(),
      linkQuery.refetch(),
      syncQuery.refetch(),
    ]);
  };

  async function onRefreshSync() {
    setSyncLoading(true);
    try {
      await syncQuery.refetch();
      appToast.success("Sync status refreshed.");
    } catch {
      appToast.error("Failed to refresh sync status.");
    } finally {
      setSyncLoading(false);
    }
  }

  useEffect(() => {
    const existing = linkQuery.data as PosShopLink | undefined;
    if (!existing) return;
    setForm({
      mapping_profile_id: String(existing.mapping_profile_id ?? ""),
      provider: String(existing.provider ?? "cratis"),
      connector_type: String(existing.connector_type ?? "cratis"),
      is_active: Boolean(existing.is_active ?? true),
      catalog_sync_enabled: Boolean(existing.catalog_sync_enabled ?? true),
      order_push_enabled: Boolean(existing.order_push_enabled ?? true),
      order_pull_enabled: Boolean(existing.order_pull_enabled ?? false),
    });
  }, [linkQuery.data]);

  const templateOptions = useMemo(() => templates, [templates]);

  async function onAttach(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await attachShopLink(shopId, {
        mapping_profile_id: Number(form.mapping_profile_id),
        provider: form.provider,
        connector_type: form.connector_type,
        is_active: form.is_active,
        catalog_sync_enabled: form.catalog_sync_enabled,
        order_push_enabled: form.order_push_enabled,
        order_pull_enabled: form.order_pull_enabled,
      });
      appToast.success("POS link attached.");
      await load();
    } catch (err) {
      const msg = parseApiFormError(err, "Attach failed").message;
      setError(msg);
      appToast.error(msg);
    }
  }

  async function onFeatures() {
    setError(null);
    try {
      await patchLinkFeatures(shopId, {
        catalog_sync_enabled: form.catalog_sync_enabled,
        order_push_enabled: form.order_push_enabled,
        order_pull_enabled: form.order_pull_enabled,
        is_active: form.is_active,
      });
      appToast.success("POS link features updated.");
      await load();
    } catch (err) {
      const msg = parseApiFormError(err, "Update failed").message;
      setError(msg);
      appToast.error(msg);
    }
  }

  return (
    <div className="space-y-12">
      <ShopSection
        title="POS link"
        description="Attach a mapping template and toggle sync features."
      >
        <form onSubmit={onAttach} className="max-w-xl space-y-4">
          <Field label="Template">
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={form.mapping_profile_id}
              onChange={(e) =>
                setForm({ ...form, mapping_profile_id: e.target.value })
              }
              required
            >
              <option value="">Select template…</option>
              {templateOptions.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name} ({t.provider})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider">
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </Field>
            <Field label="Connector type">
              <Input
                value={form.connector_type}
                onChange={(e) => setForm({ ...form, connector_type: e.target.value })}
              />
            </Field>
          </div>
          <div className="divide-y border-y">
            <label className="flex items-center gap-2 py-3 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.catalog_sync_enabled}
                onChange={(e) =>
                  setForm({ ...form, catalog_sync_enabled: e.target.checked })
                }
              />
              Catalog sync
            </label>
            <label className="flex items-center gap-2 py-3 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.order_push_enabled}
                onChange={(e) =>
                  setForm({ ...form, order_push_enabled: e.target.checked })
                }
              />
              Order push
            </label>
            <label className="flex items-center gap-2 py-3 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.order_pull_enabled}
                onChange={(e) =>
                  setForm({ ...form, order_pull_enabled: e.target.checked })
                }
              />
              Order pull
            </label>
          </div>
          {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
          <div className="flex gap-2">
            <Button type="submit">Save link</Button>
            <Button type="button" variant="outline" onClick={() => void onFeatures()}>
              Update features
            </Button>
          </div>
        </form>
      </ShopSection>

      {link ? (
        <ShopSection title="Current link" className="max-w-3xl">
          <pre className="overflow-auto rounded-lg bg-muted/50 p-4 text-xs leading-relaxed">
            {JSON.stringify(link, null, 2)}
          </pre>
        </ShopSection>
      ) : null}
      {sync ? (
        <ShopSection title="Sync status" className="max-w-3xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Live POS sync state for this shop.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncLoading || syncQuery.isFetching}
              onClick={() => void onRefreshSync()}
            >
              <RefreshCwIcon
                className={cn(
                  "size-3.5",
                  (syncLoading || syncQuery.isFetching) && "animate-spin",
                )}
              />
              {syncLoading || syncQuery.isFetching
                ? "Refreshing…"
                : "Refresh sync status"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["shop_id", "Shop ID"],
                ["last_sync_at", "Last synced"],
                ["catalog_status", "Catalog status"],
                ["order_status", "Order status"],
                ["pending_items", "Pending items"],
              ] as const
            ).map(([key, label]) => {
              const raw = (sync as Record<string, unknown>)[key];
              let display = raw != null ? String(raw) : "—";
              if (key === "last_sync_at" && raw) {
                try {
                  display = new Date(String(raw)).toLocaleString("en-AE", {
                    timeZone: "Asia/Dubai",
                    dateStyle: "medium",
                    timeStyle: "short",
                  });
                } catch {
                  // keep raw value
                }
              }
              const isStatus = key === "catalog_status" || key === "order_status";
              const tone =
                isStatus && display === "ok"
                  ? "text-emerald-700 bg-emerald-500/10"
                  : isStatus && display !== "—"
                    ? "text-destructive bg-destructive/10"
                    : "text-foreground";

              return (
                <div
                  key={key}
                  className="flex flex-col gap-1 rounded-xl border bg-card p-3"
                >
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isStatus
                        ? `inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs capitalize ${tone}`
                        : "font-mono text-xs",
                    )}
                  >
                    {display}
                  </span>
                </div>
              );
            })}
          </div>

          {Object.keys(sync).some(
            (k) =>
              !["shop_id", "last_sync_at", "catalog_status", "order_status", "pending_items"].includes(k),
          ) ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Show full sync payload
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted/50 p-4 text-xs leading-relaxed">
                {JSON.stringify(sync, null, 2)}
              </pre>
            </details>
          ) : null}
        </ShopSection>
      ) : (
        <ShopSection title="Sync status" className="max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              No sync data loaded yet.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncLoading || syncQuery.isFetching}
              onClick={() => void onRefreshSync()}
            >
              <RefreshCwIcon
                className={cn(
                  "size-3.5",
                  (syncLoading || syncQuery.isFetching) && "animate-spin",
                )}
              />
              {syncLoading || syncQuery.isFetching ? "Loading…" : "Load sync status"}
            </Button>
          </div>
        </ShopSection>
      )}
    </div>
  );
}
