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
  ShieldCheckIcon,
  Trash2Icon,
  UserMinusIcon,
} from "lucide-react";

import { ShopLocationModal } from "@/components/shops/shop-location-modal";
import { ShopProfileHero } from "@/components/shops/shop-profile-hero";
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
import { appToast } from "@/lib/app-toast";
import {
  deleteShop,
  patchShop,
  putDeliverySettings,
  putPromotion,
  createSubscription,
  resetShopPassword,
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
  shopDeliveryQuery,
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
  ShopDetail,
  ShopFeatures,
  ShopProduct,
} from "@/types/api";

const TABS = [
  "overview",
  "features",
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

  async function onSoftDelete() {
    if (!confirm("Soft-delete this shop?")) return;
    try {
      await deleteShop(shopId, false);
      appToast.success("Shop soft-deleted.");
      router.push("/shops");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setMessage(msg);
      appToast.error(msg);
    }
  }

  async function onHardDelete() {
    if (!confirm("HARD delete this shop? This cannot be undone.")) return;
    try {
      await deleteShop(shopId, true);
      appToast.success("Shop permanently deleted.");
      router.push("/shops");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setMessage(msg);
      appToast.error(msg);
    }
  }

  async function onForceLogout() {
    const confirmed = confirm(
      "All online shop owners and delivery partners for this shop will see a 30-second logout alert. Offline users will not be affected.\n\nSend logout alert now?",
    );
    if (!confirmed) return;

    setLogoutBusy(true);
    setLogoutNote(null);
    setMessage(null);
    try {
      const res = await triggerShopLogoutEvent(shopId);
      setLogoutNote(
        `Logout alert accepted · event ${res.event_id} · ${new Date(res.occurred_at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })}`,
      );
      appToast.success("Logout alert sent to online sessions.");
    } catch (err) {
      let msg: string;
      if (err instanceof ApiError) {
        if (err.status === 404) {
          msg = "Shop not found — cannot send logout alert.";
        } else if (err.status === 403) {
          msg = "You need superadmin access to send logout alerts.";
        } else if (err.status >= 500) {
          msg = "Server error sending logout alert. Please retry.";
        } else {
          msg = err.message;
        }
      } else {
        msg = "Failed to send logout alert. Please retry.";
      }
      setMessage(msg);
      appToast.error(msg);
    } finally {
      window.setTimeout(() => setLogoutBusy(false), 2500);
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

  return (
    <div className="min-h-0 w-full flex-1 overflow-auto">
      <ShopProfileHero shop={shop} onPhotoUpdated={loadShop} fullWidth />

      <div className="px-6 pt-4 pb-8 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/shops" />}>
            ← Shops
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={logoutBusy}
              onClick={() => void onForceLogout()}
            >
              {logoutBusy ? "Sending…" : "Force logout"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onSoftDelete}>
              Soft delete
            </Button>
            <Button variant="destructive" size="sm" onClick={onHardDelete}>
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
        {tab === "products" ? <ProductsTab shopId={shopId} /> : null}
        {tab === "delivery" ? <DeliveryTab shopId={shopId} /> : null}
        {tab === "subscription" ? <SubscriptionTab shopId={shopId} /> : null}
        {tab === "promotion" ? <PromotionTab shopId={shopId} /> : null}
        {tab === "riders" ? <RidersTab shopId={shopId} /> : null}
        {tab === "pos" ? <PosLinkTab shopId={shopId} /> : null}
      </div>
    </div>
  );
}

function OverviewTab({
  shop,
  onSaved,
}: {
  shop: ShopDetail;
  onSaved: () => Promise<void>;
}) {
  const initialForm = useMemo(
    () => ({
      shop_name: shop.shop_name ?? shop.profile?.shop_name ?? "",
      phone: shop.phone ?? shop.profile?.phone ?? "",
      email: shop.email ?? shop.profile?.email ?? "",
      ecom_slug: shop.ecom_slug ?? shop.features?.ecom_slug ?? "",
      status: String(shop.status ?? "active"),
    }),
    [shop],
  );
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setForm(initialForm);
    setEditing(false);
  }, [initialForm]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await patchShop(shop.shop_id, {
        shop_name: form.shop_name,
        phone: form.phone,
        email: form.email,
        status: form.status,
      });
      await onSaved();
      setEditing(false);
      appToast.success("Shop details saved.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const address = shop.address;
  const addressLabel = address
    ? [address.address_line_1, address.locality, address.city]
        .filter(Boolean)
        .join(", ")
    : null;
  const coordinates =
    typeof address?.latitude === "number" && typeof address?.longitude === "number"
      ? `${address.latitude.toFixed(5)}, ${address.longitude.toFixed(5)}`
      : null;

  return (
    <div className="space-y-12">
      <ShopSection
        title="Shop details"
        description="Core profile used across ecom, POS, and billing."
        actions={
          !editing ? (
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : null
        }
      >
        <form onSubmit={onSave} className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CopyableDetail label="Shop ID" value={shop.shop_id} />
            <CopyableDetail label="Shop name" value={form.shop_name} />
            <CopyableDetail label="Phone" value={form.phone} />
            <CopyableDetail label="Email" value={form.email} />
            <CopyableDetail label="Ecom slug" value={form.ecom_slug} />
            <CopyableDetail label="Address" value={addressLabel} />
            <CopyableDetail label="Coordinates" value={coordinates} />
            <CopyableDetail
              label="Location contact"
              value={address?.contact_number ?? null}
            />
          </div>

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Shop name">
              <Input
                value={form.shop_name}
                disabled={!editing}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                disabled={!editing}
                onValueChange={(value) => setForm({ ...form, status: value ?? "active" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                disabled={!editing}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                value={form.email}
                disabled={!editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Ecom slug" className="space-y-1.5 sm:col-span-2">
              <Input value={form.ecom_slug} disabled readOnly />
            </Field>
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
            {addressLabel ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="mt-0.5 font-medium">{addressLabel}</dd>
                </div>
                {coordinates ? (
                  <div>
                    <dt className="text-muted-foreground">Coordinates</dt>
                    <dd className="mt-0.5 font-mono text-xs">{coordinates}</dd>
                  </div>
                ) : null}
                {address?.contact_number ? (
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd className="mt-0.5">{address.contact_number}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No location set yet.
              </p>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
                err instanceof ApiError ? err.message : "Password reset failed";
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
  >
> & { ecom_slug: string } {
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
  };
}

function FeatureToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 border-b border-border/60 py-3.5 last:border-b-0 ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-muted/30"
      }`}
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
      </span>
    </label>
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
  // Keep form in sync when shop reloads after save
  useEffect(() => {
    setForm(readShopFeatures(shop));
  }, [shop]);

  function setFlag<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "ecom_enabled" && value === false) {
        next.ecom_order_confirmation_enabled = false;
        next.customer_ticket = false;
      }
      return next;
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const ecomEnabled = form.ecom_enabled;
      await patchShop(shop.shop_id, {
        ecom_enabled: ecomEnabled,
        ecom_slug: form.ecom_slug || undefined,
        ecom_order_confirmation_enabled: ecomEnabled
          ? form.ecom_order_confirmation_enabled
          : false,
        scheduled_order: form.scheduled_order,
        merge_order: form.merge_order,
        return_option: form.return_option,
        customer_ticket: ecomEnabled ? form.customer_ticket : false,
      });
      appToast.success("Feature flags saved.");
      await onSaved();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to save feature flags";
      setError(message);
      appToast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShopSection
      title="Feature flags"
      description="Flat PATCH to shop settings. Confirmation requires ecom enabled."
    >
      <form onSubmit={onSave} className="space-y-6">
        <Field label="Ecom slug">
          <Input
            id="features_ecom_slug"
            value={form.ecom_slug}
            onChange={(e) => setFlag("ecom_slug", e.target.value)}
            placeholder="my-shop-slug"
          />
        </Field>

        <div>
          <FeatureToggleRow
            id="feat_ecom_enabled"
            label="Ecom enabled"
            description="Master switch for online ecommerce."
            checked={form.ecom_enabled}
            onChange={(v) => setFlag("ecom_enabled", v)}
          />
          <FeatureToggleRow
            id="feat_ecom_order_confirmation_enabled"
            label="Ecom order confirmation"
            description="Shop must accept/reject blank ecom orders before fulfillment."
            checked={form.ecom_order_confirmation_enabled}
            disabled={!form.ecom_enabled}
            onChange={(v) => setFlag("ecom_order_confirmation_enabled", v)}
          />
          <FeatureToggleRow
            id="feat_scheduled_order"
            label="Scheduled orders"
            description="Enables scheduled-order APIs in the shop DMS."
            checked={form.scheduled_order}
            onChange={(v) => setFlag("scheduled_order", v)}
          />
          <FeatureToggleRow
            id="feat_merge_order"
            label="Merge orders"
            description="Enables order merge and customer credit in the shop DMS."
            checked={form.merge_order}
            onChange={(v) => setFlag("merge_order", v)}
          />
          <FeatureToggleRow
            id="feat_return_option"
            label="Return option"
            description="Allow product returns for this shop."
            checked={form.return_option}
            onChange={(v) => setFlag("return_option", v)}
          />
          <FeatureToggleRow
            id="feat_customer_ticket"
            label="Customer tickets"
            description="Customer support tickets. Requires ecom."
            checked={form.customer_ticket}
            disabled={!form.ecom_enabled}
            onChange={(v) => setFlag("customer_ticket", v)}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

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

function DeliveryTab({ shopId }: { shopId: string }) {
  const [form, setForm] = useState({
    delivery_time: "30",
    self_assigned: true,
    pickup_disabled: false,
    bonus_penalty: false,
    bonus_penalty_start_status: "assigned",
    common_penalty_enabled: false,
    common_penalty_idle_minutes: "45",
    common_penalty_min_online_minutes: "45",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deliveryQuery = useQuery(shopDeliveryQuery(shopId));
  const loading = deliveryQuery.isPending;

  useEffect(() => {
    const data = deliveryQuery.data;
    if (!data) return;
    setForm({
      delivery_time: String(data.delivery_time ?? 30),
      self_assigned: Boolean(data.self_assigned ?? true),
      pickup_disabled: Boolean(data.pickup_disabled ?? false),
      bonus_penalty: Boolean(data.bonus_penalty ?? false),
      bonus_penalty_start_status: String(
        data.bonus_penalty_start_status ?? "assigned",
      ),
      common_penalty_enabled: Boolean(data.common_penalty_enabled ?? false),
      common_penalty_idle_minutes: String(
        data.common_penalty_idle_minutes ?? 45,
      ),
      common_penalty_min_online_minutes: String(
        data.common_penalty_min_online_minutes ?? 45,
      ),
    });
  }, [deliveryQuery.data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await putDeliverySettings(shopId, {
        delivery_time: Number(form.delivery_time),
        self_assigned: form.self_assigned,
        pickup_disabled: form.pickup_disabled,
        bonus_penalty: form.bonus_penalty,
        bonus_penalty_start_status: form.bonus_penalty_start_status,
        common_penalty_enabled: form.common_penalty_enabled,
        common_penalty_idle_minutes: Number(form.common_penalty_idle_minutes),
        common_penalty_min_online_minutes: Number(
          form.common_penalty_min_online_minutes,
        ),
      });
      appToast.success("Delivery settings saved.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <ShopSection
      title="Delivery settings"
      description="Defaults applied when the shop fulfills orders."
    >
      <form onSubmit={onSave} className="max-w-md space-y-5">
        <Field label="Delivery time (min)">
          <Input
            value={form.delivery_time}
            onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={form.self_assigned}
            onChange={(e) => setForm({ ...form, self_assigned: e.target.checked })}
          />
          Self assigned
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={form.pickup_disabled}
            onChange={(e) =>
              setForm({ ...form, pickup_disabled: e.target.checked })
            }
          />
          Pickup disabled
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save delivery settings"}
        </Button>
      </form>
    </ShopSection>
  );
}

function SubscriptionTab({ shopId }: { shopId: string }) {
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
  const active = subscriptionQuery.data ?? null;
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
      const msg = err instanceof ApiError ? err.message : "Create failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <ShopSection title="Active subscription" className="max-w-none">
        {active ? (
          <div className="rounded-xl border bg-card p-4">
            <dl>
              {[
                ["Plan", active.plan],
                ["Status", active.status],
                ["Amount", active.amount],
                ["Start date", active.start_date],
                ["End date", active.end_date],
                ["Renews at", active.renews_at],
                ["Last payment", active.last_payment_date],
                ["Subscription ID", active.subscription_id ?? active.id],
              ]
                .filter(([, value]) => value != null && value !== "")
                .map(([label, value]) => (
                  <SubscriptionDetailRow
                    key={label}
                    label={label}
                    value={formatSubscriptionValue(value)}
                  />
                ))}
            </dl>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active subscription.</p>
        )}
      </ShopSection>
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
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
              <Input
                type="date"
                required
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
          <Field label="Last payment date">
            <Input
              type="date"
              value={form.last_payment_date}
              onChange={(e) =>
                setForm({ ...form, last_payment_date: e.target.value })
              }
            />
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </form>
      </ShopSection>
    </div>
  );
}

function PromotionTab({ shopId }: { shopId: string }) {
  const [form, setForm] = useState({
    promotion_header: "",
    promotion_content: "",
    promotion_link: "",
    is_marketing_enabled: true,
  });
  const [error, setError] = useState<string | null>(null);

  const promotionQuery = useQuery(shopPromotionQuery(shopId));

  useEffect(() => {
    const data = promotionQuery.data;
    if (!data) return;
    setForm({
      promotion_header: String(data.promotion_header ?? ""),
      promotion_content: String(data.promotion_content ?? ""),
      promotion_link: String(data.promotion_link ?? ""),
      is_marketing_enabled: Boolean(data.is_marketing_enabled ?? true),
    });
  }, [promotionQuery.data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await putPromotion(shopId, form);
      appToast.success("Promotion saved.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setError(msg);
      appToast.error(msg);
    }
  }

  return (
    <ShopSection
      title="Promotion"
      description="Marketing content shown to customers for this shop."
    >
      <form onSubmit={onSave} className="max-w-xl space-y-4">
        <Field label="Header">
          <Input
            value={form.promotion_header}
            onChange={(e) => setForm({ ...form, promotion_header: e.target.value })}
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
            onChange={(e) => setForm({ ...form, promotion_link: e.target.value })}
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
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit">Save promotion</Button>
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
              err instanceof ApiError ? err.message : "Action failed";
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
              err instanceof ApiError ? err.message : "Reset failed";
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
              err instanceof ApiError ? err.message : "Delete failed";
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
              err instanceof ApiError ? err.message : "Hard delete failed";
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
              err instanceof ApiError ? err.message : "Restore failed";
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
      setMessage(err instanceof ApiError ? err.message : "Next id failed");
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
      const msg = err instanceof ApiError ? err.message : "Create failed";
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
      const msg = err instanceof ApiError ? err.message : "Attach failed";
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
      const msg = err instanceof ApiError ? err.message : "Update failed";
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
