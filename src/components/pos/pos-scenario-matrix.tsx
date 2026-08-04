"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ListChecksIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  POS_SCENARIO_MATRIX,
  type PosPlaybookSeverity,
} from "@/lib/pos/playbook-copy";
import { cn } from "@/lib/utils";

function severityBadge(severity: PosPlaybookSeverity) {
  if (severity === "config_only") {
    return (
      <Badge variant="secondary" className="font-normal">
        UI only
      </Badge>
    );
  }
  if (severity === "partial") {
    return (
      <Badge variant="outline" className="font-normal">
        UI + maybe code
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="font-normal">
      Needs developer
    </Badge>
  );
}

export function PosScenarioMatrix({
  className,
  defaultOpen = false,
}: {
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted/30 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex items-start gap-2.5">
          <ListChecksIcon
            className="mt-0.5 size-4 shrink-0 text-slate-600 dark:text-slate-300"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Scenarios
            </p>
            <p className="font-semibold tracking-tight">
              When can I configure in the UI vs when do we need code?
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 bg-background/70"
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
              Open scenarios
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div className="space-y-3 border-t px-4 py-4">
          <p className="max-w-3xl leading-relaxed text-muted-foreground">
            Fresh users: match your situation in the left column.{" "}
            <strong className="font-medium text-foreground">UI only</strong> =
            follow the Beginner guide Examples page and fill those values
            yourself.{" "}
            <strong className="font-medium text-foreground">
              Needs developer
            </strong>{" "}
            = stop — open an engineering ticket with vendor docs. Do not invent
            a fake generic template.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Situation</th>
                  <th className="py-2 pr-3 font-medium">
                    Can do in Super Admin?
                  </th>
                  <th className="py-2 pr-3 font-medium">Need a developer?</th>
                  <th className="py-2 font-medium">Badge</th>
                </tr>
              </thead>
              <tbody>
                {POS_SCENARIO_MATRIX.map((row) => (
                  <tr
                    key={row.scenario}
                    className="border-b border-border/60 align-top"
                  >
                    <td className="py-2.5 pr-3 leading-relaxed">
                      {row.scenario}
                    </td>
                    <td className="py-2.5 pr-3 leading-relaxed text-muted-foreground">
                      {row.configOnly}
                    </td>
                    <td className="py-2.5 pr-3 leading-relaxed text-muted-foreground">
                      {row.needsCode}
                    </td>
                    <td className="py-2.5">{severityBadge(row.severity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t pt-3">
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
