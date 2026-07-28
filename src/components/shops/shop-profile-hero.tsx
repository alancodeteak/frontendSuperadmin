"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, Loader2Icon, MapPinIcon, StoreIcon, Trash2Icon } from "lucide-react";

import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { clearShopPhoto, patchShopPhoto } from "@/lib/api/shops";
import type { ShopDetail } from "@/types/api";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function shopPhotoUrl(shop: ShopDetail): string | null {
  const profile = shop.profile;
  const candidates = [
    shop.photo_url,
    profile?.photo_url,
    shop.photo,
    profile?.photo,
  ];

  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value || value === "null" || value === "undefined") continue;
    return value;
  }

  return null;
}

function shopCoords(shop: ShopDetail): { lat: number; lng: number } | null {
  const lat = shop.address?.latitude;
  const lng = shop.address?.longitude;
  if (typeof lat === "number" && typeof lng === "number") {
    return { lat, lng };
  }
  return null;
}

function addressLabel(shop: ShopDetail): string | null {
  const a = shop.address;
  if (!a) return null;
  return (
    [a.address_line_1, a.locality, a.city].filter(Boolean).join(", ") || null
  );
}

function mapEmbedSrc(shop: ShopDetail): string | null {
  const coords = shopCoords(shop);
  const query = coords
    ? `${coords.lat},${coords.lng}`
    : addressLabel(shop);
  if (!query) return null;

  const key = siteConfig.googleMapsApiKey;
  if (key) {
    const params = new URLSearchParams({
      key,
      q: query,
      zoom: "15",
    });
    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
  }

  const params = new URLSearchParams({
    q: query,
    z: "15",
    output: "embed",
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}

function readFileAsBase64(file: File): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const match = /^data:([^;]+);base64,(.+)$/.exec(result);
      if (!match) {
        reject(new Error("Could not read image"));
        return;
      }
      resolve({ contentType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function ShopProfileHero({
  shop,
  onPhotoUpdated,
  fullWidth = false,
}: {
  shop: ShopDetail;
  onPhotoUpdated?: () => Promise<void> | void;
  /** Stretch to the full main content width (no card inset). */
  fullWidth?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const photo = shopPhotoUrl(shop);
  const mapSrc = mapEmbedSrc(shop);
  const location = addressLabel(shop);
  const coords = shopCoords(shop);
  const displayName =
    shop.shop_name || shop.profile?.shop_name || shop.shop_id;
  const email = shop.email ?? shop.profile?.email ?? null;
  const phone = shop.phone ?? shop.profile?.phone ?? null;
  const showPhoto = Boolean(photo) && !broken;

  useEffect(() => {
    setBroken(false);
  }, [photo]);

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setMessage(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setMessage("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage("Image must be 5 MB or smaller.");
      return;
    }

    setBusy(true);
    try {
      const { base64, contentType } = await readFileAsBase64(file);
      await patchShopPhoto(shop.shop_id, {
        photo_base64: base64,
        photo_content_type: contentType,
      });
      setBroken(false);
      await onPhotoUpdated?.();
      appToast.success("Profile photo updated.");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to upload photo";
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!confirm("Remove this shop profile photo?")) return;
    setBusy(true);
    setMessage(null);
    try {
      await clearShopPhoto(shop.shop_id);
      setBroken(false);
      await onPhotoUpdated?.();
      appToast.success("Profile photo removed.");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to remove photo";
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={
        fullWidth
          ? "w-full overflow-hidden border-b bg-card"
          : "mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm"
      }
    >
      <div
        className={
          fullWidth
            ? "relative h-52 w-full bg-muted sm:h-64 md:h-80"
            : "relative h-44 bg-muted sm:h-56 md:h-72"
        }
      >
        {mapSrc ? (
          <iframe
            title={`${displayName} location map`}
            src={mapSrc}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            <MapPinIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No map location set for this shop
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-card via-card/95 to-transparent sm:h-48 md:h-56" />
      </div>

      <div
        className={
          fullWidth
            ? "relative px-6 pb-6 sm:px-8"
            : "relative px-4 pb-5 sm:px-6"
        }
      >
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative size-28 shrink-0 sm:size-32">
            <div className="relative size-full overflow-hidden rounded-full border-4 border-card bg-muted shadow-md">
              {showPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo!}
                  alt={`${displayName} profile`}
                  className="size-full object-cover"
                  onError={() => setBroken(true)}
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-primary/10 text-primary">
                  <StoreIcon className="size-12" />
                </div>
              )}
              {busy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <Loader2Icon className="size-7 animate-spin text-white" />
                </div>
              ) : null}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => void handleFileChange(e.target.files?.[0])}
            />

            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              disabled={busy}
              className="absolute right-1 bottom-1 z-10 rounded-full border shadow-md"
              aria-label="Change profile photo"
              title="Change profile photo"
              onClick={() => fileInputRef.current?.click()}
            >
              <CameraIcon className="size-3.5" />
            </Button>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-semibold tracking-tight">
                {displayName}
              </h2>
              <StatusBadge status={shop.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{shop.shop_id}</span>
              <CopyButton
                value={shop.shop_id}
                iconOnly
                size={13}
                label="Copy shop ID"
                className="size-7 p-0"
              />
              {email ? <span>{email}</span> : null}
              {phone ? <span>{phone}</span> : null}
            </div>
            {location ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  {location}
                  {coords
                    ? ` · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : ""}
                </span>
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <CameraIcon className="size-3.5" />
                {showPhoto ? "Change photo" : "Upload photo"}
              </Button>
              {showPhoto ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleRemove()}
                >
                  <Trash2Icon className="size-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>

            {message ? (
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
