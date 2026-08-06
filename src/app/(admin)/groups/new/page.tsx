"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseApiFormError } from "@/lib/api-form-error";
import { createGroup } from "@/lib/api/groups";
import { appToast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const group = await createGroup({
        name: name.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        slug: (slugTouched ? slug : slugify(name)).trim() || undefined,
      });
      appToast.success(`Group “${group.name}” created (user ${group.user_id}).`);
      router.push(`/groups/${group.group_id}`);
    } catch (err) {
      const parsed = parseApiFormError(err, "Could not create group");
      setError(parsed.message);
      setFieldErrors(parsed.fields);
      appToast.error(parsed.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell className="max-w-2xl">
      <TopBarSlot>
        <Button
          size="sm"
          variant="ghost"
          render={<Link href="/groups" />}
        >
          <ArrowLeftIcon className="size-4" />
          Groups
        </Button>
      </TopBarSlot>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create group</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates a group admin account. Assign shops on the next screen. Login{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">user_id</code>{" "}
          is allocated automatically (200000–299999).
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm"
      >
        <Field
          label="Name"
          htmlFor="name"
          error={fieldErrors.name}
          hint="2–200 characters"
        >
          <Input
            id="name"
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!slugTouched) setSlug(slugify(next));
            }}
            placeholder="Madeena Group"
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={fieldErrors.password}
          hint="8–128 characters"
        >
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          error={fieldErrors.email}
          hint="Optional"
        >
          <Input
            id="email"
            type="email"
            maxLength={100}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ops@madeena.example"
          />
        </Field>

        <Field
          label="Phone"
          htmlFor="phone"
          error={fieldErrors.phone}
          hint="Optional · 9–15 digits"
        >
          <Input
            id="phone"
            inputMode="numeric"
            pattern="[0-9]{9,15}"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
            placeholder="501234567"
          />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          error={fieldErrors.slug}
          hint="Optional · URL-safe lowercase; auto from name if left alone"
        >
          <Input
            id="slug"
            maxLength={100}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 100),
              );
            }}
            placeholder="madeena-group"
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

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            render={<Link href="/groups" />}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create group"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
