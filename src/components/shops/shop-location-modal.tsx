"use client";

import { useEffect, useState } from "react";

import {
  ShopLocationPicker,
  type ShopLocationPickerValue,
} from "@/components/shops/shop-location-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { patchShop } from "@/lib/api/shops";
import { DEFAULT_MAP_CENTER } from "@/lib/google-maps-address";
import {
  inferUaePhoneType,
  normalizeUaePhoneInput,
  UAE_COUNTRY_CODE,
} from "@/lib/shop-create-validation";
import type { ShopAddress, ShopDetail } from "@/types/api";

function toPickerValue(address: ShopAddress | null | undefined): ShopLocationPickerValue {
  const lat =
    typeof address?.latitude === "number" ? address.latitude : DEFAULT_MAP_CENTER.lat;
  const lng =
    typeof address?.longitude === "number"
      ? address.longitude
      : DEFAULT_MAP_CENTER.lng;

  return {
    address_line_1: String(address?.address_line_1 ?? ""),
    address_line_2: String(address?.address_line_2 ?? ""),
    locality: String(address?.locality ?? ""),
    city: String(address?.city ?? ""),
    contact_number_type: address?.contact_number
      ? inferUaePhoneType(String(address.contact_number))
      : "landline",
    contact_number: address?.contact_number
      ? normalizeUaePhoneInput(String(address.contact_number))
      : UAE_COUNTRY_CODE,
    latitude: String(lat),
    longitude: String(lng),
  };
}

export function ShopLocationModal({
  shop,
  open,
  onOpenChange,
  onSaved,
}: {
  shop: ShopDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState(() => toPickerValue(shop.address));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toPickerValue(shop.address));
    setError(null);
  }, [open, shop]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);
      await patchShop(shop.shop_id, {
        address: {
          address_line_1: form.address_line_1 || null,
          address_line_2: form.address_line_2 || null,
          locality: form.locality || null,
          city: form.city || null,
          contact_number: form.contact_number || null,
          latitude: Number.isFinite(latitude) ? latitude : null,
          longitude: Number.isFinite(longitude) ? longitude : null,
        },
      });
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Update shop location</DialogTitle>
          <DialogDescription>
            Search or click the map to set the pin. Address fields update from
            Google when available — edit them before saving.
          </DialogDescription>
        </DialogHeader>

        <ShopLocationPicker value={form} onChange={setForm} />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Saving…" : "Save location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
