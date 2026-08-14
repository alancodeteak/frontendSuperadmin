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
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { deleteRider, patchRider } from "@/lib/api/riders";
import { shopRiderQuery } from "@/lib/queries/shops";
import { toE164Phone } from "@yaadro/phone-kit";

type RiderEditDialogProps = {
  shopId: string;
  dpId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
};

export function RiderEditDialog({
  shopId,
  dpId,
  open,
  onOpenChange,
  onChanged,
}: RiderEditDialogProps) {
  const riderQuery = useQuery({
    ...shopRiderQuery(shopId, dpId ?? ""),
    enabled: open && Boolean(shopId && dpId),
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone1: "",
    age: "",
    vehicle_detail: "",
    emirates_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const rider = riderQuery.data;
    if (!rider) return;
    setForm({
      first_name: String(rider.first_name ?? ""),
      last_name: String(rider.last_name ?? ""),
      phone1: String(rider.phone1 ?? ""),
      age: rider.age != null ? String(rider.age) : "",
      vehicle_detail: String(rider.vehicle_detail ?? ""),
      emirates_id: String(rider.emirates_id ?? ""),
    });
    setMessage(null);
  }, [riderQuery.data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dpId) return;
    setSaving(true);
    setMessage(null);
    try {
      const phone = toE164Phone(form.phone1, "mobile");
      if (!phone) {
        setMessage("Enter a valid mobile number.");
        return;
      }
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        phone1: phone,
        vehicle_detail: form.vehicle_detail.trim() || undefined,
        emirates_id: form.emirates_id.trim() || undefined,
      };
      if (form.age.trim()) payload.age = Number(form.age);
      await patchRider(shopId, dpId, payload);
      appToast.success("Rider updated.");
      await riderQuery.refetch();
      await onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Update failed";
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onHardDelete() {
    if (!dpId) return;
    if (
      !confirm(
        "HARD delete this rider permanently? Requires idle DP with zero orders (usually after soft delete). This cannot be undone.",
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await deleteRider(shopId, dpId, true);
      appToast.success("Rider permanently deleted.");
      onOpenChange(false);
      await onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Hard delete failed";
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const rider = riderQuery.data;
  const loadError = riderQuery.error
    ? riderQuery.error instanceof Error
      ? riderQuery.error.message
      : "Failed to load rider"
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rider {dpId}</DialogTitle>
        </DialogHeader>

        {riderQuery.isPending ? <LoadingState label="Loading rider…" /> : null}
        {loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => void riderQuery.refetch()}
          />
        ) : null}

        {rider ? (
          <form onSubmit={onSave} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {rider.is_blocked ? (
                <StatusBadge status="blocked" />
              ) : (
                <StatusBadge status={String(rider.online_status ?? "offline")} />
              )}
              <span className="font-mono text-xs text-muted-foreground">
                {String(rider.delivery_partner_id ?? dpId)}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rider-first">First name</Label>
                <Input
                  id="rider-first"
                  required
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rider-last">Last name</Label>
                <Input
                  id="rider-last"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rider-phone">Phone</Label>
                <InternationalPhoneInput
                  id="rider-phone"
                  required
                  mode="mobile"
                  value={form.phone1}
                  onChange={(phone1) => setForm({ ...form, phone1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rider-age">Age</Label>
                <Input
                  id="rider-age"
                  type="number"
                  min={16}
                  max={80}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rider-vehicle">Vehicle detail</Label>
                <Input
                  id="rider-vehicle"
                  value={form.vehicle_detail}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_detail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rider-emirates">Emirates ID</Label>
                <Input
                  id="rider-emirates"
                  value={form.emirates_id}
                  onChange={(e) =>
                    setForm({ ...form, emirates_id: e.target.value })
                  }
                />
              </div>
            </div>

            {message ? (
              <p
                className={`text-sm ${
                  message.includes("updated")
                    ? "text-emerald-700"
                    : "text-destructive"
                }`}
              >
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => void onHardDelete()}
              >
                Hard delete
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
