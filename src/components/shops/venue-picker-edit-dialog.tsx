"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { patchVenuePicker } from "@/lib/api/venue-pickers";
import { shopVenuePickerQuery } from "@/lib/queries/shops";
import {
  VENUE_PICKER_SCOPE_OPTIONS,
  parseDiningAreaIds,
  formatDiningAreaIds,
} from "@/lib/venue-picker-form";
import type { VenuePickerScope } from "@/types/api";

type VenuePickerEditDialogProps = {
  shopId: string;
  pickerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
};

export function VenuePickerEditDialog({
  shopId,
  pickerId,
  open,
  onOpenChange,
  onChanged,
}: VenuePickerEditDialogProps) {
  const pickerQuery = useQuery({
    ...shopVenuePickerQuery(shopId, pickerId ?? ""),
    enabled: open && Boolean(shopId && pickerId),
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    scope: "all_venue" as VenuePickerScope,
    dining_area_ids: "",
    third_party_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const picker = pickerQuery.data;
    if (!picker) return;
    setForm({
      name: String(picker.name ?? ""),
      phone: String(picker.phone ?? ""),
      scope: (picker.scope as VenuePickerScope) || "all_venue",
      dining_area_ids: formatDiningAreaIds(picker.dining_area_ids),
      third_party_id: String(picker.third_party_id ?? ""),
    });
    setMessage(null);
  }, [pickerQuery.data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!pickerId) return;
    setSaving(true);
    setMessage(null);
    try {
      const diningAreaIds = parseDiningAreaIds(form.dining_area_ids);
      if (diningAreaIds === null) {
        const msg = "Dining area IDs must be positive integers (comma-separated).";
        setMessage(msg);
        appToast.error(msg);
        return;
      }
      await patchVenuePicker(shopId, pickerId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        scope: form.scope,
        dining_area_ids: diningAreaIds,
        third_party_id: form.third_party_id.trim() || null,
      });
      appToast.success("Picker updated.");
      await pickerQuery.refetch();
      await onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Update failed";
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const picker = pickerQuery.data;
  const loadError = pickerQuery.error
    ? pickerQuery.error instanceof Error
      ? pickerQuery.error.message
      : "Failed to load picker"
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Picker {pickerId}</DialogTitle>
        </DialogHeader>

        {pickerQuery.isPending ? <LoadingState label="Loading picker…" /> : null}
        {loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => void pickerQuery.refetch()}
          />
        ) : null}

        {picker ? (
          <form onSubmit={onSave} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {picker.is_blocked ? (
                <StatusBadge status="blocked" />
              ) : (
                <StatusBadge status="active" />
              )}
              <span className="font-mono text-xs text-muted-foreground">
                {String(picker.venue_picker_id ?? pickerId)}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="picker-name">Name</Label>
                <Input
                  id="picker-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="picker-phone">Phone</Label>
                <Input
                  id="picker-phone"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="picker-scope">Scope</Label>
                <Select
                  value={form.scope}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      scope: (value as VenuePickerScope) ?? "all_venue",
                    })
                  }
                >
                  <SelectTrigger id="picker-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_PICKER_SCOPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="picker-dining">Dining area IDs</Label>
                <Input
                  id="picker-dining"
                  placeholder="e.g. 1, 2, 3"
                  value={form.dining_area_ids}
                  onChange={(e) =>
                    setForm({ ...form, dining_area_ids: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="picker-third">Third party ID</Label>
                <Input
                  id="picker-third"
                  placeholder="Optional"
                  value={form.third_party_id}
                  onChange={(e) =>
                    setForm({ ...form, third_party_id: e.target.value })
                  }
                />
              </div>
            </div>

            {message ? (
              <p className="text-sm text-destructive">{message}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
