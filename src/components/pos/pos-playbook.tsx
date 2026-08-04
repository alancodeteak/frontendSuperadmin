"use client";

import { useState } from "react";
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  defaultOpen = false,
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
  const [open, setOpen] = useState(defaultOpen);
  const resolvedTitle = playbook?.title ?? title ?? "Playbook";
  const resolvedDescription = playbook?.description ?? description;
  const resolvedSteps = playbook?.steps ?? steps ?? [];
  const resolvedFields = playbook?.fields ?? fields ?? [];

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/35 bg-amber-500/5 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex items-start gap-2.5">
          <BookOpenIcon
            className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Guide
            </p>
            <p className="font-semibold tracking-tight">{resolvedTitle}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-500/40 bg-background/70"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? (
            <>
              <ChevronUpIcon className="size-3.5" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDownIcon className="size-3.5" />
              Open guide
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-amber-500/20 px-4 py-4">
          {resolvedDescription ? (
            <p className="max-w-3xl leading-relaxed text-muted-foreground">
              {resolvedDescription}
            </p>
          ) : null}

          {callout ? (
            <div className="rounded-lg border border-amber-500/25 bg-background/60 px-3 py-2 text-sm">
              {callout}
            </div>
          ) : null}

          {resolvedSteps.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Steps
              </p>
              <ol className="list-decimal space-y-2.5 pl-5">
                {resolvedSteps.map((step) => (
                  <li key={step.title} className="leading-relaxed">
                    <span className="font-medium">{step.title}</span>
                    {step.detail ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {step.detail}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {resolvedFields.length > 0 ? (
            <div>
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

          <div className="flex justify-end border-t border-amber-500/15 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              <ChevronUpIcon className="size-3.5" />
              Collapse
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
