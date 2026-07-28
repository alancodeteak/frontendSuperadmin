"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CopyIcon,
  FlaskConicalIcon,
  GitBranchIcon,
  PlugZapIcon,
  PowerIcon,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { CopyButton } from "@/components/shared/copy-button";
import {
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
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
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  clonePosTemplate,
  deletePosTemplate,
  patchPosTemplate,
  testConnectionPosTemplate,
  testMapPosTemplate,
} from "@/lib/api/pos";
import { posKeys, posTemplateQuery } from "@/lib/queries/pos";

type EndpointKey =
  | "menu"
  | "menuCategories"
  | "menuProducts"
  | "orderCreate"
  | "orderStatus"
  | "riderSync";

const endpointKeys: EndpointKey[] = [
  "menu",
  "menuCategories",
  "menuProducts",
  "orderCreate",
  "orderStatus",
  "riderSync",
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
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
    <section className="max-w-4xl">
      <div className="mb-5 border-b pb-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function PosTemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const id = params.templateId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [configText, setConfigText] = useState("{}");
  const [message, setMessage] = useState<string | null>(null);
  const [endpointKey, setEndpointKey] = useState<EndpointKey>("menu");
  const [form, setForm] = useState({
    version: "",
    description: "",
    is_active: true,
  });

  const templateQuery = useQuery(posTemplateQuery(id));
  const template = templateQuery.data ?? null;
  const loading = templateQuery.isPending;
  const error = templateQuery.error
    ? templateQuery.error instanceof Error
      ? templateQuery.error.message
      : "Failed to load template"
    : null;
  const load = () => void templateQuery.refetch();

  useEffect(() => {
    if (!template) return;
    setForm({
      version: template.version ?? "",
      description: String(template.description ?? ""),
      is_active: Boolean(template.is_active ?? true),
    });
    setConfigText(JSON.stringify(template.config ?? {}, null, 2));
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(configText) as Record<string, unknown>;
      } catch {
        throw new ApiError(400, "Config must be valid JSON");
      }
      return patchPosTemplate(id, {
        description: form.description.trim() || undefined,
        is_active: form.is_active,
        version: form.version.trim() || undefined,
        config,
      });
    },
    onSuccess: async () => {
      appToast.success("Template saved.");
      await queryClient.invalidateQueries({ queryKey: posKeys.template(id) });
      await queryClient.invalidateQueries({ queryKey: ["pos", "templates"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setMessage(msg);
      appToast.error(msg);
    },
  });

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    saveMutation.mutate();
  }

  async function onClone() {
    setMessage(null);
    try {
      const cloned = await clonePosTemplate(id);
      await queryClient.invalidateQueries({ queryKey: ["pos"] });
      appToast.success("Template cloned.");
      router.push(`/pos/${cloned.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Clone failed";
      setMessage(msg);
      appToast.error(msg);
    }
  }

  async function onTestMap() {
    setMessage(null);
    try {
      const res = await testMapPosTemplate(id, {
        mapping_section: "order_inbound",
        sample_payload: { id: "POS-1001", status: "NEW" },
      });
      setMessage(`Test map: ${JSON.stringify(res, null, 2)}`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Test map failed");
    }
  }

  async function onTestConnection() {
    setMessage(null);
    try {
      const res = await testConnectionPosTemplate(id, {
        endpoint_key: endpointKey,
      });
      setMessage(`Test connection: ${JSON.stringify(res, null, 2)}`);
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Test connection failed",
      );
    }
  }

  async function onDeactivate() {
    if (!confirm("Deactivate this template?")) return;
    setMessage(null);
    try {
      await deletePosTemplate(id);
      await queryClient.invalidateQueries({ queryKey: ["pos"] });
      appToast.success("Template deactivated.");
      router.push("/pos");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setMessage(msg);
      appToast.error(msg);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !template) {
    return (
      <PageShell>
        <ErrorState
          message={error ?? "Not found"}
          onRetry={() => void load()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBarSlot>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/pos" />}
        >
          <ArrowLeftIcon className="size-3.5" />
          POS
        </Button>
        <StatusBadge status={template.is_active ? "active" : "inactive"} />
        <span className="hidden truncate text-sm font-medium sm:inline">
          {template.name}
        </span>
      </TopBarSlot>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {template.name}
            </h1>
            <CopyButton
              value={String(template.name ?? "")}
              iconOnly
              size={14}
              label="Copy template name"
              className="size-7 p-0"
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.provider ?? "—"} · {template.connector_type ?? "—"}
            {template.version ? ` · v${template.version}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void onClone()}>
            <CopyIcon className="size-3.5" />
            Clone
          </Button>
          <Button variant="outline" size="sm" onClick={() => void onTestMap()}>
            <FlaskConicalIcon className="size-3.5" />
            Test map
          </Button>
          <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1">
            <Select
              value={endpointKey}
              onValueChange={(value) => {
                if (value) setEndpointKey(value as EndpointKey);
              }}
            >
              <SelectTrigger className="h-7 w-36 border-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {endpointKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => void onTestConnection()}
            >
              <PlugZapIcon className="size-3.5" />
              Test
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void onDeactivate()}
          >
            <PowerIcon className="size-3.5" />
            Deactivate
          </Button>
        </div>
      </div>

      {message ? (
        <pre className="mb-6 max-h-48 overflow-auto rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
          {message}
        </pre>
      ) : null}

      <form onSubmit={onSave} className="space-y-12">
        <Section
          title="Template details"
          description="Identity fields are fixed. Version and description can be updated."
        >
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Name" hint="Immutable template key">
              <Input value={template.name ?? ""} disabled readOnly />
            </Field>
            <Field label="Provider">
              <Input value={template.provider ?? ""} disabled readOnly />
            </Field>
            <Field label="Version">
              <Input
                value={form.version}
                onChange={(e) =>
                  setForm({ ...form, version: e.target.value })
                }
              />
            </Field>
            <Field label="Connector type">
              <Input
                value={template.connector_type ?? ""}
                disabled
                readOnly
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea
                  className="min-h-24"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>

          <label className="mt-6 flex max-w-md cursor-pointer items-start gap-3 border-t pt-5">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            <span>
              <span className="block text-sm font-medium">Active</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Inactive templates cannot be attached to new shops.
              </span>
            </span>
          </label>
        </Section>

        <Section
          title="Config"
          description="Raw connector JSON. Keep it valid — save will reject broken syntax."
        >
          <div className="overflow-hidden rounded-2xl border bg-slate-950 text-slate-100 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <GitBranchIcon className="size-3.5" />
                <span>config.json</span>
              </div>
              <CopyButton
                value={configText}
                iconOnly
                size={13}
                label="Copy config JSON"
                className="size-7 border-white/15 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
              />
            </div>
            <Textarea
              className="min-h-80 resize-y rounded-none border-0 bg-transparent px-4 py-4 font-mono text-xs leading-relaxed text-slate-100 shadow-none focus-visible:ring-0"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              spellCheck={false}
            />
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t pt-6">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save template"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Only description, version, active flag, and config are sent to the
            API.
          </p>
        </div>
      </form>
    </PageShell>
  );
}
