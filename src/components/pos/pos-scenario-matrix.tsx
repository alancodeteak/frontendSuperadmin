"use client";

import { Badge } from "@/components/ui/badge";
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
  defaultOpen = true,
}: {
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted/30 text-sm shadow-sm",
        className,
      )}
    >
      <summary className="cursor-pointer list-none px-4 py-3 font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            Scenarios
          </span>
          <span>When can I configure in the UI vs when do we need code?</span>
          <span className="text-xs font-normal text-muted-foreground">
            (click to collapse)
          </span>
        </span>
      </summary>

      <div className="border-t px-4 py-3">
        <p className="mb-3 max-w-3xl leading-relaxed text-muted-foreground">
          Use this before inventing a new template.{" "}
          <strong className="font-medium text-foreground">UI only</strong> means
          Super Admin is enough.{" "}
          <strong className="font-medium text-foreground">Needs developer</strong>{" "}
          means open a backend ticket — do not fake it with a generic template.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Situation</th>
                <th className="py-2 pr-3 font-medium">Can do in Super Admin?</th>
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
                  <td className="py-2.5 pr-3 leading-relaxed">{row.scenario}</td>
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
      </div>
    </details>
  );
}
