"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  KeyRoundIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import {
  ShopConfirmDialog,
  type ShopConfirmPhase,
} from "@/components/shops/shop-confirm-dialog";
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
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import { PhoneValue } from "@/components/shared/phone-value";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { parseApiFormError } from "@/lib/api-form-error";
import {
  blockGroup,
  deleteGroup,
  replaceGroupShops,
  resetGroupPassword,
  unassignGroupShop,
  unblockGroup,
  updateGroupProfile,
} from "@/lib/api/groups";
import { appToast } from "@/lib/app-toast";
import {
  groupDetailQuery,
  groupKeys,
  groupsListQuery,
} from "@/lib/queries/groups";
import { cn } from "@/lib/utils";
import { toE164Phone } from "@yaadro/phone-kit";
import type {
  GroupDetail,
  GroupShopItem,
  UnassignedShopItem,
} from "@/types/api";

function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function apiCode(err: unknown): string | null {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== "object") {
    return null;
  }
  const code = (err.body as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
}

function profileStatus(
  status: string | undefined,
): "active" | "inactive" | "suspended" {
  if (status === "inactive" || status === "suspended") return status;
  return "active";
}

const assignedColumns: ColumnDef<GroupShopItem>[] = [
  {
    accessorKey: "shop_name",
    header: "Shop",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.shop_name}</span>
    ),
    meta: { label: "Shop" },
  },
  {
    accessorKey: "shop_id",
    header: "Shop ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.shop_id}</span>
    ),
    meta: { label: "Shop ID" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: { label: "Status" },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => <PhoneValue value={row.original.phone} />,
    meta: { label: "Phone" },
  },
];

function ProfileEditor({
  group,
  onSaved,
}: {
  group: GroupDetail;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(group.name ?? "");
  const [email, setEmail] = useState(group.email ?? "");
  const [phone, setPhone] = useState(group.phone ?? "");
  const [slug, setSlug] = useState(group.slug ?? "");
  const [status, setStatus] = useState<"active" | "inactive" | "suspended">(
    profileStatus(group.status),
  );
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const normalizedPhone = phone ? toE164Phone(phone, "contact") : null;
      if (phone && !normalizedPhone) {
        appToast.error("Enter a valid mobile or landline number.");
        return;
      }
      await updateGroupProfile(group.group_id, {
        name: name.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        phone: normalizedPhone,
        slug: slug.trim() || undefined,
        status,
      });
      await onSaved();
      appToast.success("Group profile updated.");
    } catch (err) {
      appToast.error(parseApiFormError(err, "Update failed").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Profile"
      description="Update group admin profile fields. Status cannot be set to blocked here — use Block."
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
        <Field label="Name" htmlFor="group-name">
          <Input
            id="group-name"
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Slug" htmlFor="group-slug">
          <Input
            id="group-slug"
            maxLength={100}
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 100),
              )
            }
          />
        </Field>
        <Field label="Email" htmlFor="group-email">
          <Input
            id="group-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="group-phone" hint="Mobile or landline">
          <InternationalPhoneInput
            id="group-phone"
            mode="contact"
            value={phone}
            onChange={setPhone}
          />
        </Field>
        <Field label="Status" htmlFor="group-status">
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(
                (value as "active" | "inactive" | "suspended") ?? "active",
              )
            }
          >
            <SelectTrigger id="group-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PasswordResetForm({ groupId }: { groupId: number }) {
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await resetGroupPassword(groupId, password);
      setPassword("");
      appToast.success("Group password reset.");
    } catch (err) {
      const code = apiCode(err);
      if (code === "GROUP_PASSWORD_SAME") {
        appToast.error(
          "New password must be different from the current password.",
        );
      } else {
        appToast.error(parseApiFormError(err, "Password reset failed").message);
      }
    }
  }

  return (
    <Section
      title="Reset password"
      description="Only super admin can reset a group admin password."
    >
      <form
        className="flex max-w-md flex-col gap-4 sm:flex-row sm:items-end"
        onSubmit={(e) => void onSubmit(e)}
      >
        <Field label="New password" htmlFor="group-password" className="flex-1">
          <Input
            id="group-password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Button type="submit" variant="outline" className="shrink-0">
          <KeyRoundIcon className="size-4" />
          Reset password
        </Button>
      </form>
    </Section>
  );
}

