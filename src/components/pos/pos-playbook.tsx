"use client";

import type {
  PosPlaybookDef,
  PosPlaybookField,
  PosPlaybookStep,
} from "@/lib/pos/playbook-copy";
import { cn } from "@/lib/utils";

export function PosPlaybook({
  playbook,
  title,
  description,
  steps,
  fields,
  callout,
  defaultOpen = true,
  className,
}: {
  playbook?: PosPlaybookDef;
  title?: string;
  description?: string;
  steps?: PosPlaybookStep[];
  fields?: PosPlaybookField[];
  callout?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const resolvedTitle = playbook?.title ?? title ?? "Playbook";
  const resolvedDescription = playbook?.description ?? description;
  const resolvedSteps = playbook?.steps ?? steps ?? [];
  const resolvedFields = playbook?.fields ?? fields ?? [];

  return (
    <details
      open={defaultOpen}
      className={cn(
        "rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-sm shadow-sm",
        className,
      )}
    >
      <summary className="cursor-pointer list-none font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Guide
          </span>
          <span>{resolvedTitle}</span>
          <span className="text-xs font-normal text-muted-foreground">
            (click to collapse)
          </span>
        </span>
      </summary>

      {resolvedDescription ? (
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          {resolvedDescription}
        </p>
      ) : null}

      {callout ? (
        <div className="mt-3 rounded-lg border border-amber-500/25 bg-background/60 px-3 py-2 text-sm">
          {callout}
        </div>
      ) : null}

      {resolvedSteps.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Steps
          </p>
          <ol className="list-decimal space-y-2.5 pl-5">
            {resolvedSteps.map((step) => (
              <li key={step.title} className="leading-relaxed">
                <span className="font-medium">{step.title}</span>
                {step.detail ? (
                  <span className="text-muted-foreground"> — {step.detail}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {resolvedFields.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What each field means
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            {resolvedFields.map((field) => (
              <div
                key={field.name}
                className="rounded-lg border border-border/70 bg-background/50 px-3 py-2"
              >
                <dt className="font-medium">{field.name}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {field.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </details>
  );
}
