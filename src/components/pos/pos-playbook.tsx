"use client";

import type { PosPlaybookDef, PosPlaybookStep } from "@/lib/pos/playbook-copy";
import { cn } from "@/lib/utils";

export function PosPlaybook({
  playbook,
  title,
  description,
  steps,
  callout,
  defaultOpen = true,
  className,
}: {
  playbook?: PosPlaybookDef;
  title?: string;
  description?: string;
  steps?: PosPlaybookStep[];
  callout?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const resolvedTitle = playbook?.title ?? title ?? "Playbook";
  const resolvedDescription = playbook?.description ?? description;
  const resolvedSteps = playbook?.steps ?? steps ?? [];

  return (
    <details
      open={defaultOpen}
      className={cn(
        "rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm",
        className,
      )}
    >
      <summary className="cursor-pointer list-none font-medium tracking-tight [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          Playbook — {resolvedTitle}
          <span className="text-xs font-normal text-muted-foreground">
            (click to expand/collapse)
          </span>
        </span>
      </summary>
      {resolvedDescription ? (
        <p className="mt-2 text-muted-foreground">{resolvedDescription}</p>
      ) : null}
      {callout ? <div className="mt-3">{callout}</div> : null}
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        {resolvedSteps.map((step) => (
          <li key={step.title}>
            <span className="font-medium">{step.title}</span>
            {step.detail ? (
              <span className="text-muted-foreground"> — {step.detail}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}