function ShopAssigner({
  group,
  unassignedShops,
  onSaved,
}: {
  group: GroupDetail;
  unassignedShops: UnassignedShopItem[];
  onSaved: () => Promise<void>;
}) {
  const router = useRouter();
  const [shopFilter, setShopFilter] = useState("");
  const [selectedShopIds, setSelectedShopIds] = useState(() =>
    group.shops.map((s) => s.shop_id),
  );
  const [savingShops, setSavingShops] = useState(false);

  const pickerShops = useMemo(() => {
    const map = new Map<string, UnassignedShopItem | GroupShopItem>();
    for (const shop of unassignedShops) {
      map.set(shop.shop_id, shop);
    }
    for (const shop of group.shops) {
      map.set(shop.shop_id, shop);
    }
    const q = shopFilter.trim().toLowerCase();
    return [...map.values()]
      .filter((shop) => {
        if (!q) return true;
        return (
          shop.shop_id.toLowerCase().includes(q) ||
          shop.shop_name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.shop_name.localeCompare(b.shop_name));
  }, [group.shops, shopFilter, unassignedShops]);

  function toggleShop(shopId: string) {
    setSelectedShopIds((prev) =>
      prev.includes(shopId)
        ? prev.filter((id) => id !== shopId)
        : [...prev, shopId],
    );
  }

  async function saveShops() {
    setSavingShops(true);
    try {
      await replaceGroupShops(group.group_id, selectedShopIds);
      await onSaved();
      appToast.success(
        selectedShopIds.length === 0
          ? "All shops unassigned. Group admin cannot log in until shops are assigned."
          : `Assigned ${selectedShopIds.length} shop(s).`,
      );
    } catch (err) {
      const code = apiCode(err);
      if (code === "SHOP_ALREADY_IN_GROUP") {
        appToast.error(
          "One or more shops already belong to another group. Remove them from that group first.",
        );
      } else {
        appToast.error(
          parseApiFormError(err, "Could not update shops").message,
        );
      }
    } finally {
      setSavingShops(false);
    }
  }

  async function removeShop(shopId: string) {
    try {
      await unassignGroupShop(group.group_id, shopId);
      setSelectedShopIds((prev) => prev.filter((id) => id !== shopId));
      await onSaved();
      appToast.success(`Unassigned ${shopId}.`);
    } catch (err) {
      appToast.error(parseApiFormError(err, "Unassign failed").message);
    }
  }

  const assignedColumnsWithActions: ColumnDef<GroupShopItem>[] = [
    ...assignedColumns,
    {
      id: "actions",
      header: "",
      meta: { label: "Actions" },
      size: 100,
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            void removeShop(row.original.shop_id);
          }}
        >
          <XIcon className="size-3.5" />
          Unassign
        </Button>
      ),
    },
  ];

  return (
    <>
      <Section
        title="Assigned shops"
        description="Assignment is a full replace. Saving the picker overwrites the complete shop list for this group."
      >
        {group.shops.length === 0 ? (
          <EmptyState
            title="No shops assigned"
            description="Group admin cannot log in until at least one shop is assigned."
          />
        ) : (
          <DataTable
            columns={assignedColumnsWithActions}
            data={group.shops}
            hideSearch
            emptyMessage="No shops assigned."
            getRowId={(row) => row.shop_id}
            onRowClick={(shop) => router.push(`/shops/${shop.shop_id}`)}
          />
        )}
      </Section>

      <Section
        title="Assign shops"
        description="Select unassigned shops plus shops already on this group, then save. Shops on another group cannot be selected here."
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            className="max-w-sm"
            placeholder="Filter shops…"
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {selectedShopIds.length} selected
          </p>
          <Button
            className="sm:ml-auto"
            disabled={savingShops}
            onClick={() => void saveShops()}
          >
            {savingShops ? "Saving…" : "Save shop assignment"}
          </Button>
        </div>

        {pickerShops.length === 0 ? (
          <EmptyState
            title="No shops available"
            description="All shops may already belong to other groups, or none exist yet."
          />
        ) : (
          <ul className="max-h-80 divide-y overflow-auto rounded-xl border">
            {pickerShops.map((shop) => {
              const checked = selectedShopIds.includes(shop.shop_id);
              return (
                <li key={shop.shop_id}>
                  <button
                    type="button"
                    onClick={() => toggleShop(shop.shop_id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      checked && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    >
                      {checked ? <CheckIcon className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {shop.shop_name}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {shop.shop_id}
                      </span>
                    </span>
                    <StatusBadge status={shop.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const detailQuery = useQuery(groupDetailQuery(groupId));
  const unassignedQuery = useQuery(
    groupsListQuery({
      page: 1,
      page_size: 1,
      include_unassigned_shops: true,
    }),
  );

  const group = detailQuery.data;
  const unassignedShops = useMemo(
    () => unassignedQuery.data?.unassigned_shops ?? [],
    [unassignedQuery.data?.unassigned_shops],
  );

  const [confirmAction, setConfirmAction] = useState<
    null | "block" | "unblock" | "delete"
  >(null);
  const [confirmPhase, setConfirmPhase] = useState<ShopConfirmPhase>("confirm");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  async function invalidateGroup() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
    ]);
  }

  function openConfirm(action: "block" | "unblock" | "delete") {
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

  async function runConfirm() {
    if (!confirmAction) return;
    if (confirmAction === "block" && blockReason.trim().length < 5) {
      setConfirmError("Block reason must be at least 5 characters.");
      setConfirmPhase("error");
      return;
    }

    setConfirmPhase("loading");
    setConfirmError(null);
    try {
      if (confirmAction === "block") {
        await blockGroup(groupId, blockReason);
      } else if (confirmAction === "unblock") {
        await unblockGroup(groupId);
      } else if (confirmAction === "delete") {
        await deleteGroup(groupId);
      }
      if (confirmAction !== "delete") {
        await invalidateGroup();
      } else {
        await queryClient.invalidateQueries({ queryKey: groupKeys.all });
      }
      setConfirmPhase("success");
      const messages = {
        block: "Group blocked. Sessions revoked.",
        unblock: "Group unblocked.",
        delete:
          "Group soft-deleted. Shops unassigned. Restore from the Groups list if needed.",
      } as const;
      appToast.success(messages[confirmAction]);
      window.setTimeout(() => {
        setConfirmAction(null);
        setConfirmPhase("confirm");
        setConfirmError(null);
        setBlockReason("");
        if (confirmAction === "delete") {
          router.push("/groups");
        }
      }, 900);
    } catch (err) {
      const message = parseApiFormError(err, "Action failed").message;
      setConfirmError(message);
      setConfirmPhase("error");
      appToast.error(message);
    }
  }

  if (detailQuery.isPending) {
    return (
      <PageShell>
        <LoadingState label="Loading group…" />
      </PageShell>
    );
  }

  if (detailQuery.error || !group) {
    return (
      <PageShell>
        <TopBarSlot>
          <Button size="sm" variant="ghost" render={<Link href="/groups" />}>
            <ArrowLeftIcon className="size-4" />
            Groups
          </Button>
        </TopBarSlot>
        <ErrorState
          message={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "Group not found"
          }
          onRetry={() => void detailQuery.refetch()}
        />
      </PageShell>
    );
  }

  const confirmCopy = {
    block: {
      title: "Block this group admin?",
      description:
        "Blocks the account and immediately revokes all refresh tokens.",
      confirmLabel: "Block group",
      icon: BanIcon,
      variant: "destructive" as const,
    },
    unblock: {
      title: "Unblock this group admin?",
      description: "Clears the block and sets status back to active.",
      confirmLabel: "Unblock group",
      icon: CheckIcon,
      variant: "default" as const,
    },
    delete: {
      title: "Soft-delete this group?",
      description:
        "Marks the group deleted, clears group_id on all assigned shops, and revokes tokens. Restore from the Groups list with this group ID — shops are not reattached.",
      confirmLabel: "Delete group",
      icon: Trash2Icon,
      variant: "destructive" as const,
    },
  }[confirmAction ?? "block"];

  const editorKey = `${group.group_id}:${group.updated_at ?? group.created_at}:${group.shops_count}`;

  return (
    <PageShell className="space-y-6">
      <TopBarSlot>
        <Button size="sm" variant="ghost" render={<Link href="/groups" />}>
          <ArrowLeftIcon className="size-4" />
          Groups
        </Button>
      </TopBarSlot>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {group.name}
            </h1>
            <StatusBadge status={group.status} />
            {group.is_blocked ? <StatusBadge status="blocked" /> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              User ID{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {group.user_id}
              </code>
              <CopyButton
                value={String(group.user_id)}
                iconOnly
                size={13}
                label="Copy user id"
                className="size-6 p-0"
              />
            </span>
            <span>{group.shops_count} shops</span>
            <span>Last login {formatDate(group.last_login_at)}</span>
          </div>
          {group.block_reason ? (
            <p className="mt-2 text-sm text-destructive">
              Block reason: {group.block_reason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {group.is_blocked ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openConfirm("unblock")}
            >
              <CheckIcon className="size-4" />
              Unblock
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBlockReason("");
                setBlockFormOpen(true);
              }}
            >
              <BanIcon className="size-4" />
              Block
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => openConfirm("delete")}
          >
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <ProfileEditor
        key={`profile-${editorKey}`}
        group={group}
        onSaved={invalidateGroup}
      />
      <PasswordResetForm groupId={group.group_id} />
      <ShopAssigner
        key={`shops-${editorKey}`}
        group={group}
        unassignedShops={unassignedShops}
        onSaved={invalidateGroup}
      />

      {blockFormOpen ? (
        <Section
          title="Block group admin"
          description="Provide a reason (min 5 characters). This revokes all sessions."
        >
          <div className="space-y-4">
            <Textarea
              rows={3}
              minLength={5}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Why is this group being blocked?"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBlockFormOpen(false);
                  setBlockReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={blockReason.trim().length < 5}
                onClick={() => {
                  setBlockFormOpen(false);
                  openConfirm("block");
                }}
              >
                Continue to block
              </Button>
            </div>
          </div>
        </Section>
      ) : null}

      <ShopConfirmDialog
        open={confirmAction != null}
        phase={confirmPhase}
        title={confirmCopy.title}
        description={
          confirmAction === "block"
            ? `${confirmCopy.description} Reason: ${blockReason.trim()}`
            : confirmCopy.description
        }
        confirmLabel={confirmCopy.confirmLabel}
        confirmVariant={confirmCopy.variant}
        icon={confirmCopy.icon}
        iconClassName={
          confirmCopy.variant === "destructive"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
        }
        shopName={group.name}
        shopId={`user ${group.user_id}`}
        loadingTitle="Working…"
        successTitle="Done"
        errorTitle="Action failed"
        errorMessage={confirmError}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
        onConfirm={() => void runConfirm()}
        onSuccessAction={closeConfirm}
        onRetry={() => void runConfirm()}
      />
    </PageShell>
  );
}
